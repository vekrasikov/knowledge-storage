import { describe, it, expect } from "vitest";
import {
  checkUniqueIds,
  checkAliasTargets,
  checkPrereqExistence,
  checkPrereqCycles,
  checkPhaseOrderUniqueness,
  checkPhaseReferencesValid,
  checkPhaseCoverage,
  checkEveryLeafHasPhaseOrType,
  checkRecurringTopicIds,
  checkStudyPlanTopicIds,
  checkTopicContentIds,
  checkVisualizationImageExists,
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

describe("checkPhaseReferencesValid", () => {
  it("ok when all phase values match path.phases", () => {
    const nodes = [{ id: "a", title: "A", phase: "p1" }];
    const phases = new Set(["p1", "p2"]);
    expect(checkPhaseReferencesValid(nodes, phases)).toEqual([]);
  });
  it("errors on unknown phase value", () => {
    const nodes = [{ id: "a", title: "A", phase: "nope" }];
    const phases = new Set(["p1"]);
    expect(checkPhaseReferencesValid(nodes, phases)[0]).toContain("nope");
  });
});

describe("checkPhaseCoverage", () => {
  it("ok when every declared phase is referenced", () => {
    const nodes = [{ id: "a", title: "A", phase: "p1" }];
    expect(checkPhaseCoverage(nodes, ["p1"])).toEqual([]);
  });
  it("errors on orphan phase", () => {
    const nodes = [{ id: "a", title: "A", phase: "p1" }];
    expect(checkPhaseCoverage(nodes, ["p1", "p2"])[0]).toContain("p2");
  });
});

describe("checkEveryLeafHasPhaseOrType", () => {
  it("ok for recurring type without phase", () => {
    const nodes = [{ id: "a", title: "A", type: "recurring" as const }];
    expect(checkEveryLeafHasPhaseOrType(nodes)).toEqual([]);
  });
  it("ok for leaf with phase", () => {
    const nodes = [{ id: "a", title: "A", phase: "p1" }];
    expect(checkEveryLeafHasPhaseOrType(nodes)).toEqual([]);
  });
  it("errors on leaf without phase and no type override", () => {
    const nodes = [{ id: "a", title: "A" }];
    expect(checkEveryLeafHasPhaseOrType(nodes)[0]).toContain("a");
  });
  it("does not error on group node (has children)", () => {
    const nodes = [{ id: "a", title: "A", children: [{ id: "b", title: "B", phase: "p1" }] }];
    expect(checkEveryLeafHasPhaseOrType(nodes)).toEqual([]);
  });
  it("does not error on alias node", () => {
    const nodes = [
      { id: "a", title: "A", aliasOf: "b" },
      { id: "b", title: "B", phase: "p1" },
    ];
    expect(checkEveryLeafHasPhaseOrType(nodes)).toEqual([]);
  });
});

describe("checkRecurringTopicIds", () => {
  it("ok when all recurring ids exist", () => {
    const nodes = [{ id: "a", title: "A" }];
    expect(checkRecurringTopicIds(nodes, ["a"])).toEqual([]);
  });
  it("errors on unknown recurring id", () => {
    const nodes = [{ id: "a", title: "A" }];
    expect(checkRecurringTopicIds(nodes, ["nope"])[0]).toContain("nope");
  });
});

describe("checkStudyPlanTopicIds", () => {
  it("ok when all study-plan topicIds resolve (directly or via alias)", () => {
    const nodes = [
      { id: "canonical", title: "C" },
      { id: "alias", title: "A", aliasOf: "canonical" },
    ];
    expect(checkStudyPlanTopicIds(nodes, ["canonical", "alias"])).toEqual([]);
  });
  it("errors on unknown study-plan topicId", () => {
    const nodes = [{ id: "a", title: "A" }];
    expect(checkStudyPlanTopicIds(nodes, ["missing"])[0]).toContain("missing");
  });
});

describe("checkTopicContentIds", () => {
  it("ok when all content ids reference canonical roadmap topics", () => {
    const roadmap: RoadmapNode[] = [{ id: "gc-g1", title: "G1" }];
    expect(checkTopicContentIds(roadmap, ["gc-g1"])).toEqual([]);
  });

  it("errors on orphan content id (no matching roadmap topic)", () => {
    const roadmap: RoadmapNode[] = [{ id: "gc-g1", title: "G1" }];
    const errors = checkTopicContentIds(roadmap, ["ghost-topic"]);
    expect(errors[0]).toContain("ghost-topic");
  });

  it("errors when content id targets an alias instead of canonical", () => {
    const roadmap: RoadmapNode[] = [
      { id: "canonical", title: "C" },
      { id: "alias", title: "A", aliasOf: "canonical" },
    ];
    const errors = checkTopicContentIds(roadmap, ["alias"]);
    expect(errors[0]).toContain("alias");
    expect(errors[0]).toContain("canonical");
  });
});

describe("checkVisualizationImageExists", () => {
  it("ok when all visualization images exist", () => {
    const loaded = [
      {
        filename: "foo.md",
        content: {
          id: "foo",
          visualization: { type: "image" as const, src: "/exists.svg", alt: "x" },
        },
      },
    ];
    const publicFiles = new Set(["/exists.svg"]);
    expect(checkVisualizationImageExists(loaded, publicFiles)).toEqual([]);
  });

  it("errors on missing image file", () => {
    const loaded = [
      {
        filename: "foo.md",
        content: {
          id: "foo",
          visualization: { type: "image" as const, src: "/missing.svg", alt: "x" },
        },
      },
    ];
    const errors = checkVisualizationImageExists(loaded, new Set<string>());
    expect(errors[0]).toContain("/missing.svg");
  });

  it("skips topics with mermaid or no visualization", () => {
    const loaded = [
      { filename: "a.md", content: { id: "a" } },
      {
        filename: "b.md",
        content: {
          id: "b",
          visualization: { type: "mermaid" as const, content: "graph LR", alt: "x" },
        },
      },
    ];
    expect(checkVisualizationImageExists(loaded, new Set<string>())).toEqual([]);
  });
});
