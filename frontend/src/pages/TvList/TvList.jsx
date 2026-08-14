import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config.js";

const COLUMNS = [
  "선택",
  "모델명",
  "시리얼번호",
  "최근 검사일",
  "최근 검사 결과",
  "검사자",
  "총 검사 건수",
];

const tableStyle = { borderCollapse: "collapse" };
const cellStyle = { border: "1px solid", padding: 4 };
const ngRowStyle = { cursor: "pointer", backgroundColor: "#fde2e2" };
const okRowStyle = { cursor: "pointer" };
const ngResultCellStyle = { ...cellStyle, color: "#b00020", fontWeight: "bold" };

const EXPORT_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function isNgResult(tv) {
  return tv.last_result === "NG";
}

function isValidExportMonth(month) {
  return EXPORT_MONTH_PATTERN.test(month);
}

function TvList() {
  const navigate = useNavigate();
  const [tvs, setTvs] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [ngOnly, setNgOnly] = useState(false);
  const [exportMonth, setExportMonth] = useState("");
  const [selectedSerials, setSelectedSerials] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  function loadTvs() {
    setLoadError("");
    fetch(`${API_BASE_URL}/tvs`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`목록을 불러오지 못했습니다 (status ${response.status})`);
        }
        return response.json();
      })
      .then((data) => {
        if (mountedRef.current) {
          setTvs(data);
        }
      })
      .catch((err) => {
        if (mountedRef.current) {
          setLoadError(err.message);
        }
      });
  }

  useEffect(() => {
    loadTvs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleSelected(serialNumber) {
    setSelectedSerials((prev) => {
      const next = new Set(prev);
      if (next.has(serialNumber)) {
        next.delete(serialNumber);
      } else {
        next.add(serialNumber);
      }
      return next;
    });
  }

  async function handleDeleteSelected() {
    if (isDeleting || selectedSerials.size === 0) {
      return;
    }

    const targets = [...selectedSerials];
    setIsDeleting(true);
    setDeleteError("");
    try {
      const results = await Promise.allSettled(
        targets.map((serial) =>
          fetch(`${API_BASE_URL}/tvs/${encodeURIComponent(serial)}`, {
            method: "DELETE",
          }).then((response) => {
            if (!response.ok) {
              throw new Error(`${serial}: 삭제 실패 (status ${response.status})`);
            }
          }),
        ),
      );

      const failedSerials = targets.filter(
        (_, index) => results[index].status === "rejected",
      );
      if (failedSerials.length > 0) {
        const messages = results
          .filter((result) => result.status === "rejected")
          .map((result) => result.reason.message);
        setDeleteError(messages.join(", "));
      }

      // 실패한 항목만 선택 상태로 남겨 재시도하기 쉽게 한다.
      setSelectedSerials(new Set(failedSerials));
      loadTvs();
    } finally {
      if (mountedRef.current) {
        setIsDeleting(false);
      }
    }
  }

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

  function handleExport() {
    if (!isValidExportMonth(exportMonth)) {
      return;
    }
    window.location.href = `${API_BASE_URL}/inspections/export?month=${encodeURIComponent(exportMonth)}`;
  }

  return (
    <div>
      <h2>TV 목록</h2>
      <button type="button" onClick={() => navigate("/deleted-tvs")}>
        삭제된 목록 보기
      </button>
      {loadError && <p>{loadError}</p>}
      {deleteError && <p>{deleteError}</p>}

      <label>
        월별 엑셀 다운로드
        <input
          type="month"
          value={exportMonth}
          onChange={(event) => setExportMonth(event.target.value)}
        />
      </label>
      <button
        type="button"
        onClick={handleExport}
        disabled={!isValidExportMonth(exportMonth)}
      >
        다운로드
      </button>

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

      <button
        type="button"
        onClick={handleDeleteSelected}
        disabled={selectedSerials.size === 0 || isDeleting}
      >
        선택 삭제 ({selectedSerials.size})
      </button>

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
                <td style={cellStyle} onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedSerials.has(tv.serial_number)}
                    onChange={() => toggleSelected(tv.serial_number)}
                  />
                </td>
                <td style={cellStyle}>{tv.model_name}</td>
                <td style={cellStyle}>{tv.serial_number}</td>
                <td style={cellStyle}>{tv.last_inspected_at}</td>
                <td style={isNg ? ngResultCellStyle : cellStyle}>
                  {tv.last_result}
                </td>
                <td style={cellStyle}>{tv.last_inspector_name}</td>
                <td style={cellStyle}>{tv.inspection_count}건</td>
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
