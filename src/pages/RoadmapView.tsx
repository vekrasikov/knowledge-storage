import { Link, useParams, useNavigate } from "react-router-dom";
import { findNode } from "../data/roadmap";
import { useUserData } from "../hooks/useUserData";
import { StatusToggle } from "../components/StatusToggle";
import type { RoadmapNode, Status } from "../types";

function TreeNode({
  node,
  depth,
  directionId,
  progress,
  onStatusChange,
  noteCount,
  materialCount,
}: {
  node: RoadmapNode;
  depth: number;
  directionId: string;
  progress: Record<string, Status>;
  onStatusChange: (id: string, status: Status) => void;
  noteCount: (id: string) => number;
  materialCount: (id: string) => number;
}) {
  const isLeaf = !node.children || node.children.length === 0;
  const status: Status = progress[node.id] ?? "not_started";
  const notes = noteCount(node.id);
  const materials = materialCount(node.id);

  return (
    <div style={{ paddingLeft: depth * 16 }}>
      <div className="flex items-center gap-2 py-2 border-b border-gray-100">
        {isLeaf ? (
          <Link
            to={`/roadmap/${directionId}/${node.id}`}
            className="flex-1 hover:text-blue-600 transition-colors"
          >
            {node.title}
          </Link>
        ) : (
          <span className="flex-1 font-medium text-gray-700">{node.title}</span>
        )}
        {(notes > 0 || materials > 0) && (
          <span className="text-xs text-gray-400">
            {notes > 0 && `${notes} notes`}
            {notes > 0 && materials > 0 && " · "}
            {materials > 0 && `${materials} mat`}
          </span>
        )}
        {isLeaf && (
          <StatusToggle status={status} onChange={(s) => onStatusChange(node.id, s)} />
        )}
      </div>
      {node.children?.map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          directionId={directionId}
          progress={progress}
          onStatusChange={onStatusChange}
          noteCount={noteCount}
          materialCount={materialCount}
        />
      ))}
    </div>
  );
}

export function RoadmapView() {
  const { directionId } = useParams<{ directionId: string }>();
  const navigate = useNavigate();
  const { data, setProgress } = useUserData();
  const direction = findNode(directionId!);

  if (!direction) {
    return <div className="p-4">Direction not found</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <button onClick={() => navigate("/")} className="text-blue-600 hover:underline mb-4 block">
        ← Back
      </button>
      <h1 className="text-2xl font-bold mb-4">{direction.title}</h1>
      <div className="bg-white rounded-lg shadow-sm border p-4">
        {direction.children?.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            depth={0}
            directionId={directionId!}
            progress={data.progress}
            onStatusChange={setProgress}
            noteCount={(id) => data.notes[id]?.length ?? 0}
            materialCount={(id) => data.materials[id]?.length ?? 0}
          />
        ))}
        {(!direction.children || direction.children.length === 0) && (
          <p className="text-gray-400 italic">No topics yet. Add them in data/roadmap.yaml</p>
        )}
      </div>
    </div>
  );
}
