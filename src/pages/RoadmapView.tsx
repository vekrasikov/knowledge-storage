import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { findNode } from "../data/roadmap";
import { useUserData } from "../hooks/useUserData";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { StatusToggle } from "../components/StatusToggle";
import { TopicPanel } from "../components/TopicPanel";
import type { RoadmapNode, Status } from "../types";

// Compute progress stats for a subtree
function computeProgress(
  node: RoadmapNode,
  progress: Record<string, Status>
): { done: number; total: number } {
  if (!node.children || node.children.length === 0) {
    const s = progress[node.id] ?? "not_started";
    return { done: s === "done" ? 1 : 0, total: 1 };
  }
  let done = 0;
  let total = 0;
  for (const child of node.children) {
    const r = computeProgress(child, progress);
    done += r.done;
    total += r.total;
  }
  return { done, total };
}

function ProgressBadge({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : done / total;
  const color =
    pct === 1
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
      : pct > 0
      ? "bg-amber-50 text-amber-700 border border-amber-200"
      : "bg-slate-100 text-slate-500 border border-slate-200";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
      {done}/{total}
    </span>
  );
}

function TreeNode({
  node,
  directionId,
  progress,
  onStatusChange,
  noteCount,
  materialCount,
  selectedTopicId,
  onSelectTopic,
  defaultExpanded,
}: {
  node: RoadmapNode;
  directionId: string;
  progress: Record<string, Status>;
  onStatusChange: (id: string, status: Status) => void;
  noteCount: (id: string) => number;
  materialCount: (id: string) => number;
  selectedTopicId: string | null;
  onSelectTopic: (id: string) => void;
  defaultExpanded: boolean;
}) {
  const isLeaf = !node.children || node.children.length === 0;
  const [expanded, setExpanded] = useState(defaultExpanded);
  const status: Status = progress[node.id] ?? "not_started";
  const notes = noteCount(node.id);
  const materials = materialCount(node.id);
  const isSelected = node.id === selectedTopicId;

  if (isLeaf) {
    const leafColor =
      status === "done"
        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
        : status === "in_progress"
        ? "bg-amber-50 border-amber-200 text-amber-700"
        : "bg-slate-50 border-slate-200 text-slate-600";

    const selectedRing = isSelected ? "ring-2 ring-blue-400 ring-offset-1" : "";

    return (
      <div className="tree-child">
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${leafColor} ${selectedRing}`}
          onClick={() => onSelectTopic(node.id)}
        >
          <span className="flex-1 text-sm font-medium">{node.title}</span>
          {(notes > 0 || materials > 0) && (
            <span className="flex items-center gap-1 text-xs opacity-70">
              {notes > 0 && (
                <span className="px-1.5 py-0.5 bg-white/60 rounded-full">
                  {notes}n
                </span>
              )}
              {materials > 0 && (
                <span className="px-1.5 py-0.5 bg-white/60 rounded-full">
                  {materials}m
                </span>
              )}
            </span>
          )}
          <div onClick={(e) => e.stopPropagation()}>
            <StatusToggle status={status} onChange={(s) => onStatusChange(node.id, s)} />
          </div>
        </div>
      </div>
    );
  }

  // Group node
  const { done, total } = computeProgress(node, progress);

  return (
    <div className="tree-child">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 py-2 text-left hover:bg-slate-50 rounded-lg px-2 transition-colors group"
      >
        <span className="text-slate-400 text-xs w-4 text-center flex-shrink-0 transition-transform duration-200" style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}>
          ▶
        </span>
        <span className="flex-1 font-semibold text-slate-700 text-sm group-hover:text-slate-900">
          {node.title}
        </span>
        <ProgressBadge done={done} total={total} />
      </button>

      <div className={`collapsible ${expanded ? "" : "collapsed"}`}>
        <div>
          <div className="tree-children mt-1">
            {node.children!.map((child) => (
              <div key={child.id} className="mb-1.5">
                <TreeNode
                  node={child}
                  directionId={directionId}
                  progress={progress}
                  onStatusChange={onStatusChange}
                  noteCount={noteCount}
                  materialCount={materialCount}
                  selectedTopicId={selectedTopicId}
                  onSelectTopic={onSelectTopic}
                  defaultExpanded={defaultExpanded}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function RoadmapView() {
  const { directionId } = useParams<{ directionId: string }>();
  const navigate = useNavigate();
  const { data, setProgress } = useUserData();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const direction = findNode(directionId!);

  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  if (!direction) {
    return <div className="p-4">Direction not found</div>;
  }

  const { done: totalDone, total: totalAll } = computeProgress(direction, data.progress);
  const pct = totalAll === 0 ? 0 : Math.round((totalDone / totalAll) * 100);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="text-slate-500 hover:text-slate-800 transition-colors text-sm flex items-center gap-1"
          >
            ← Back
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-slate-900 truncate">{direction.title}</h1>
          </div>
          {/* Progress summary */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-slate-500">{pct}%</span>
            </div>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {totalDone}/{totalAll}
            </span>
          </div>
        </div>
      </header>

      {/* Tree content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="space-y-1">
          {direction.children?.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              directionId={directionId!}
              progress={data.progress}
              onStatusChange={setProgress}
              noteCount={(id) => data.notes[id]?.length ?? 0}
              materialCount={(id) => data.materials[id]?.length ?? 0}
              selectedTopicId={selectedTopicId}
              onSelectTopic={setSelectedTopicId}
              defaultExpanded={isDesktop}
            />
          ))}
          {(!direction.children || direction.children.length === 0) && (
            <p className="text-slate-400 italic text-sm p-4">No topics yet. Add them in data/roadmap.yaml</p>
          )}
        </div>
      </main>

      {/* Side / bottom panel */}
      {selectedTopicId && (
        <TopicPanel
          topicId={selectedTopicId}
          directionId={directionId!}
          onClose={() => setSelectedTopicId(null)}
        />
      )}
    </div>
  );
}
