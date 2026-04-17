import { describe, it, expect } from "vitest";
import type {
  TopicContent,
  CheatSheet,
  CapacityPlanning,
  Visualization,
  CapacityInput,
} from "../types";

describe("Project B content types", () => {
  it("accepts a fully-populated TopicContent", () => {
    const cs: CheatSheet = {
      key_facts: ["fact 1"],
      commands: ["cmd 1"],
      trade_offs: { headers: ["A", "B"], rows: [["1", "2"]] },
      pitfalls: ["p1"],
      interview_questions: ["q1"],
      extras_markdown: "### Notes",
    };
    const cp: CapacityPlanning = {
      inputs: [{ name: "DAU", value: "1M", unit: "users" } satisfies CapacityInput],
      formulas: ["RPS = DAU / 86400"],
      worked_example: "...",
      numbers_to_memorize: ["1 day ≈ 86400s"],
    };
    const viz: Visualization = {
      type: "mermaid",
      content: "graph LR\n A --> B",
      alt: "A to B",
    };
    const t: TopicContent = {
      id: "x",
      overview: "# Overview\nBody",
      cheat_sheet: cs,
      capacity_planning: cp,
      visualization: viz,
    };
    expect(t.id).toBe("x");
    expect(t.cheat_sheet?.trade_offs?.rows).toHaveLength(1);
    expect(t.capacity_planning?.inputs).toHaveLength(1);
  });

  it("accepts image-variant visualization", () => {
    const viz: Visualization = {
      type: "image",
      src: "/visualizations/foo.svg",
      alt: "Diagram",
    };
    expect(viz.src).toBe("/visualizations/foo.svg");
  });

  it("accepts a TopicContent with only id (all other fields optional)", () => {
    const t: TopicContent = { id: "x" };
    expect(t.id).toBe("x");
    expect(t.overview).toBeUndefined();
  });
});
