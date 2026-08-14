import { NavLink, Outlet } from "react-router-dom";

function navLinkClassName({ isActive }) {
  return isActive ? "active" : undefined;
}

function Layout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>TV 화면 검사 이력 관리</h1>
        <nav className="app-nav">
          <NavLink to="/inspect" className={navLinkClassName}>
            검사 입력
          </NavLink>
          <NavLink to="/tvs" end className={navLinkClassName}>
            목록
          </NavLink>
        </nav>
      </header>

      <div className="page">
        <Outlet />
      </div>
    </div>
  );
}

export default Layout;
