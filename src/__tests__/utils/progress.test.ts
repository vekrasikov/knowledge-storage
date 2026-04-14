import { describe, it, expect } from "vitest";
import { calcProgress, calcDirectionProgress } from "../../utils/progress";
import type { RoadmapNode } from "../../types";
import { EMPTY_USER_DATA } from "../../utils/storage";

const testTree: RoadmapNode[] = [
  {
    id: "backend",
    title: "Backend",
    children: [
      {
        id: "java",
        title: "Java",
        children: [
          { id: "threads", title: "Threads" },
          { id: "streams", title: "Streams" },
        ],
      },
      { id: "spring", title: "Spring" },
    ],
  },
];

describe("calcProgress", () => {
  it("returns 0 for empty progress", () => {
    const result = calcProgress(testTree[0], EMPTY_USER_DATA.progress);
    expect(result).toEqual({ total: 3, done: 0, percentage: 0 });
  });

  it("counts only leaf nodes as total", () => {
    const result = calcProgress(testTree[0], EMPTY_USER_DATA.progress);
    expect(result.total).toBe(3);
  });

  it("counts done leaf nodes", () => {
    const progress = { threads: "done" as const, spring: "done" as const };
    const result = calcProgress(testTree[0], progress);
    expect(result).toEqual({ total: 3, done: 2, percentage: 67 });
  });

  it("handles node with no children as single leaf", () => {
    const leaf: RoadmapNode = { id: "solo", title: "Solo" };
    const progress = { solo: "done" as const };
    expect(calcProgress(leaf, progress)).toEqual({
      total: 1,
      done: 1,
      percentage: 100,
    });
  });
});

describe("calcDirectionProgress", () => {
  it("returns progress for all directions", () => {
    const progress = { threads: "done" as const };
    const result = calcDirectionProgress(testTree, progress);
    expect(result).toEqual([
      { id: "backend", title: "Backend", total: 3, done: 1, percentage: 33 },
    ]);
  });
});
