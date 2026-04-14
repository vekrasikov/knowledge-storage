import { describe, it, expect } from "vitest";
import { getRoadmap, getAllNodeIds, findNode } from "../../data/roadmap";

describe("roadmap", () => {
  it("getRoadmap returns array of root directions", () => {
    const roadmap = getRoadmap();
    expect(roadmap).toBeInstanceOf(Array);
    expect(roadmap.length).toBeGreaterThan(0);
    expect(roadmap[0]).toHaveProperty("id");
    expect(roadmap[0]).toHaveProperty("title");
  });

  it("getAllNodeIds returns flat list of all node IDs", () => {
    const ids = getAllNodeIds();
    expect(ids).toContain("backend");
    expect(ids).toContain("virtual-threads");
    expect(ids).toContain("english");
  });

  it("findNode finds a nested node by id", () => {
    const node = findNode("virtual-threads");
    expect(node).not.toBeNull();
    expect(node!.title).toBe("Virtual Threads & Structured Concurrency");
  });

  it("findNode returns null for unknown id", () => {
    expect(findNode("nonexistent")).toBeNull();
  });
});
