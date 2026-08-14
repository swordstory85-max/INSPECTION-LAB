import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="card">
      <h2>페이지를 찾을 수 없습니다</h2>
      <p>요청한 주소가 존재하지 않습니다.</p>
      <Link to="/tvs" className="btn btn-primary">
        TV 목록으로 이동
      </Link>
    </div>
  );
}

export default NotFound;
