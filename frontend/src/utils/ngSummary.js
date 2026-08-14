import { DEFECT_TYPE_OPTIONS } from "../pages/InspectionForm/constants.js";

// 요약 열은 공간이 좁아서 defect_types 원문("픽셀 이상" 등) 대신
// 짧은 대표 단어만 보여준다. DEFECT_TYPE_OPTIONS(constants.js)에서 파생시켜서,
// 새 불량 항목이 추가돼도 축약어를 따로 챙기지 않으면 이 맵도 같이 갱신된다.
// 그래도 맵에 없는 값이 들어오면(예: 옛 데이터) 원문을 그대로 보여줘 누락 없이 동작한다.
const DEFECT_TYPE_SHORT_LABELS = Object.fromEntries(
  DEFECT_TYPE_OPTIONS.map(({ value, shortLabel }) => [value, shortLabel]),
);

function shortenDefectType(defectType) {
  return DEFECT_TYPE_SHORT_LABELS[defectType] ?? defectType;
}

export function formatNgSummary(ngScreens) {
  return ngScreens
    .map(
      ({ screen, defect_types }) =>
        `${screen}: ${defect_types.map(shortenDefectType).join(", ")}`,
    )
    .join(" / ");
}

export function ngSummaryCellText(tv) {
  return tv.last_result === "NG" && tv.ng_screens.length > 0
    ? formatNgSummary(tv.ng_screens)
    : "";
}
