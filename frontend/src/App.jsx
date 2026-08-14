import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./Layout.jsx";
import InspectionForm from "./pages/InspectionForm/InspectionForm.jsx";
import TvList from "./pages/TvList/TvList.jsx";
import TvHistory from "./pages/TvHistory/TvHistory.jsx";
import TvDeletedList from "./pages/TvDeletedList/TvDeletedList.jsx";
import Stats from "./pages/Stats/Stats.jsx";
import NotFound from "./pages/NotFound/NotFound.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/inspect" replace />} />
        <Route path="inspect" element={<InspectionForm />} />
        <Route path="tvs" element={<TvList />} />
        <Route path="stats" element={<Stats />} />
        <Route path="deleted-tvs" element={<TvDeletedList />} />
        <Route path="tvs/:serial" element={<TvHistory />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
