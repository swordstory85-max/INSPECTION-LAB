const db = require("./db.js");
const { resolveCurrentNote } = require("./noteHistory.js");

const REQUIRED_SCREENS = ["White", "Red", "Green", "Blue", "Black"];

const getScreenResultStmt = db.prepare(`
  SELECT result, note FROM screen_result WHERE inspection_id = ? AND screen = ?
`);

const getCorrectionNotesAscStmt = db.prepare(`
  SELECT new_note FROM screen_note_correction
  WHERE inspection_id = ? AND screen = ?
  ORDER BY id ASC
`);

const insertCorrectionStmt = db.prepare(`
  INSERT INTO screen_note_correction (inspection_id, screen, previous_note, new_note)
  VALUES (?, ?, ?, ?)
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

function getCurrentNote(inspectionId, screen, originalNote) {
  const corrections = getCorrectionNotesAscStmt.all(inspectionId, screen);
  return resolveCurrentNote(
    originalNote,
    corrections.map((row) => row.new_note),
  );
}

function validateCorrectionPayload(inspectionId, screen, newNote) {
  const errors = [];

  if (!Number.isInteger(inspectionId)) {
    errors.push("잘못된 검사 ID입니다.");
  }

  if (!REQUIRED_SCREENS.includes(screen)) {
    errors.push(
      screen == null ? "화면 값이 없습니다." : `알 수 없는 화면입니다: ${screen}`,
    );
  }

  if (typeof newNote !== "string" || newNote.trim() === "") {
    errors.push("새 메모 값이 비어 있습니다.");
  }

  return errors;
}

function addNoteCorrection(inspectionId, screen, newNote) {
  const original = getScreenResultStmt.get(inspectionId, screen);
  if (!original) {
    throw httpError(
      `검사 ID ${inspectionId}에 ${screen} 화면 기록이 없습니다.`,
      404,
    );
  }

  if (original.result !== "NG") {
    throw httpError("OK 화면은 조치 메모를 수정할 수 없습니다.", 400);
  }

  const previousNote = getCurrentNote(inspectionId, screen, original.note);
  insertCorrectionStmt.run(inspectionId, screen, previousNote, newNote);

  return { inspectionId, screen, previousNote, newNote };
}

module.exports = { validateCorrectionPayload, addNoteCorrection };
