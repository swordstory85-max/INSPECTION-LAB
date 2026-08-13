const db = require("./db.js");

const historyRowsStmt = db.prepare(`
  SELECT
    i.id AS inspection_id,
    i.inspected_at,
    i.inspector_name,
    i.inspector_id,
    i.inspector_contact,
    i.model_name,
    i.tv_serial_number,
    i.overall_result,
    s.screen,
    s.result AS screen_result,
    s.defect_types,
    s.note
  FROM inspection i
  LEFT JOIN screen_result s ON s.inspection_id = i.id
  WHERE i.tv_serial_number = ?
  ORDER BY i.inspected_at DESC, i.id DESC, s.id ASC
`);

function getInspectionHistory(serialNumber) {
  const rows = historyRowsStmt.all(serialNumber);

  const inspections = [];
  const byId = new Map();

  for (const row of rows) {
    let inspection = byId.get(row.inspection_id);
    if (!inspection) {
      inspection = {
        id: row.inspection_id,
        inspected_at: row.inspected_at,
        inspector_name: row.inspector_name,
        inspector_id: row.inspector_id,
        inspector_contact: row.inspector_contact,
        model_name: row.model_name,
        tv_serial_number: row.tv_serial_number,
        overall_result: row.overall_result,
        screens: [],
      };
      byId.set(row.inspection_id, inspection);
      inspections.push(inspection);
    }

    if (row.screen !== null) {
      inspection.screens.push({
        screen: row.screen,
        result: row.screen_result,
        defect_types: JSON.parse(String(row.defect_types)),
        note: row.note,
      });
    }
  }

  return inspections;
}

module.exports = { getInspectionHistory };
