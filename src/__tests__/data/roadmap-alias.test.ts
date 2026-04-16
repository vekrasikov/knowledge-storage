import { describe, it, expect } from "vitest";
import { resolveAliases, buildAliasMap } from "../../data/roadmap";
import type { RoadmapNode } from "../../types";

describe("resolveAliases", () => {
  it("removes alias nodes from tree", () => {
    const input: RoadmapNode[] = [
      {
        id: "root",
        title: "Root",
        children: [
          { id: "canonical", title: "Canonical" },
          { id: "alias", title: "Alias", aliasOf: "canonical" },
        ],
      },
    ];
    const out = resolveAliases(input);
    const leafIds = out[0].children!.map((c) => c.id);
    expect(leafIds).toEqual(["canonical"]);
  });
});

describe("buildAliasMap", () => {
  it("returns map alias -> canonical", () => {
    const input: RoadmapNode[] = [
      { id: "a", title: "A" },
      { id: "b", title: "B", aliasOf: "a" },
      { id: "c", title: "C", aliasOf: "a" },
    ];
    const map = buildAliasMap(input);
    expect(map.get("b")).toBe("a");
    expect(map.get("c")).toBe("a");
    expect(map.has("a")).toBe(false);
  });
});
