export function formatNgSummary(ngScreens) {
  return ngScreens
    .map(({ screen, defect_types }) => `${screen}: ${defect_types.join(", ")}`)
    .join(" / ");
}

export function ngSummaryCellText(tv) {
  return tv.last_result === "NG" && tv.ng_screens.length > 0
    ? formatNgSummary(tv.ng_screens)
    : "";
}
