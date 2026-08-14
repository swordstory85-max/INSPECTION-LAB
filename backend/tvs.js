const db = require("./db.js");

const RANKED_INSPECTIONS_CTE = `
  WITH ranked_inspections AS (
    SELECT
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

const listTvsStmt = db.prepare(`
  ${RANKED_INSPECTIONS_CTE}
  SELECT
    t.serial_number,
    t.model_name,
    r.inspected_at AS last_inspected_at,
    r.overall_result AS last_result,
    r.inspector_name AS last_inspector_name,
    r.inspection_count
  FROM tv t
  JOIN ranked_inspections r ON r.tv_serial_number = t.serial_number AND r.rank = 1
  LEFT JOIN tv_deletion d ON d.tv_serial_number = t.serial_number
  WHERE d.id IS NULL
  ORDER BY t.serial_number
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
    d.deleted_at
  FROM tv t
  JOIN ranked_inspections r ON r.tv_serial_number = t.serial_number AND r.rank = 1
  JOIN tv_deletion d ON d.tv_serial_number = t.serial_number
  ORDER BY d.deleted_at DESC
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

function listTvs() {
  return listTvsStmt.all();
}

function listDeletedTvs() {
  return listDeletedTvsStmt.all();
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
