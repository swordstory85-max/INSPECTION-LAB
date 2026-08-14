import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config.js";

const COLUMNS = [
  "모델명",
  "시리얼번호",
  "최근 검사일",
  "최근 검사 결과",
  "검사자",
  "총 검사 건수",
  "삭제일시",
];

const tableStyle = { borderCollapse: "collapse" };
const cellStyle = { border: "1px solid", padding: 4 };
const rowStyle = { cursor: "pointer" };

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
    <div>
      <h2>삭제된 TV 목록</h2>
      <button type="button" onClick={() => navigate("/tvs")}>
        ← 목록으로
      </button>

      {error && <p>{error}</p>}

      <table style={tableStyle}>
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th key={column} style={cellStyle}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tvs.map((tv) => (
            <tr
              key={tv.serial_number}
              onClick={() =>
                navigate(`/tvs/${encodeURIComponent(tv.serial_number)}`)
              }
              style={rowStyle}
            >
              <td style={cellStyle}>{tv.model_name}</td>
              <td style={cellStyle}>{tv.serial_number}</td>
              <td style={cellStyle}>{tv.last_inspected_at}</td>
              <td style={cellStyle}>{tv.last_result}</td>
              <td style={cellStyle}>{tv.last_inspector_name}</td>
              <td style={cellStyle}>{tv.inspection_count}건</td>
              <td style={cellStyle}>{tv.deleted_at}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {tvs.length === 0 && <p>삭제된 TV가 없습니다.</p>}
    </div>
  );
}

export default TvDeletedList;
