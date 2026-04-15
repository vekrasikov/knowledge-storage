import { useRef } from "react";
import { Link } from "react-router-dom";
import { getRoadmap } from "../data/roadmap";
import { calcDirectionProgress } from "../utils/progress";
import { useUserData } from "../hooks/useUserData";
import { ProgressBar } from "../components/ProgressBar";
import { SyncButton } from "../components/SyncButton";

const DIRECTION_COLORS: Record<string, string> = {
  backend: "border-l-blue-500",
  arch: "border-l-purple-500",
  devops: "border-l-orange-500",
  "data-analysis": "border-l-cyan-500",
  python: "border-l-yellow-500",
  "ai-agents": "border-l-pink-500",
  english: "border-l-green-500",
  "ai-dev-tools": "border-l-indigo-500",
};

export function Dashboard() {
  const { data, handleExport, handleImport, replaceData } = useUserData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const roadmap = getRoadmap();
  const dirProgress = calcDirectionProgress(roadmap, data.progress);

  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        handleImport(reader.result as string);
      } catch (err) {
        alert("Invalid backup file: " + (err as Error).message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const overallDone = dirProgress.reduce((s, d) => s + d.done, 0);
  const overallInProgress = dirProgress.reduce((s, d) => s + d.inProgress, 0);
  const overallTotal = dirProgress.reduce((s, d) => s + d.total, 0);
  const overallPct = overallTotal === 0 ? 0 : Math.round((overallDone / overallTotal) * 100);

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="mb-8">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Learning Roadmap</h1>
            <p className="text-slate-500 mt-1">
              {overallDone} of {overallTotal} topics completed
            </p>
            <Link
              to="/timeline"
              className="inline-flex items-center gap-1.5 mt-2 text-sm text-blue-600 hover:underline"
            >
              View 24-week study plan →
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <SyncButton data={data} onImport={replaceData} />
            <div className="flex gap-1.5">
              <button
                onClick={handleExport}
                className="px-2.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-all duration-200"
                title="Export JSON backup"
              >
                Export
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-all duration-200"
                title="Import JSON backup"
              >
                Import
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={onImportFile}
                className="hidden"
              />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar
            variant="stacked"
            done={overallDone}
            inProgress={overallInProgress}
            total={overallTotal}
            label={`${overallPct}% complete`}
            percentage={overallPct}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dirProgress.map((dir) => (
          <Link
            key={dir.id}
            to={`/roadmap/${dir.id}`}
            className={`block p-5 bg-white rounded-xl border-l-4 ${DIRECTION_COLORS[dir.id] || "border-l-slate-300"} shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-200`}
          >
            <h2 className="text-base font-semibold text-slate-800 mb-3">{dir.title}</h2>
            <ProgressBar variant="stacked" done={dir.done} inProgress={dir.inProgress} total={dir.total} percentage={dir.percentage} />
            <div className="flex gap-3 mt-2 text-xs text-slate-400">
              {dir.done > 0 && <span className="text-emerald-600">{dir.done} done</span>}
              {dir.inProgress > 0 && <span className="text-amber-600">{dir.inProgress} active</span>}
              <span>{dir.total - dir.done - dir.inProgress} remaining</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
