import { HashRouter, Routes, Route } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { RoadmapView } from "./pages/RoadmapView";

function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/roadmap/:directionId" element={<RoadmapView />} />
        </Routes>
      </div>
    </HashRouter>
  );
}

export default App;
