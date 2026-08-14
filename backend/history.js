const db = require("./db.js");
const { resolveCurrentNote } = require("./noteHistory.js");
const { getInspectorsByInspectionIds } = require("./inspectors.js");

const historyRowsStmt = db.prepare(`
  SELECT
    i.id AS inspection_id,
    i.inspected_at,
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

const correctionsForTvStmt = db.prepare(`
  SELECT c.inspection_id, c.screen, c.previous_note, c.new_note, c.corrected_at
  FROM screen_note_correction c
  JOIN inspection i ON i.id = c.inspection_id
  WHERE i.tv_serial_number = ?
  ORDER BY c.inspection_id, c.screen, c.id ASC
`);

function groupCorrectionsByInspectionAndScreen(serialNumber) {
  const grouped = new Map();

  for (const row of correctionsForTvStmt.all(serialNumber)) {
    const key = `${row.inspection_id}:${row.screen}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push({
      previous_note: row.previous_note,
      new_note: row.new_note,
      corrected_at: row.corrected_at,
    });
  }

  return grouped;
}

async function getInspectionHistory(serialNumber) {
  const rows = historyRowsStmt.all(serialNumber);
  const correctionsByKey = groupCorrectionsByInspectionAndScreen(serialNumber);
  const inspectorsById = await getInspectorsByInspectionIds([
    ...new Set(rows.map((row) => row.inspection_id)),
  ]);

  const inspections = [];
  const byId = new Map();

  for (const row of rows) {
    let inspection = byId.get(row.inspection_id);
    if (!inspection) {
      const inspector = inspectorsById.get(row.inspection_id) ?? {
        inspector_name: null,
        inspector_id: null,
        inspector_contact: null,
      };
      inspection = {
        id: row.inspection_id,
        inspected_at: row.inspected_at,
        inspector_name: inspector.inspector_name,
        inspector_id: inspector.inspector_id,
        inspector_contact: inspector.inspector_contact,
        model_name: row.model_name,
        tv_serial_number: row.tv_serial_number,
        overall_result: row.overall_result,
        screens: [],
      };
      byId.set(row.inspection_id, inspection);
      inspections.push(inspection);
    }

    if (row.screen !== null) {
      const corrections =
        correctionsByKey.get(`${row.inspection_id}:${row.screen}`) ?? [];
      const currentNote = resolveCurrentNote(
        row.note,
        corrections.map((correction) => correction.new_note),
      );

      inspection.screens.push({
        screen: row.screen,
        result: row.screen_result,
        defect_types: JSON.parse(String(row.defect_types)),
        note: currentNote,
        corrections,
      });
    }
  }

  return inspections;
}

module.exports = { getInspectionHistory };
