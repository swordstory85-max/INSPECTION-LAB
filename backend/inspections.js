const db = require("./db.js");
const { insertInspector } = require("./inspectors.js");
const { withDbLock } = require("./dbLock.js");

const upsertTvStmt = db.prepare(`
  INSERT INTO tv (serial_number, model_name) VALUES (?, ?)
  ON CONFLICT(serial_number) DO UPDATE SET model_name = excluded.model_name
`);

const insertInspectionStmt = db.prepare(`
  INSERT INTO inspection
    (tv_serial_number, model_name, overall_result)
  VALUES (?, ?, ?)
`);

const insertScreenResultStmt = db.prepare(`
  INSERT INTO screen_result (inspection_id, screen, result, defect_types, note)
  VALUES (?, ?, ?, ?, ?)
`);

function createInspection(payload) {
  return withDbLock(() => createInspectionLocked(payload));
}

async function createInspectionLocked({
  model_name,
  tv_serial_number,
  inspector_name,
  inspector_id,
  inspector_contact,
  screens,
}) {
  const overall_result = screens.some((screen) => screen.result === "NG")
    ? "NG"
    : "OK";

  db.exec("BEGIN");
  try {
    upsertTvStmt.run(tv_serial_number, model_name);

    const { lastInsertRowid: inspectionId } = insertInspectionStmt.run(
      tv_serial_number,
      model_name,
      overall_result,
    );

    for (const screen of screens) {
      insertScreenResultStmt.run(
        inspectionId,
        screen.screen,
        screen.result,
        JSON.stringify(screen.defect_types ?? []),
        screen.note ?? null,
      );
    }

    await insertInspector({
      inspection_id: inspectionId,
      inspector_name,
      inspector_id,
      inspector_contact,
    });

    db.exec("COMMIT");
    return { id: inspectionId, overall_result };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

module.exports = { createInspection };
