const db = require("./db.js");

const RANKED_INSPECTIONS_CTE = `
  WITH ranked_inspections AS (
    SELECT
      id,
      tv_serial_number,
      inspected_at,
      overall_result,
      inspector_name,
      ROW_NUMBER() OVER (
        PARTITION BY tv_serial_number ORDER BY inspected_at DESC, id DESC
      ) AS rank,
      COUNT(*) OVER (PARTITION BY tv_serial_number) AS inspection_count
    FROM inspection
  )
`;

// 최근 검사(rank=1)에 속한 NG screen_result를 LEFT JOIN으로 같이 가져와서,
// 목록에서 "최근 검사가 왜 NG인지"를 화면별로 요약해 보여줄 수 있게 한다.
// 화면 표시 순서가 저장 순서(sr.id)가 아니라 항상 White→Red→Green→Blue→Black을
// 따르도록 CASE로 명시적으로 정렬한다(다른 클라이언트가 다른 순서로 저장해도 안전).
const NG_SCREEN_JOIN = `LEFT JOIN screen_result sr ON sr.inspection_id = r.id AND sr.result = 'NG'`;
const NG_SCREEN_ORDER = `
  CASE sr.screen
    WHEN 'White' THEN 1
    WHEN 'Red' THEN 2
    WHEN 'Green' THEN 3
    WHEN 'Blue' THEN 4
    WHEN 'Black' THEN 5
  END
`;

const listTvsStmt = db.prepare(`
  ${RANKED_INSPECTIONS_CTE}
  SELECT
    t.serial_number,
    t.model_name,
    r.inspected_at AS last_inspected_at,
    r.overall_result AS last_result,
    r.inspector_name AS last_inspector_name,
    r.inspection_count,
    sr.screen AS ng_screen,
    sr.defect_types AS ng_defect_types
  FROM tv t
  JOIN ranked_inspections r ON r.tv_serial_number = t.serial_number AND r.rank = 1
  LEFT JOIN tv_deletion d ON d.tv_serial_number = t.serial_number
  ${NG_SCREEN_JOIN}
  WHERE d.id IS NULL
  ORDER BY t.serial_number, ${NG_SCREEN_ORDER}
`);

const listDeletedTvsStmt = db.prepare(`
  ${RANKED_INSPECTIONS_CTE}
  SELECT
    t.serial_number,
    t.model_name,
    r.inspected_at AS last_inspected_at,
    r.overall_result AS last_result,
    r.inspector_name AS last_inspector_name,
    r.inspection_count,
    d.deleted_at,
    sr.screen AS ng_screen,
    sr.defect_types AS ng_defect_types
  FROM tv t
  JOIN ranked_inspections r ON r.tv_serial_number = t.serial_number AND r.rank = 1
  JOIN tv_deletion d ON d.tv_serial_number = t.serial_number
  ${NG_SCREEN_JOIN}
  ORDER BY d.deleted_at DESC, ${NG_SCREEN_ORDER}
`);

const getTvStmt = db.prepare(`SELECT serial_number FROM tv WHERE serial_number = ?`);

const insertDeletionIfAbsentStmt = db.prepare(`
  INSERT INTO tv_deletion (tv_serial_number) VALUES (?)
  ON CONFLICT (tv_serial_number) DO NOTHING
`);

/**
 * @param {string} message
 * @param {number} statusCode
 * @returns {Error & { statusCode: number }}
 */
function httpError(message, statusCode) {
  const error = /** @type {Error & { statusCode: number }} */ (new Error(message));
  error.statusCode = statusCode;
  return error;
}

/**
 * listTvsStmt/listDeletedTvsStmt는 TV당 NG 화면 수만큼 행이 늘어나 있다(fan-out
 * LEFT JOIN). serial_number로 다시 묶어 TV 하나당 한 행 + ng_screens 배열로
 * 만드는 순수 함수 — DB 접근이 없어 SQL 결과 배열만 있으면 독립적으로 검증 가능하다.
 */
function groupTvRows(rows) {
  const bySerial = new Map();

  for (const row of rows) {
    let tv = bySerial.get(row.serial_number);
    if (!tv) {
      tv = {
        serial_number: row.serial_number,
        model_name: row.model_name,
        last_inspected_at: row.last_inspected_at,
        last_result: row.last_result,
        last_inspector_name: row.last_inspector_name,
        inspection_count: row.inspection_count,
        ng_screens: [],
      };
      if (row.deleted_at !== undefined) {
        tv.deleted_at = row.deleted_at;
      }
      bySerial.set(row.serial_number, tv);
    }

    if (row.ng_screen !== null) {
      tv.ng_screens.push({
        screen: row.ng_screen,
        defect_types: JSON.parse(row.ng_defect_types),
      });
    }
  }

  return [...bySerial.values()];
}

function listTvs() {
  return groupTvRows(listTvsStmt.all());
}

function listDeletedTvs() {
  return groupTvRows(listDeletedTvsStmt.all());
}

/**
 * TV를 "삭제"한다 — 원본 tv/inspection 행은 절대 건드리지 않는 소프트 삭제다.
 * tv_deletion에 마커 행을 추가해 listTvs()의 기본 목록에서만 제외하며,
 * 원본 기록은 listDeletedTvs()와 이력 조회(getInspectionHistory)로 계속 조회할 수 있다.
 * UNIQUE(tv_serial_number) 제약을 이용한 INSERT ... ON CONFLICT DO NOTHING이라
 * check-then-insert 경쟁 조건 없이 이미 삭제된 상태인지 changes로 판별한다.
 */
function hideTv(serialNumber) {
  if (!getTvStmt.get(serialNumber)) {
    throw httpError(`시리얼번호 ${serialNumber}인 TV가 없습니다.`, 404);
  }

  const result = insertDeletionIfAbsentStmt.run(serialNumber);
  if (result.changes === 0) {
    throw httpError(`시리얼번호 ${serialNumber}는 이미 삭제 처리되었습니다.`, 400);
  }

  return { serial_number: serialNumber };
}

module.exports = { listTvs, listDeletedTvs, hideTv };
