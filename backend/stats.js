const db = require("./db.js");

const SCREENS = ["White", "Red", "Green", "Blue", "Black"];

// tvs.js와 동일하게 LEFT JOIN + WHERE d.id IS NULL로 소프트 삭제된 TV의 검사 기록을 뺀다.
const NOT_DELETED_JOIN = `LEFT JOIN tv_deletion d ON d.tv_serial_number = i.tv_serial_number`;
const NOT_DELETED_WHERE = `d.id IS NULL`;

const overallStmt = db.prepare(`
  SELECT i.overall_result, COUNT(*) AS count
  FROM inspection i
  ${NOT_DELETED_JOIN}
  WHERE ${NOT_DELETED_WHERE}
  GROUP BY i.overall_result
`);

const screenNgStmt = db.prepare(`
  SELECT s.screen, COUNT(*) AS count
  FROM screen_result s
  JOIN inspection i ON i.id = s.inspection_id
  ${NOT_DELETED_JOIN}
  WHERE s.result = 'NG' AND ${NOT_DELETED_WHERE}
  GROUP BY s.screen
`);

const ngDefectTypesStmt = db.prepare(`
  SELECT s.defect_types
  FROM screen_result s
  JOIN inspection i ON i.id = s.inspection_id
  ${NOT_DELETED_JOIN}
  WHERE s.result = 'NG' AND ${NOT_DELETED_WHERE}
`);

const inspectorResultStmt = db.prepare(`
  SELECT i.inspector_name, i.overall_result, COUNT(*) AS count
  FROM inspection i
  ${NOT_DELETED_JOIN}
  WHERE ${NOT_DELETED_WHERE}
  GROUP BY i.inspector_name, i.overall_result
`);

// node:sqlite의 COUNT(*) 결과 타입(SQLOutputValue)은 문자열/bigint 등도 포함해서,
// 그대로 반환만 할 때는 캐스팅이 필요 없지만(tvs.js 참고) 여기서는 OK/NG 건수를
// 더해 total을 계산해야 해서 Number()로 명시적으로 좁혀야 타입체크를 통과한다.
function getOverallStats() {
  const rows = overallStmt.all();
  const ok = Number(rows.find((r) => r.overall_result === "OK")?.count ?? 0);
  const ng = Number(rows.find((r) => r.overall_result === "NG")?.count ?? 0);
  return { total: ok + ng, ok, ng };
}

function getScreenNgCounts() {
  const rows = screenNgStmt.all();
  const countByScreen = new Map(rows.map((r) => [r.screen, r.count]));
  return SCREENS.map((screen) => ({ screen, count: countByScreen.get(screen) ?? 0 }));
}

function getDefectTypeCounts() {
  const rows = ngDefectTypesStmt.all();
  const counts = new Map();
  for (const row of rows) {
    let types;
    try {
      types = JSON.parse(String(row.defect_types));
    } catch {
      continue; // 손상된 행 하나 때문에 통계 전체가 죽지 않도록 건너뛴다.
    }
    for (const type of types) {
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([defect_type, count]) => ({ defect_type, count }))
    .sort((a, b) => b.count - a.count || a.defect_type.localeCompare(b.defect_type, "ko"));
}

function getInspectorStats() {
  const rows = inspectorResultStmt.all();
  const byInspector = new Map();
  for (const row of rows) {
    const entry = byInspector.get(row.inspector_name) ?? {
      inspector_name: row.inspector_name,
      ok: 0,
      ng: 0,
    };
    if (row.overall_result === "OK") {
      entry.ok = Number(row.count);
    } else {
      entry.ng = Number(row.count);
    }
    byInspector.set(row.inspector_name, entry);
  }
  return [...byInspector.values()]
    .map((entry) => ({ ...entry, total: entry.ok + entry.ng }))
    .sort(
      (a, b) =>
        b.total - a.total || a.inspector_name.localeCompare(b.inspector_name, "ko"),
    );
}

function getStats() {
  return {
    overall: getOverallStats(),
    screens: getScreenNgCounts(),
    defectTypes: getDefectTypeCounts(),
    inspectors: getInspectorStats(),
  };
}

module.exports = { getStats };
