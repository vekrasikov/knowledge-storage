import type { RoadmapNode, Status } from "../types";

export interface ProgressInfo {
  total: number;
  done: number;
  percentage: number;
}

export interface DirectionProgress extends ProgressInfo {
  id: string;
  title: string;
}

function collectLeaves(node: RoadmapNode): string[] {
  if (!node.children || node.children.length === 0) {
    return [node.id];
  }
  return node.children.flatMap(collectLeaves);
}

export function calcProgress(
  node: RoadmapNode,
  progress: Record<string, Status>
): ProgressInfo {
  const leaves = collectLeaves(node);
  const total = leaves.length;
  const done = leaves.filter((id) => progress[id] === "done").length;
  const percentage = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, percentage };
}

export function calcDirectionProgress(
  directions: RoadmapNode[],
  progress: Record<string, Status>
): DirectionProgress[] {
  return directions.map((dir) => ({
    id: dir.id,
    title: dir.title,
    ...calcProgress(dir, progress),
  }));
}
