import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../../config.js";

function TvHistory() {
  const { serial } = useParams();
  const navigate = useNavigate();
  const [inspections, setInspections] = useState([]);
  const [error, setError] = useState("");
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [editingKeys, setEditingKeys] = useState(new Set());
  const [editDrafts, setEditDrafts] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [savingKeys, setSavingKeys] = useState(new Set());

  function loadHistory() {
    let cancelled = false;

    setError("");

    fetch(`${API_BASE_URL}/tvs/${encodeURIComponent(serial)}/inspections`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`이력을 불러오지 못했습니다 (status ${response.status})`);
        }
        return response.json();
      })
      .then((data) => {
        if (!cancelled) {
          setInspections(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }

  useEffect(() => {
    setInspections([]);
    setExpandedIds(new Set());
    return loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serial]);

  function toggleExpanded(id) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function startEdit(inspectionId, screen, currentNote) {
    const key = `${inspectionId}:${screen}`;
    setEditingKeys((prev) => new Set(prev).add(key));
    setEditDrafts((prev) => ({ ...prev, [key]: currentNote ?? "" }));
    setEditErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function cancelEdit(key) {
    setEditingKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setEditDrafts((prev) => {
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
    setEditErrors((prev) => {
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });
  }

  async function saveEdit(inspectionId, screen) {
    const key = `${inspectionId}:${screen}`;
    if (savingKeys.has(key)) {
      return;
    }

    const draft = editDrafts[key] ?? "";
    if (draft.trim() === "") {
      setEditErrors((prev) => ({ ...prev, [key]: "새 메모 값을 입력해주세요." }));
      return;
    }

    setSavingKeys((prev) => new Set(prev).add(key));
    try {
      const response = await fetch(
        `${API_BASE_URL}/inspections/${inspectionId}/corrections`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ screen, note: draft }),
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const detail = body?.errors?.length
          ? body.errors.join(", ")
          : `status ${response.status}`;
        throw new Error(detail);
      }

      cancelEdit(key);
      loadHistory();
    } catch (err) {
      setEditErrors((prev) => ({
        ...prev,
        [key]: `메모 수정에 실패했습니다: ${err.message}`,
      }));
    } finally {
      setSavingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  return (
    <div className="card">
      <h2>검사 이력: {serial}</h2>
      <div className="toolbar">
        <button type="button" className="btn" onClick={() => navigate("/tvs")}>
          ← 목록으로
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      <ul className="history-list">
        {inspections.map((inspection) => {
          const isExpanded = expandedIds.has(inspection.id);
          const isInspectionNg = inspection.overall_result === "NG";
          return (
            <li key={inspection.id} className="history-entry">
              <button
                type="button"
                className={`history-entry-header${isInspectionNg ? " is-ng" : ""}`}
                aria-expanded={isExpanded}
                onClick={() => toggleExpanded(inspection.id)}
              >
                {inspection.inspected_at} · {inspection.inspector_name}{" "}
                <span className={`badge ${isInspectionNg ? "badge-ng" : "badge-ok"}`}>
                  {inspection.overall_result}
                </span>
              </button>

              {isExpanded && (
                <ul className="history-screens">
                  {inspection.screens.map((screen) => {
                    const key = `${inspection.id}:${screen.screen}`;
                    const isEditing = editingKeys.has(key);
                    const isSaving = savingKeys.has(key);
                    const isScreenNg = screen.result === "NG";

                    return (
                      <li
                        key={screen.screen}
                        className={`history-screen${isScreenNg ? " is-ng" : ""}`}
                      >
                        <strong>{screen.screen}</strong>{" "}
                        <span className={`badge ${isScreenNg ? "badge-ng" : "badge-ok"}`}>
                          {screen.result}
                        </span>
                        {isScreenNg && (
                          <> — {screen.defect_types.join(", ")} · {screen.note}</>
                        )}

                        {/* corrections는 NG 화면에만 생길 수 있다 (backend/corrections.js가
                            OK 화면의 메모 수정을 400으로 막는다) — 그래서 수정 이력을
                            isScreenNg 블록 안에 함께 둬도 안전하다. */}
                        {isScreenNg && (
                          <div className="history-screen-actions">
                            {!isEditing && (
                              <button
                                type="button"
                                className="btn"
                                onClick={() =>
                                  startEdit(inspection.id, screen.screen, screen.note)
                                }
                              >
                                메모 수정
                              </button>
                            )}

                            {isEditing && (
                              <>
                                <textarea
                                  value={editDrafts[key] ?? ""}
                                  onChange={(event) =>
                                    setEditDrafts((prev) => ({
                                      ...prev,
                                      [key]: event.target.value,
                                    }))
                                  }
                                />
                                <div className="action-row">
                                  <button
                                    type="button"
                                    className="btn btn-primary"
                                    disabled={isSaving}
                                    onClick={() => saveEdit(inspection.id, screen.screen)}
                                  >
                                    저장
                                  </button>
                                  <button
                                    type="button"
                                    className="btn"
                                    disabled={isSaving}
                                    onClick={() => cancelEdit(key)}
                                  >
                                    취소
                                  </button>
                                </div>
                                {editErrors[key] && (
                                  <p className="error-text">{editErrors[key]}</p>
                                )}
                              </>
                            )}

                            {screen.corrections.length > 0 && (
                              <ul className="correction-log">
                                <li>수정 이력</li>
                                {screen.corrections.map((correction, index) => (
                                  <li key={index}>
                                    {correction.corrected_at}: "
                                    {correction.previous_note}" → "
                                    {correction.new_note}"
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {inspections.length === 0 && !error && (
        <p className="empty-state">검사 이력이 없습니다.</p>
      )}
    </div>
  );
}

export default TvHistory;
