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

  useEffect(() => {
    let cancelled = false;

    setError("");
    setInspections([]);
    setExpandedIds(new Set());

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
                  {inspection.screens.map((screen) => (
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
                    </li>
                  ))}
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
