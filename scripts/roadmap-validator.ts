import type { RoadmapNode } from "../src/types";

export function collectAllIds(nodes: RoadmapNode[]): Map<string, number> {
  const counts = new Map<string, number>();
  function walk(ns: RoadmapNode[]) {
    for (const n of ns) {
      counts.set(n.id, (counts.get(n.id) ?? 0) + 1);
      if (n.children) walk(n.children);
    }
  }
  walk(nodes);
  return counts;
}

export function checkUniqueIds(nodes: RoadmapNode[]): string[] {
  const counts = collectAllIds(nodes);
  const errors: string[] = [];
  for (const [id, count] of counts) {
    if (count > 1) errors.push(`Duplicate ID: "${id}" appears ${count} times`);
  }
  return errors;
}
