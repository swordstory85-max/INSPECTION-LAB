import { NavLink, Outlet } from "react-router-dom";

function navLinkClassName({ isActive }) {
  return isActive ? "active" : undefined;
}

function Layout() {
  return (
    <div>
      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand" aria-label="TV 화면 검사 이력 관리">
            <span className="brand-mark">TV</span>
            <h1>화면 검사 이력 관리</h1>
          </div>

          <nav className="app-nav">
            <NavLink to="/inspect" className={navLinkClassName}>
              검사 입력
            </NavLink>
            <NavLink to="/tvs" end className={navLinkClassName}>
              목록
            </NavLink>
          </nav>
        </div>
      </header>

      <div className="app-shell">
        <div className="page">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default Layout;
