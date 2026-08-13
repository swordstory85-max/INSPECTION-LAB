import { NavLink, Outlet } from "react-router-dom";

const linkStyle = ({ isActive }) => ({
  fontWeight: isActive ? "bold" : "normal",
  textDecoration: isActive ? "underline" : "none",
});

function Layout() {
  return (
    <div>
      <h1>TV 화면 검사 이력 관리</h1>
      <nav style={{ display: "flex", gap: "1rem" }}>
        <NavLink to="/inspect" style={linkStyle}>
          검사 입력
        </NavLink>
        <NavLink to="/tvs" end style={linkStyle}>
          목록
        </NavLink>
      </nav>

      <Outlet />
    </div>
  );
}

export default Layout;
