import { describe, it, expect } from "vitest";
import {
  checkUniqueIds,
  checkAliasTargets,
  checkPrereqExistence,
  checkPrereqCycles,
  checkPhaseOrderUniqueness,
} from "../../scripts/roadmap-validator";
import type { RoadmapNode } from "../types";

describe("checkUniqueIds", () => {
  it("returns empty errors when IDs are unique", () => {
    const nodes: RoadmapNode[] = [
      { id: "a", title: "A", children: [{ id: "b", title: "B" }] },
      { id: "c", title: "C" },
    ];
    expect(checkUniqueIds(nodes)).toEqual([]);
  });

  it("reports duplicate IDs with occurrence count", () => {
    const nodes: RoadmapNode[] = [
      { id: "a", title: "A", children: [{ id: "dup", title: "D1" }] },
      { id: "c", title: "C", children: [{ id: "dup", title: "D2" }] },
    ];
    const errors = checkUniqueIds(nodes);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("dup");
    expect(errors[0]).toContain("2 times");
  });
});

describe("checkAliasTargets", () => {
  it("ok when aliasOf points to existing id", () => {
    const nodes = [
      { id: "a", title: "A" },
      { id: "b", title: "B", aliasOf: "a" },
    ];
    expect(checkAliasTargets(nodes)).toEqual([]);
  });
  it("errors when aliasOf points to unknown id", () => {
    const nodes = [{ id: "b", title: "B", aliasOf: "nope" }];
    const errors = checkAliasTargets(nodes);
    expect(errors[0]).toContain("nope");
  });
  it("errors when alias points to another alias", () => {
    const nodes = [
      { id: "a", title: "A", aliasOf: "b" },
      { id: "b", title: "B", aliasOf: "c" },
      { id: "c", title: "C" },
    ];
    const errors = checkAliasTargets(nodes);
    expect(errors[0]).toContain("chain");
  });
});

describe("checkPrereqExistence", () => {
  it("ok when prereqs exist and are not aliases", () => {
    const nodes = [
      { id: "a", title: "A" },
      { id: "b", title: "B", prerequisites: ["a"] },
    ];
    expect(checkPrereqExistence(nodes)).toEqual([]);
  });
  it("errors on unknown prereq", () => {
    const nodes = [{ id: "b", title: "B", prerequisites: ["missing"] }];
    expect(checkPrereqExistence(nodes)[0]).toContain("missing");
  });
  it("errors when prereq is an alias", () => {
    const nodes = [
      { id: "a", title: "A", aliasOf: "c" },
      { id: "c", title: "C" },
      { id: "b", title: "B", prerequisites: ["a"] },
    ];
    expect(checkPrereqExistence(nodes)[0]).toContain("alias");
  });
});

describe("checkPrereqCycles", () => {
  it("ok on DAG", () => {
    const nodes = [
      { id: "a", title: "A" },
      { id: "b", title: "B", prerequisites: ["a"] },
      { id: "c", title: "C", prerequisites: ["a", "b"] },
    ];
    expect(checkPrereqCycles(nodes)).toEqual([]);
  });
  it("detects cycle", () => {
    const nodes = [
      { id: "a", title: "A", prerequisites: ["b"] },
      { id: "b", title: "B", prerequisites: ["a"] },
    ];
    expect(checkPrereqCycles(nodes)[0]).toContain("cycle");
  });

  it("detects self-loop cycle", () => {
    const nodes = [{ id: "a", title: "A", prerequisites: ["a"] }];
    const errors = checkPrereqCycles(nodes);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("a -> a");
  });

  it("does not emit phantom cycle for DAG nodes reachable from a cyclic component", () => {
    // a <-> b form a cycle; d is a DAG node that depends on a.
    // Previous early-return bug would wrongly flag d -> a as a cycle.
    const nodes = [
      { id: "a", title: "A", prerequisites: ["b"] },
      { id: "b", title: "B", prerequisites: ["a"] },
      { id: "d", title: "D", prerequisites: ["a"] },
    ];
    const errors = checkPrereqCycles(nodes);
    // Exactly one cycle reported (a <-> b), no phantom involving d.
    expect(errors).toHaveLength(1);
    expect(errors.join()).not.toContain("d ->");
  });

  it("handles unknown prereq without throwing", () => {
    const nodes = [{ id: "a", title: "A", prerequisites: ["ghost"] }];
    expect(() => checkPrereqCycles(nodes)).not.toThrow();
    expect(checkPrereqCycles(nodes)).toEqual([]);
  });
});

describe("checkPhaseOrderUniqueness", () => {
  it("ok when phaseOrder values are distinct per phase", () => {
    const nodes = [
      { id: "a", title: "A", phase: "p1", phaseOrder: 10 },
      { id: "b", title: "B", phase: "p1", phaseOrder: 20 },
      { id: "c", title: "C", phase: "p2", phaseOrder: 10 },
    ];
    expect(checkPhaseOrderUniqueness(nodes)).toEqual([]);
  });
  it("errors on duplicate phaseOrder within same phase", () => {
    const nodes = [
      { id: "a", title: "A", phase: "p1", phaseOrder: 10 },
      { id: "b", title: "B", phase: "p1", phaseOrder: 10 },
    ];
    expect(checkPhaseOrderUniqueness(nodes)[0]).toContain("phaseOrder");
  });
});
