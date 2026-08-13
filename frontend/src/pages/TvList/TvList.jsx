import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config.js";

const COLUMNS = ["모델명", "시리얼번호", "최근 검사일", "최근 검사 결과", "검사자"];

const tableStyle = { borderCollapse: "collapse" };
const cellStyle = { border: "1px solid", padding: 4 };
const ngRowStyle = { cursor: "pointer", backgroundColor: "#fde2e2" };
const okRowStyle = { cursor: "pointer" };
const ngResultCellStyle = { ...cellStyle, color: "#b00020", fontWeight: "bold" };

function isNgResult(tv) {
  return tv.last_result === "NG";
}

function TvList() {
  const navigate = useNavigate();
  const [tvs, setTvs] = useState([]);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [ngOnly, setNgOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE_URL}/tvs`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`목록을 불러오지 못했습니다 (status ${response.status})`);
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

  const visibleTvs = useMemo(() => {
    // .toLowerCase() is a safe no-op on Korean text (no case distinction);
    // it only affects ASCII letters, which is all we need here.
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return tvs.filter((tv) => {
      const matchesSearch =
        normalizedSearchTerm === "" ||
        tv.model_name.toLowerCase().includes(normalizedSearchTerm) ||
        tv.serial_number.toLowerCase().includes(normalizedSearchTerm);
      const matchesNgFilter = !ngOnly || isNgResult(tv);
      return matchesSearch && matchesNgFilter;
    });
  }, [tvs, searchTerm, ngOnly]);

  return (
    <div>
      <h2>TV 목록</h2>
      {error && <p>{error}</p>}

      <label>
        검색
        <input
          type="text"
          placeholder="모델명 또는 시리얼번호 검색"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </label>

      <label>
        <input
          type="checkbox"
          checked={ngOnly}
          onChange={(event) => setNgOnly(event.target.checked)}
        />
        NG만 보기
      </label>

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
          {visibleTvs.map((tv) => {
            const isNg = isNgResult(tv);
            return (
              <tr
                key={tv.serial_number}
                onClick={() =>
                  navigate(`/tvs/${encodeURIComponent(tv.serial_number)}`)
                }
                style={isNg ? ngRowStyle : okRowStyle}
              >
                <td style={cellStyle}>{tv.model_name}</td>
                <td style={cellStyle}>{tv.serial_number}</td>
                <td style={cellStyle}>{tv.last_inspected_at}</td>
                <td style={isNg ? ngResultCellStyle : cellStyle}>
                  {tv.last_result}
                </td>
                <td style={cellStyle}>{tv.last_inspector_name}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {visibleTvs.length === 0 && <p>검색/필터 결과가 없습니다.</p>}
    </div>
  );
}

export default TvList;
