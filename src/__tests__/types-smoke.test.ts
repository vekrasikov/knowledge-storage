import { describe, it, expect } from "vitest";
import type { RoadmapNode } from "../types";

describe("RoadmapNode extended shape", () => {
  it("accepts prerequisites, phase, phaseOrder, aliasOf, type", () => {
    const node: RoadmapNode = {
      id: "x",
      title: "X",
      prerequisites: ["y"],
      phase: "phase-1-programming",
      phaseOrder: 10,
      aliasOf: "z",
      type: "reference",
    };
    expect(node.prerequisites).toEqual(["y"]);
    expect(node.phase).toBe("phase-1-programming");
    expect(node.phaseOrder).toBe(10);
    expect(node.aliasOf).toBe("z");
    expect(node.type).toBe("reference");
  });
});
