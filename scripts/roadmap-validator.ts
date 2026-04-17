import type { RoadmapNode } from "../src/types";
import type { LoadedTopicFile } from "./load-topic-content";

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

export function checkPhaseReferencesValid(
  nodes: RoadmapNode[],
  validPhases: Set<string>
): string[] {
  const flat = flattenNodes(nodes);
  const errors: string[] = [];
  for (const n of flat) {
    if (n.phase && !validPhases.has(n.phase)) {
      errors.push(`Topic "${n.id}" references unknown phase "${n.phase}"`);
    }
  }
  return errors;
}

export function checkPhaseCoverage(
  nodes: RoadmapNode[],
  declaredPhases: string[]
): string[] {
  const flat = flattenNodes(nodes);
  const usedPhases = new Set(flat.map((n) => n.phase).filter(Boolean) as string[]);
  return declaredPhases
    .filter((p) => !usedPhases.has(p))
    .map((p) => `Phase "${p}" declared in path.yaml but no topic references it`);
}

export function checkEveryLeafHasPhaseOrType(nodes: RoadmapNode[]): string[] {
  const errors: string[] = [];
  function walk(ns: RoadmapNode[]) {
    for (const n of ns) {
      const isLeaf = !n.children || n.children.length === 0;
      const isAlias = !!n.aliasOf;
      if (isLeaf && !isAlias) {
        const okByPhase = !!n.phase;
        const okByType = n.type === "recurring" || n.type === "reference";
        if (!okByPhase && !okByType) {
          errors.push(`Leaf "${n.id}" has no phase and no type override`);
        }
      }
      if (n.children) walk(n.children);
    }
  }
  walk(nodes);
  return errors;
}

export function checkRecurringTopicIds(
  nodes: RoadmapNode[],
  recurringIds: string[]
): string[] {
  const flat = flattenNodes(nodes);
  const known = new Set(flat.map((n) => n.id));
  return recurringIds
    .filter((id) => !known.has(id))
    .map((id) => `Recurring topicId "${id}" does not exist in roadmap`);
}

export function checkStudyPlanTopicIds(
  nodes: RoadmapNode[],
  studyPlanIds: string[]
): string[] {
  const flat = flattenNodes(nodes);
  const known = new Set(flat.map((n) => n.id));
  return studyPlanIds
    .filter((id) => !known.has(id))
    .map((id) => `study-plan topicId "${id}" does not resolve to any roadmap entry`);
}

export function checkTopicContentIds(
  nodes: RoadmapNode[],
  contentIds: string[]
): string[] {
  const flat = flattenNodes(nodes);
  const byId = new Map(flat.map((n) => [n.id, n]));
  const errors: string[] = [];
  for (const id of contentIds) {
    const node = byId.get(id);
    if (!node) {
      errors.push(`Topic content file id "${id}" does not match any roadmap topic`);
      continue;
    }
    if (node.aliasOf) {
      errors.push(
        `Topic content file id "${id}" targets an alias; use the canonical id "${node.aliasOf}" instead`
      );
    }
  }
  return errors;
}

export function checkVisualizationImageExists(
  loaded: LoadedTopicFile[],
  publicFiles: Set<string>
): string[] {
  const errors: string[] = [];
  for (const { filename, content } of loaded) {
    const viz = content.visualization;
    if (!viz || viz.type !== "image") continue;
    if (!viz.src || !publicFiles.has(viz.src)) {
      errors.push(
        `[${filename}] visualization.src "${viz.src}" not found in /public`
      );
    }
  }
  return errors;
}
