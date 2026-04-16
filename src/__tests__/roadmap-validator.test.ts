import { describe, it, expect } from "vitest";
import { checkUniqueIds } from "../../scripts/roadmap-validator";
import type { RoadmapNode } from "../types";

describe("checkUniqueIds", () => {
  it("returns empty errors when IDs are unique", () => {
    const nodes: RoadmapNode[] = [
      { id: "a", title: "A", children: [{ id: "b", title: "B" }] },
      { id: "c", title: "C" },
    ];
    expect(checkUniqueIds(nodes)).toEqual([]);
  });

  it("reports duplicate IDs with paths", () => {
    const nodes: RoadmapNode[] = [
      { id: "a", title: "A", children: [{ id: "dup", title: "D1" }] },
      { id: "c", title: "C", children: [{ id: "dup", title: "D2" }] },
    ];
    const errors = checkUniqueIds(nodes);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("dup");
  });
});
