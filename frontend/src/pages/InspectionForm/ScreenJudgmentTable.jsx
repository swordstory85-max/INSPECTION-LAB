import { SCREENS, DEFECT_TYPES } from "./constants.js";

function ScreenJudgmentTable({
  screenResults,
  screenDetails,
  onToggleResult,
  onToggleDefectType,
  onNoteChange,
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>화면</th>
            <th>판정</th>
            <th>불량 항목</th>
            <th>조치 메모</th>
          </tr>
        </thead>
        <tbody>
          {SCREENS.map((screen) => (
            <tr key={screen} className={screenResults[screen] === "NG" ? "row-ng" : undefined}>
              <td>{screen}</td>
              <td>
                <button
                  type="button"
                  className={`btn btn-toggle btn-toggle-ok${screenResults[screen] === "OK" ? " is-selected" : ""}`}
                  aria-pressed={screenResults[screen] === "OK"}
                  onClick={() => onToggleResult(screen, "OK")}
                >
                  OK
                </button>{" "}
                <button
                  type="button"
                  className={`btn btn-toggle btn-toggle-ng${screenResults[screen] === "NG" ? " is-selected" : ""}`}
                  aria-pressed={screenResults[screen] === "NG"}
                  onClick={() => onToggleResult(screen, "NG")}
                >
                  NG
                </button>
              </td>
              <td>
                {screenResults[screen] === "NG" && (
                  <div className="defect-options">
                    {DEFECT_TYPES.map((defectType) => (
                      <label key={defectType}>
                        <input
                          type="checkbox"
                          checked={screenDetails[screen].defectTypes.includes(defectType)}
                          onChange={() => onToggleDefectType(screen, defectType)}
                        />
                        {defectType}
                      </label>
                    ))}
                  </div>
                )}
              </td>
              <td>
                {screenResults[screen] === "NG" && (
                  <textarea
                    id={`${screen}-note`}
                    aria-label={`${screen} 조치 메모`}
                    value={screenDetails[screen].note}
                    onChange={(event) => onNoteChange(screen, event.target.value)}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ScreenJudgmentTable;
