import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../../config.js";

const ngTextStyle = { color: "#b00020", fontWeight: "bold" };

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
    <div>
      <h2>검사 이력: {serial}</h2>
      <button type="button" onClick={() => navigate("/tvs")}>
        ← 목록으로
      </button>

      {error && <p>{error}</p>}

      <ul>
        {inspections.map((inspection) => {
          const isExpanded = expandedIds.has(inspection.id);
          return (
            <li key={inspection.id}>
              <button
                type="button"
                onClick={() => toggleExpanded(inspection.id)}
                style={inspection.overall_result === "NG" ? ngTextStyle : undefined}
              >
                {inspection.inspected_at} {inspection.inspector_name}{" "}
                {inspection.overall_result}
              </button>

              {isExpanded && (
                <ul>
                  {inspection.screens.map((screen) => {
                    const key = `${inspection.id}:${screen.screen}`;
                    const isEditing = editingKeys.has(key);
                    const isSaving = savingKeys.has(key);

                    return (
                      <li
                        key={screen.screen}
                        style={screen.result === "NG" ? ngTextStyle : undefined}
                      >
                        {screen.screen}: {screen.result}
                        {screen.result === "NG" && (
                          <>
                            {" "}
                            / {screen.defect_types.join(", ")} / {screen.note}
                          </>
                        )}

                        {screen.result === "NG" && !isEditing && (
                          <button
                            type="button"
                            onClick={() =>
                              startEdit(inspection.id, screen.screen, screen.note)
                            }
                          >
                            메모 수정
                          </button>
                        )}

                        {isEditing && (
                          <div>
                            <textarea
                              value={editDrafts[key] ?? ""}
                              onChange={(event) =>
                                setEditDrafts((prev) => ({
                                  ...prev,
                                  [key]: event.target.value,
                                }))
                              }
                            />
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => saveEdit(inspection.id, screen.screen)}
                            >
                              저장
                            </button>
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => cancelEdit(key)}
                            >
                              취소
                            </button>
                            {editErrors[key] && <p>{editErrors[key]}</p>}
                          </div>
                        )}

                        {screen.corrections.length > 0 && (
                          <ul>
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
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default TvHistory;
