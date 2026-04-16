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

function flattenNodes(nodes: RoadmapNode[]): RoadmapNode[] {
  const out: RoadmapNode[] = [];
  function walk(ns: RoadmapNode[]) {
    for (const n of ns) {
      out.push(n);
      if (n.children) walk(n.children);
    }
  }
  walk(nodes);
  return out;
}

export function checkAliasTargets(nodes: RoadmapNode[]): string[] {
  const flat = flattenNodes(nodes);
  const byId = new Map(flat.map((n) => [n.id, n]));
  const errors: string[] = [];
  for (const n of flat) {
    if (!n.aliasOf) continue;
    const target = byId.get(n.aliasOf);
    if (!target) {
      errors.push(`Alias "${n.id}" points to missing id "${n.aliasOf}"`);
      continue;
    }
    if (target.aliasOf) {
      errors.push(
        `Alias "${n.id}" points to "${n.aliasOf}" which is itself an alias (chain not allowed)`
      );
    }
  }
  return errors;
}

export function checkPrereqExistence(nodes: RoadmapNode[]): string[] {
  const flat = flattenNodes(nodes);
  const byId = new Map(flat.map((n) => [n.id, n]));
  const errors: string[] = [];
  for (const n of flat) {
    if (!n.prerequisites) continue;
    for (const p of n.prerequisites) {
      const target = byId.get(p);
      if (!target) {
        errors.push(`Topic "${n.id}" has unknown prerequisite "${p}"`);
      } else if (target.aliasOf) {
        errors.push(
          `Topic "${n.id}" has prerequisite "${p}" which is an alias — use canonical id`
        );
      }
    }
  }
  return errors;
}

export function checkPrereqCycles(nodes: RoadmapNode[]): string[] {
  const flat = flattenNodes(nodes);
  const adj = new Map<string, string[]>();
  for (const n of flat) adj.set(n.id, n.prerequisites ?? []);

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const id of adj.keys()) color.set(id, WHITE);
  const errors: string[] = [];

  function dfs(id: string, stack: string[]): void {
    color.set(id, GRAY);
    for (const nxt of adj.get(id) ?? []) {
      if (color.get(nxt) === GRAY) {
        errors.push(`Prereq cycle: ${[...stack, id, nxt].join(" -> ")}`);
        // do NOT early-return — let traversal finish so id reaches BLACK
      } else if (color.get(nxt) === WHITE) {
        dfs(nxt, [...stack, id]);
      }
    }
    color.set(id, BLACK);
  }

  for (const id of adj.keys()) {
    if (color.get(id) === WHITE) dfs(id, []);
  }
  return errors;
}

export function checkPhaseOrderUniqueness(nodes: RoadmapNode[]): string[] {
  const flat = flattenNodes(nodes);
  const seen = new Map<string, string>(); // phase:order -> id
  const errors: string[] = [];
  for (const n of flat) {
    if (!n.phase || n.phaseOrder === undefined) continue;
    const key = `${n.phase}:${n.phaseOrder}`;
    const prev = seen.get(key);
    if (prev) {
      errors.push(
        `Duplicate phaseOrder ${n.phaseOrder} in phase ${n.phase}: "${prev}" and "${n.id}"`
      );
    } else {
      seen.set(key, n.id);
    }
  }
  return errors;
}
