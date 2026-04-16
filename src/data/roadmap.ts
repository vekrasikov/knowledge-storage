import backend from "../../data/roadmap/01-backend.yaml";
import arch from "../../data/roadmap/02-arch.yaml";
import devops from "../../data/roadmap/03-devops.yaml";
import dataAnalysis from "../../data/roadmap/04-data-analysis.yaml";
import python from "../../data/roadmap/05-python.yaml";
import aiAgents from "../../data/roadmap/06-ai-agents.yaml";
import english from "../../data/roadmap/07-english.yaml";
import aiDevTools from "../../data/roadmap/08-ai-dev-tools.yaml";
import type { RoadmapNode } from "../types";

export function buildAliasMap(nodes: RoadmapNode[]): Map<string, string> {
  const map = new Map<string, string>();
  function walk(ns: RoadmapNode[]) {
    for (const n of ns) {
      if (n.aliasOf) map.set(n.id, n.aliasOf);
      if (n.children) walk(n.children);
    }
  }
  walk(nodes);
  return map;
}

export function resolveAliases(nodes: RoadmapNode[]): RoadmapNode[] {
  return nodes
    .filter((n) => !n.aliasOf)
    .map((n) => ({
      ...n,
      children: n.children ? resolveAliases(n.children) : undefined,
    }));
}

const rawRoadmap: RoadmapNode[] = [
  ...(backend as RoadmapNode[]),
  ...(arch as RoadmapNode[]),
  ...(devops as RoadmapNode[]),
  ...(dataAnalysis as RoadmapNode[]),
  ...(python as RoadmapNode[]),
  ...(aiAgents as RoadmapNode[]),
  ...(english as RoadmapNode[]),
  ...(aiDevTools as RoadmapNode[]),
];

const aliasMap = buildAliasMap(rawRoadmap);
const roadmap = resolveAliases(rawRoadmap);

export function getRoadmap(): RoadmapNode[] {
  return roadmap;
}

export function getRawRoadmap(): RoadmapNode[] {
  return rawRoadmap;
}

export function getAliasMap(): Map<string, string> {
  return aliasMap;
}

export function getAllNodeIds(): string[] {
  const ids: string[] = [];
  function collect(nodes: RoadmapNode[]) {
    for (const node of nodes) {
      ids.push(node.id);
      if (node.children) collect(node.children);
    }
  }
  collect(roadmap);
  return ids;
}

export function findNode(id: string): RoadmapNode | null {
  function search(nodes: RoadmapNode[]): RoadmapNode | null {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = search(node.children);
        if (found) return found;
      }
    }
    return null;
  }
  return search(roadmap);
}
