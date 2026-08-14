import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config.js";
import { formatNgSummary } from "../../utils/ngSummary.js";

const COLUMNS = [
  "모델명",
  "시리얼번호",
  "최근 검사일",
  "최근 검사 결과",
  "검사자",
  "총 검사 건수",
  "삭제일시",
];

function TvDeletedList() {
  const navigate = useNavigate();
  const [tvs, setTvs] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE_URL}/tvs/deleted`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`삭제된 목록을 불러오지 못했습니다 (status ${response.status})`);
        }
        return response.json();
      })
      .then((data) => {
        if (!cancelled) {
          setTvs(data);
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
  }, []);

  return (
    <div className="card">
      <h2>삭제된 TV 목록</h2>
      <div className="toolbar">
        <button type="button" className="btn" onClick={() => navigate("/tvs")}>
          ← 목록으로
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tvs.map((tv) => {
              const isNg = tv.last_result === "NG";
              return (
              <tr
                key={tv.serial_number}
                className={`is-clickable${isNg ? " row-ng" : ""}`}
                onClick={() =>
                  navigate(`/tvs/${encodeURIComponent(tv.serial_number)}`)
                }
              >
                <td>{tv.model_name}</td>
                <td>{tv.serial_number}</td>
                <td>{tv.last_inspected_at}</td>
                <td>
                  <span className={`badge ${isNg ? "badge-ng" : "badge-ok"}`}>
                    {tv.last_result}
                  </span>
                  {isNg && tv.ng_screens.length > 0 && (
                    <div className="ng-summary">{formatNgSummary(tv.ng_screens)}</div>
                  )}
                </td>
                <td>{tv.last_inspector_name}</td>
                <td>{tv.inspection_count}건</td>
                <td>{tv.deleted_at}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {tvs.length === 0 && <p className="empty-state">삭제된 TV가 없습니다.</p>}
    </div>
  );
}

export default TvDeletedList;
