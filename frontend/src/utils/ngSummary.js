export function formatNgSummary(ngScreens) {
  return ngScreens
    .map(({ screen, defect_types }) => `${screen}: ${defect_types.join(", ")}`)
    .join(" / ");
}
