import { useRef } from "react";
import { Link } from "react-router-dom";
import { getRoadmap } from "../data/roadmap";
import { calcDirectionProgress } from "../utils/progress";
import { useUserData } from "../hooks/useUserData";
import { ProgressBar } from "../components/ProgressBar";

export function Dashboard() {
  const { data, handleExport, handleImport } = useUserData();
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
  const overallTotal = dirProgress.reduce((s, d) => s + d.total, 0);
  const overallPct = overallTotal === 0 ? 0 : Math.round((overallDone / overallTotal) * 100);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Learning Roadmap</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Export
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
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

      <div className="mb-8">
        <ProgressBar percentage={overallPct} label={`Overall: ${overallDone}/${overallTotal}`} />
      </div>

      <div className="space-y-4">
        {dirProgress.map((dir) => (
          <Link
            key={dir.id}
            to={`/roadmap/${dir.id}`}
            className="block p-4 bg-white rounded-lg shadow-sm border hover:border-blue-300 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">{dir.title}</h2>
              <span className="text-sm text-gray-500">
                {dir.done}/{dir.total}
              </span>
            </div>
            <ProgressBar percentage={dir.percentage} />
          </Link>
        ))}
      </div>
    </div>
  );
}
