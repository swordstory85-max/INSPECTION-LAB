const ExcelJS = require("exceljs");
const db = require("./db.js");
const { resolveCurrentNote } = require("./noteHistory.js");

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const EXPORT_COLUMNS = [
  { header: "모델명", key: "model_name", width: 16 },
  { header: "시리얼번호", key: "tv_serial_number", width: 16 },
  { header: "검사일시", key: "inspected_at", width: 20 },
  { header: "검사자 이름", key: "inspector_name", width: 12 },
  { header: "검사자 사번", key: "inspector_id", width: 12 },
  { header: "검사자 연락처", key: "inspector_contact", width: 16 },
  { header: "전체 결과", key: "overall_result", width: 10 },
  { header: "화면", key: "screen", width: 10 },
  { header: "화면 판정", key: "screen_result", width: 10 },
  { header: "불량 항목", key: "defect_types", width: 24 },
  { header: "조치 메모", key: "note", width: 30 },
];

const monthlyRowsStmt = db.prepare(`
  SELECT
    i.id AS inspection_id,
    i.model_name,
    i.tv_serial_number,
    i.inspected_at,
    i.inspector_name,
    i.inspector_id,
    i.inspector_contact,
    i.overall_result,
    s.screen,
    s.result AS screen_result,
    s.defect_types,
    s.note
  FROM inspection i
  JOIN screen_result s ON s.inspection_id = i.id
  WHERE substr(i.inspected_at, 1, 7) = ?
  ORDER BY i.inspected_at ASC, i.id ASC, s.id ASC
`);

const monthlyCorrectionsStmt = db.prepare(`
  SELECT c.inspection_id, c.screen, c.new_note
  FROM screen_note_correction c
  JOIN inspection i ON i.id = c.inspection_id
  WHERE substr(i.inspected_at, 1, 7) = ?
  ORDER BY c.inspection_id, c.screen, c.id ASC
`);

function isValidMonth(month) {
  return typeof month === "string" && MONTH_PATTERN.test(month);
}

function groupNewNotesByScreenKey(month) {
  const grouped = new Map();
  for (const row of monthlyCorrectionsStmt.all(month)) {
    const key = `${row.inspection_id}:${row.screen}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(row.new_note);
  }
  return grouped;
}

function getMonthlyInspectionRows(month) {
  const correctionsByKey = groupNewNotesByScreenKey(month);

  return monthlyRowsStmt.all(month).map((row) => {
    const key = `${row.inspection_id}:${row.screen}`;
    return {
      ...row,
      defect_types: JSON.parse(String(row.defect_types)),
      note: resolveCurrentNote(row.note, correctionsByKey.get(key) ?? []),
    };
  });
}

async function writeMonthlyWorkbook(res, month) {
  const rows = getMonthlyInspectionRows(month);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(month);
  sheet.columns = EXPORT_COLUMNS;

  for (const row of rows) {
    sheet.addRow({ ...row, defect_types: row.defect_types.join(", ") });
  }

  res.header(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.header(
    "Content-Disposition",
    `attachment; filename="inspections-${month}.xlsx"`,
  );

  await workbook.xlsx.write(res);
  res.end();
}

module.exports = { isValidMonth, getMonthlyInspectionRows, writeMonthlyWorkbook };
