// inspector_name/inspector_contact는 저장 시 등록 명부 값으로 대체되므로
// 검증하지 않는다(registeredInspectors.js 조회 결과가 진짜 기준) — inspector_id
// (선택된 검사자 사번)만 있으면 된다.
const TV_INFO_FIELD_LABELS = {
  model_name: "모델명",
  tv_serial_number: "시리얼번호",
  inspector_id: "검사자",
};

const REQUIRED_SCREENS = ["White", "Red", "Green", "Blue", "Black"];

function validateTvInfo(payload) {
  const errors = [];

  for (const [field, label] of Object.entries(TV_INFO_FIELD_LABELS)) {
    const value = payload[field];
    if (typeof value !== "string" || value.trim() === "") {
      errors.push(`${label} 값이 비어 있습니다.`);
    }
  }

  return errors;
}

function validateScreenEntryDetails(entry) {
  const errors = [];

  if (entry.result !== "OK" && entry.result !== "NG") {
    errors.push(`${entry.screen} 화면의 판정(OK/NG)이 없습니다.`);
    return errors;
  }

  if (entry.result === "NG") {
    if (typeof entry.note !== "string" || entry.note.trim() === "") {
      errors.push(`${entry.screen} 화면은 NG인데 조치 메모가 없습니다.`);
    }
    if (!Array.isArray(entry.defect_types) || entry.defect_types.length === 0) {
      errors.push(`${entry.screen} 화면은 NG인데 불량 항목이 선택되지 않았습니다.`);
    }
  }

  return errors;
}

function validateScreens(screens) {
  if (!Array.isArray(screens)) {
    return ["화면 판정 데이터가 올바르지 않습니다."];
  }

  const errors = [];
  const seen = new Set();

  for (const entry of screens) {
    if (!REQUIRED_SCREENS.includes(entry?.screen)) {
      errors.push(
        entry?.screen == null
          ? "화면 판정 항목의 형식이 올바르지 않습니다."
          : `알 수 없는 화면입니다: ${entry.screen}`,
      );
      continue;
    }
    if (seen.has(entry.screen)) {
      errors.push(`${entry.screen} 화면 판정이 중복되었습니다.`);
      continue;
    }
    seen.add(entry.screen);

    errors.push(...validateScreenEntryDetails(entry));
  }

  for (const screen of REQUIRED_SCREENS) {
    if (!seen.has(screen)) {
      errors.push(`${screen} 화면 판정이 없습니다.`);
    }
  }

  return errors;
}

function validateInspectionPayload(payload) {
  return [...validateTvInfo(payload), ...validateScreens(payload.screens)];
}

const REGISTERED_INSPECTOR_FIELD_LABELS = {
  name: "이름",
  employee_id: "사번",
  contact: "연락처",
};

function validateRegisteredInspectorPayload(payload) {
  const errors = [];

  for (const [field, label] of Object.entries(REGISTERED_INSPECTOR_FIELD_LABELS)) {
    const value = payload?.[field];
    if (typeof value !== "string" || value.trim() === "") {
      errors.push(`${label} 값이 비어 있습니다.`);
    }
  }

  return errors;
}

module.exports = { validateInspectionPayload, validateRegisteredInspectorPayload };
