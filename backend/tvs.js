const db = require("./db.js");

const listTvsStmt = db.prepare(`
  SELECT
    t.serial_number,
    t.model_name,
    i.inspected_at AS last_inspected_at,
    i.overall_result AS last_result,
    i.inspector_name AS last_inspector_name
  FROM tv t
  JOIN inspection i ON i.id = (
    SELECT id FROM inspection
    WHERE tv_serial_number = t.serial_number
    ORDER BY inspected_at DESC, id DESC
    LIMIT 1
  )
  ORDER BY t.serial_number
`);

function listTvs() {
  return listTvsStmt.all();
}

module.exports = { listTvs };
