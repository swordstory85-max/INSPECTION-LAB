import { ngSummaryCellText } from "../../utils/ngSummary.js";

const COLUMNS = [
  { key: "select", label: "선택", sortable: false },
  { key: "model_name", label: "모델명", sortable: true },
  { key: "serial_number", label: "시리얼번호", sortable: true },
  { key: "last_inspected_at", label: "최근 검사일", sortable: true },
  { key: "last_result", label: "최근 검사 결과", sortable: true },
  { key: "ng_summary", label: "NG 요약", sortable: false },
  { key: "last_inspector_name", label: "검사자", sortable: true },
  { key: "inspection_count", label: "총 검사 건수", sortable: false },
];

function isNgResult(tv) {
  return tv.last_result === "NG";
}

function TvTable({ tvs, sort, onSortClick, selectedSerials, onToggleSelected, onRowClick }) {
  function renderCell(key, tv, isNg) {
    switch (key) {
      case "select":
        return (
          <td key={key} onClick={(event) => event.stopPropagation()}>
            <input
              type="checkbox"
              checked={selectedSerials.has(tv.serial_number)}
              onChange={() => onToggleSelected(tv.serial_number)}
            />
          </td>
        );
      case "last_result":
        return (
          <td key={key}>
            <span className={`badge ${isNg ? "badge-ng" : "badge-ok"}`}>
              {tv.last_result}
            </span>
          </td>
        );
      case "ng_summary":
        return (
          <td key={key} className="ng-summary">
            {ngSummaryCellText(tv)}
          </td>
        );
      case "inspection_count":
        return <td key={key}>{tv.inspection_count}건</td>;
      default:
        return <td key={key}>{tv[key]}</td>;
    }
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {COLUMNS.map(({ key, label, sortable }) => {
              if (!sortable) {
                return (
                  <th key={key} className={key === "ng_summary" ? "ng-summary" : undefined}>
                    {label}
                  </th>
                );
              }

              const isSorted = sort.key === key;
              const ariaSort = isSorted
                ? sort.direction === "asc"
                  ? "ascending"
                  : "descending"
                : "none";

              return (
                <th key={key} aria-sort={ariaSort}>
                  <button
                    type="button"
                    className="sort-header"
                    onClick={() => onSortClick(key)}
                  >
                    {label}
                    <span className="sort-arrow" aria-hidden="true">
                      {isSorted ? (sort.direction === "asc" ? "▲" : "▼") : ""}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {tvs.map((tv) => {
            const isNg = isNgResult(tv);
            return (
              <tr
                key={tv.serial_number}
                className={`is-clickable${isNg ? " row-ng" : ""}`}
                onClick={() => onRowClick(tv.serial_number)}
              >
                {COLUMNS.map(({ key }) => renderCell(key, tv, isNg))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default TvTable;
