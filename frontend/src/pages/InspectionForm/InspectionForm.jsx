import { useState } from "react";
import { API_BASE_URL } from "../../config.js";

const initialTvInfo = {
  model_name: "",
  tv_serial_number: "",
  inspector_name: "",
  inspector_id: "",
  inspector_contact: "",
};

const TV_INFO_FIELDS = [
  { field: "model_name", label: "모델명" },
  { field: "tv_serial_number", label: "시리얼번호" },
  { field: "inspector_name", label: "검사자 이름" },
  { field: "inspector_id", label: "검사자 사번" },
  { field: "inspector_contact", label: "검사자 연락처" },
];

const SCREENS = ["White", "Red", "Green", "Blue", "Black"];

const DEFECT_TYPES = ["픽셀 이상", "줄 이상", "국소적 색 이상", "화면 미출력"];

const okSelectedStyle = { backgroundColor: "#2e7d32", color: "#fff" };
const ngSelectedStyle = { backgroundColor: "#b00020", color: "#fff" };
const tableStyle = { borderCollapse: "collapse" };
const cellStyle = { border: "1px solid", padding: 4, verticalAlign: "top" };

const initialScreenResults = SCREENS.reduce((acc, screen) => {
  acc[screen] = null;
  return acc;
}, {});

function createEmptyScreenDetail() {
  return { defectTypes: [], note: "" };
}

const initialScreenDetails = SCREENS.reduce((acc, screen) => {
  acc[screen] = createEmptyScreenDetail();
  return acc;
}, {});

function InspectionForm() {
  const [tvInfo, setTvInfo] = useState(initialTvInfo);
  const [screenResults, setScreenResults] = useState(initialScreenResults);
  const [screenDetails, setScreenDetails] = useState(initialScreenDetails);
  const [resultMessage, setResultMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function findMissingTvInfoLabels() {
    return TV_INFO_FIELDS.filter(({ field }) => tvInfo[field].trim() === "").map(
      ({ label }) => label,
    );
  }

  function findMissingScreens() {
    return SCREENS.filter((screen) => screenResults[screen] === null);
  }

  function findNgScreensMissingNote() {
    return SCREENS.filter(
      (screen) =>
        screenResults[screen] === "NG" &&
        screenDetails[screen].note.trim() === "",
    );
  }

  function findNgScreensMissingDefectType() {
    return SCREENS.filter(
      (screen) =>
        screenResults[screen] === "NG" &&
        screenDetails[screen].defectTypes.length === 0,
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const missingLabels = findMissingTvInfoLabels();
    if (missingLabels.length > 0) {
      setResultMessage(`다음 항목을 입력해주세요: ${missingLabels.join(", ")}`);
      return;
    }

    const missingScreens = findMissingScreens();
    if (missingScreens.length > 0) {
      setResultMessage(
        `다음 화면의 판정(OK/NG)을 선택해주세요: ${missingScreens.join(", ")}`,
      );
      return;
    }

    const ngScreensMissingNote = findNgScreensMissingNote();
    if (ngScreensMissingNote.length > 0) {
      setResultMessage(
        `다음 화면은 NG인데 조치 메모가 없습니다: ${ngScreensMissingNote.join(", ")}`,
      );
      return;
    }

    const ngScreensMissingDefectType = findNgScreensMissingDefectType();
    if (ngScreensMissingDefectType.length > 0) {
      setResultMessage(
        `다음 화면은 NG인데 불량 항목이 선택되지 않았습니다: ${ngScreensMissingDefectType.join(", ")}`,
      );
      return;
    }

    const payload = {
      ...tvInfo,
      screens: SCREENS.map((screen) => ({
        screen,
        result: screenResults[screen],
        defect_types: screenDetails[screen].defectTypes,
        note: screenDetails[screen].note,
      })),
    };

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/inspections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const detail = body?.errors?.length
          ? body.errors.join(", ")
          : `status ${response.status}`;
        throw new Error(detail);
      }

      setResultMessage("저장되었습니다.");
      setTvInfo(initialTvInfo);
      setScreenResults(initialScreenResults);
      setScreenDetails(initialScreenDetails);
    } catch (error) {
      setResultMessage(`저장에 실패했습니다: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleTvInfoChange(event) {
    const { id, value } = event.target;
    setTvInfo((prev) => ({ ...prev, [id]: value }));
  }

  function updateScreenDetail(screen, updater) {
    setScreenDetails((prev) => ({
      ...prev,
      [screen]: updater(prev[screen]),
    }));
  }

  function handleScreenResultToggle(screen, result) {
    const nextResult = screenResults[screen] === result ? null : result;
    setScreenResults((prev) => ({ ...prev, [screen]: nextResult }));
    if (nextResult !== "NG") {
      updateScreenDetail(screen, createEmptyScreenDetail);
    }
  }

  function handleTvInfoKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
    }
  }

  function handleDefectTypeToggle(screen, defectType) {
    updateScreenDetail(screen, (detail) => {
      const next = detail.defectTypes.includes(defectType)
        ? detail.defectTypes.filter((d) => d !== defectType)
        : [...detail.defectTypes, defectType];
      return { ...detail, defectTypes: next };
    });
  }

  function handleNoteChange(screen, note) {
    updateScreenDetail(screen, (detail) => ({ ...detail, note }));
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>검사 입력</h2>

      <table style={tableStyle} role="presentation">
        <tbody>
          {TV_INFO_FIELDS.map(({ field, label }) => (
            <tr key={field}>
              <th style={cellStyle}>
                <label htmlFor={field}>{label}</label>
              </th>
              <td style={cellStyle}>
                <input
                  id={field}
                  type="text"
                  value={tvInfo[field]}
                  onChange={handleTvInfoChange}
                  onKeyDown={handleTvInfoKeyDown}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>화면별 판정</h2>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={cellStyle}>화면</th>
            <th style={cellStyle}>판정</th>
            <th style={cellStyle}>불량 항목</th>
            <th style={cellStyle}>조치 메모</th>
          </tr>
        </thead>
        <tbody>
          {SCREENS.map((screen) => (
            <tr key={screen}>
              <td style={cellStyle}>{screen}</td>
              <td style={cellStyle}>
                <button
                  type="button"
                  aria-pressed={screenResults[screen] === "OK"}
                  style={screenResults[screen] === "OK" ? okSelectedStyle : undefined}
                  onClick={() => handleScreenResultToggle(screen, "OK")}
                >
                  OK
                </button>
                <button
                  type="button"
                  aria-pressed={screenResults[screen] === "NG"}
                  style={screenResults[screen] === "NG" ? ngSelectedStyle : undefined}
                  onClick={() => handleScreenResultToggle(screen, "NG")}
                >
                  NG
                </button>
              </td>
              <td style={cellStyle}>
                {screenResults[screen] === "NG" &&
                  DEFECT_TYPES.map((defectType) => (
                    <label key={defectType} style={{ display: "block" }}>
                      <input
                        type="checkbox"
                        checked={screenDetails[screen].defectTypes.includes(
                          defectType,
                        )}
                        onChange={() => handleDefectTypeToggle(screen, defectType)}
                      />
                      {defectType}
                    </label>
                  ))}
              </td>
              <td style={cellStyle}>
                {screenResults[screen] === "NG" && (
                  <textarea
                    id={`${screen}-note`}
                    aria-label={`${screen} 조치 메모`}
                    value={screenDetails[screen].note}
                    onChange={(event) => handleNoteChange(screen, event.target.value)}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button type="submit" disabled={isSubmitting}>
        저장
      </button>

      {resultMessage && <p>{resultMessage}</p>}
    </form>
  );
}

export default InspectionForm;
