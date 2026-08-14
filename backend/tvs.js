const db = require("./db.js");

const listTvsStmt = db.prepare(`
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
  SELECT
    t.serial_number,
    t.model_name,
    r.inspected_at AS last_inspected_at,
    r.overall_result AS last_result,
    r.inspector_name AS last_inspector_name,
    r.inspection_count
  FROM tv t
  JOIN ranked_inspections r ON r.tv_serial_number = t.serial_number AND r.rank = 1
  ORDER BY t.serial_number
`);

function listTvs() {
  return listTvsStmt.all();
}

module.exports = { listTvs };
