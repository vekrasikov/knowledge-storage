import type { RoadmapNode, Status } from "../types";

export function resolveProgressId(id: string, aliasMap: Map<string, string>): string {
  return aliasMap.get(id) ?? id;
}

export function getProgressStatus(
  id: string,
  progress: Record<string, Status>,
  aliasMap: Map<string, string>
): Status | undefined {
  const canonical = resolveProgressId(id, aliasMap);
  return progress[canonical] ?? progress[id];
}

export function setProgressStatus(
  id: string,
  status: Status,
  progress: Record<string, Status>,
  aliasMap: Map<string, string>
): void {
  const canonical = resolveProgressId(id, aliasMap);
  progress[canonical] = status;
  if (canonical !== id) delete progress[id];
}

export interface ProgressInfo {
  total: number;
  done: number;
  inProgress: number;
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
  const inProgress = leaves.filter((id) => progress[id] === "in_progress").length;
  const percentage = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, inProgress, percentage };
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
