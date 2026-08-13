/**
 * 원본 메모와 시간순(오래된 순) 정정 메모 목록으로부터 "현재" 메모를 계산한다.
 * 정정이 있으면 가장 최근 정정값, 없으면 원본값을 그대로 쓴다.
 * @param {*} originalNote
 * @param {Array<*>} correctionNotesAscending
 */
function resolveCurrentNote(originalNote, correctionNotesAscending) {
  if (correctionNotesAscending.length === 0) {
    return originalNote;
  }
  return correctionNotesAscending[correctionNotesAscending.length - 1];
}

module.exports = { resolveCurrentNote };
