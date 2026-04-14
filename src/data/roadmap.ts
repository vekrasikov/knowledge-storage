import rawData from "../../data/roadmap.yaml";
import type { RoadmapNode } from "../types";

const roadmap: RoadmapNode[] = rawData as RoadmapNode[];

export function getRoadmap(): RoadmapNode[] {
  return roadmap;
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
