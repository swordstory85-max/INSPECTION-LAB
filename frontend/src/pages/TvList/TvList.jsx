import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config.js";
import TvTable from "./TvTable.jsx";

const EXPORT_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function isValidExportMonth(month) {
  return EXPORT_MONTH_PATTERN.test(month);
}

function compareTvs(a, b, key) {
  return String(a[key]).localeCompare(String(b[key]), "ko", { numeric: true });
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
  const [sort, setSort] = useState({ key: null, direction: "asc" });
  const mountedRef = useRef(true);

  function handleSortClick(key) {
    setSort((prev) => {
      if (prev.key !== key) {
        return { key, direction: "asc" };
      }
      return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
    });
  }

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

    const filtered = tvs.filter((tv) => {
      const matchesSearch =
        normalizedSearchTerm === "" ||
        tv.model_name.toLowerCase().includes(normalizedSearchTerm) ||
        tv.serial_number.toLowerCase().includes(normalizedSearchTerm);
      const matchesNgFilter = !ngOnly || tv.last_result === "NG";
      return matchesSearch && matchesNgFilter;
    });

    if (!sort.key) {
      return filtered;
    }

    const direction = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => direction * compareTvs(a, b, sort.key));
  }, [tvs, searchTerm, ngOnly, sort]);

  function handleExport() {
    if (!isValidExportMonth(exportMonth)) {
      return;
    }
    window.location.href = `${API_BASE_URL}/inspections/export?month=${encodeURIComponent(exportMonth)}`;
  }

  return (
    <div className="card">
      <h2>TV 목록</h2>

      {loadError && <p className="error-text">{loadError}</p>}
      {deleteError && <p className="error-text">{deleteError}</p>}

      <div className="toolbar">
        <button type="button" className="btn" onClick={() => navigate("/deleted-tvs")}>
          삭제된 목록 보기
        </button>

        <label className="field">
          검색
          <input
            type="text"
            placeholder="모델명 또는 시리얼번호 검색"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>

        <label className="field field-inline">
          <input
            type="checkbox"
            checked={ngOnly}
            onChange={(event) => setNgOnly(event.target.checked)}
          />
          NG만 보기
        </label>

        <label className="field">
          월별 엑셀 다운로드
          <input
            type="month"
            value={exportMonth}
            onChange={(event) => setExportMonth(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="btn"
          onClick={handleExport}
          disabled={!isValidExportMonth(exportMonth)}
        >
          다운로드
        </button>

        <button
          type="button"
          className="btn btn-danger ml-auto"
          onClick={handleDeleteSelected}
          disabled={selectedSerials.size === 0 || isDeleting}
        >
          선택 삭제 ({selectedSerials.size})
        </button>
      </div>

      <TvTable
        tvs={visibleTvs}
        sort={sort}
        onSortClick={handleSortClick}
        selectedSerials={selectedSerials}
        onToggleSelected={toggleSelected}
        onRowClick={(serialNumber) =>
          navigate(`/tvs/${encodeURIComponent(serialNumber)}`)
        }
      />

      {visibleTvs.length === 0 && (
        <p className="empty-state">검색/필터 결과가 없습니다.</p>
      )}
    </div>
  );
}

export default TvList;
