import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./Layout.jsx";
import InspectionForm from "./pages/InspectionForm/InspectionForm.jsx";
import TvList from "./pages/TvList/TvList.jsx";
import TvHistory from "./pages/TvHistory/TvHistory.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/inspect" replace />} />
        <Route path="inspect" element={<InspectionForm />} />
        <Route path="tvs" element={<TvList />} />
        <Route path="tvs/:serial" element={<TvHistory />} />
      </Route>
    </Routes>
  );
}

export default App;
