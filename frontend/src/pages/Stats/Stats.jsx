import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config.js";

function BarChart({ rows, labelKey, valueKey, emptyMessage }) {
  if (rows.length === 0) {
    return <p className="empty-state">{emptyMessage}</p>;
  }

  const max = Math.max(1, ...rows.map((row) => row[valueKey]));

  return (
    <div className="bar-chart">
      {rows.map((row) => (
        <div className="bar-row" key={row[labelKey]}>
          <span className="bar-label">{row[labelKey]}</span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${(row[valueKey] / max) * 100}%` }}
            />
          </div>
          <span className="bar-value">{row[valueKey]}</span>
        </div>
      ))}
    </div>
  );
}

function Stats() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE_URL}/stats`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`통계를 불러오지 못했습니다 (status ${response.status})`);
        }
        return response.json();
      })
      .then((data) => {
        if (!cancelled) {
          setStats(data);
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

  if (error) {
    return (
      <div className="card">
        <h2>불량 통계</h2>
        <p className="error-text">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="card">
        <h2>불량 통계</h2>
        <p className="empty-state">불러오는 중…</p>
      </div>
    );
  }

  const ngRate =
    stats.overall.total === 0
      ? 0
      : Math.round((stats.overall.ng / stats.overall.total) * 1000) / 10;

  return (
    <div>
      <div className="card">
        <h2>불량 통계</h2>

        <div className="kpi-row">
          <div className="stat-tile">
            <div className="stat-tile-label">총 검사 건수</div>
            <div className="stat-tile-value">{stats.overall.total}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-tile-label">OK</div>
            <div className="stat-tile-value is-ok">{stats.overall.ok}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-tile-label">NG</div>
            <div className="stat-tile-value is-ng">{stats.overall.ng}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-tile-label">NG 비율</div>
            <div className="stat-tile-value">{ngRate}%</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>화면별 NG 건수</h2>
        {/* stats.screens는 backend에서 White/Red/Green/Blue/Black 5개를 항상
            0건으로라도 채워서 주므로 rows.length가 0이 될 수 없다 — emptyMessage는
            여기서 절대 쓰이지 않는다(전달하지 않는 것으로 그 사실을 드러낸다). */}
        <BarChart rows={stats.screens} labelKey="screen" valueKey="count" />
      </div>

      <div className="card">
        <h2>불량 항목별 건수</h2>
        <BarChart
          rows={stats.defectTypes}
          labelKey="defect_type"
          valueKey="count"
          emptyMessage="NG 기록이 없습니다."
        />
      </div>

      <div className="card">
        <h2>검사자별 검사 건수</h2>
        {stats.inspectors.length === 0 ? (
          <p className="empty-state">검사 기록이 없습니다.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>검사자</th>
                  <th>총 검사</th>
                  <th>OK</th>
                  <th>NG</th>
                </tr>
              </thead>
              <tbody>
                {stats.inspectors.map((row) => (
                  <tr key={row.inspector_name}>
                    <td>{row.inspector_name}</td>
                    <td>{row.total}</td>
                    <td>{row.ok}</td>
                    <td>{row.ng}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Stats;
