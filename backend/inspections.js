const db = require("./db.js");
const { insertInspector } = require("./inspectors.js");
const { withDbLock } = require("./dbLock.js");
const { findRegisteredInspectorByEmployeeId } = require("./registeredInspectors.js");
const { httpError } = require("./httpError.js");

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

async function createInspection(payload) {
  const registered = await findRegisteredInspectorByEmployeeId(payload.inspector_id);
  if (!registered) {
    throw httpError(
      `등록되지 않은 검사자입니다(사번: ${payload.inspector_id}). 검사자 등록 후 목록에서 다시 선택해주세요.`,
      400,
    );
  }

  return withDbLock(() => createInspectionLocked(payload, registered));
}

async function createInspectionLocked(
  { model_name, tv_serial_number, screens },
  registered,
) {
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

    // 클라이언트가 보낸 이름/연락처가 아니라 조회 시점의 등록 명부 값을 그대로
    // 저장한다 — "등록된 검사자만 선택 가능"을 서버가 신뢰할 수 있게 강제하기 위함.
    await insertInspector({
      inspection_id: inspectionId,
      inspector_name: registered.name,
      inspector_id: registered.employee_id,
      inspector_contact: registered.contact,
    });

    db.exec("COMMIT");
    return { id: inspectionId, overall_result };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

module.exports = { createInspection };
