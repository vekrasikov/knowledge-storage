import { describe, it, expect } from "vitest";
import { parseTopicContent, ValidationError } from "../../utils/topicContentFrontmatter";

describe("parseTopicContent", () => {
  it("parses minimal valid file (id + overview body)", () => {
    const raw = `---
id: gc-g1
---

# Overview

Body text.`;
    const result = parseTopicContent(raw, "gc-g1.md");
    expect(result.id).toBe("gc-g1");
    expect(result.overview).toContain("# Overview");
    expect(result.overview).toContain("Body text.");
    expect(result.cheat_sheet).toBeUndefined();
  });

  it("parses full frontmatter shape", () => {
    const raw = `---
id: foo
cheat_sheet:
  key_facts:
    - "fact one"
  trade_offs:
    headers: [A, B]
    rows:
      - [1, 2]
capacity_planning:
  inputs:
    - { name: DAU, value: "1M", unit: users }
  formulas:
    - "RPS = DAU / 86400"
  worked_example: "11.6 RPS"
  numbers_to_memorize:
    - "1 day ≈ 86400s"
visualization:
  type: mermaid
  content: "graph LR\\n A --> B"
  alt: "A to B"
---

Body.`;
    const result = parseTopicContent(raw, "foo.md");
    expect(result.cheat_sheet?.key_facts).toEqual(["fact one"]);
    expect(result.cheat_sheet?.trade_offs?.rows).toEqual([["1", "2"]]);
    expect(result.capacity_planning?.inputs[0].name).toBe("DAU");
    expect(result.visualization?.type).toBe("mermaid");
  });

  it("omits empty overview when body is blank", () => {
    const raw = `---
id: foo
capacity_planning:
  inputs: []
  formulas: []
  worked_example: ""
  numbers_to_memorize: []
---
`;
    const result = parseTopicContent(raw, "foo.md");
    expect(result.overview).toBeUndefined();
  });

  it("throws ValidationError on missing id", () => {
    const raw = `---
cheat_sheet:
  key_facts: []
---

Body.`;
    expect(() => parseTopicContent(raw, "bad.md")).toThrow(ValidationError);
    expect(() => parseTopicContent(raw, "bad.md")).toThrow(/missing id/i);
  });

  it("throws ValidationError on mismatched trade_offs row width", () => {
    const raw = `---
id: foo
cheat_sheet:
  trade_offs:
    headers: [A, B, C]
    rows:
      - [1, 2]
---`;
    expect(() => parseTopicContent(raw, "foo.md")).toThrow(/trade_offs/i);
  });

  it("throws ValidationError on visualization.type=mermaid without content", () => {
    const raw = `---
id: foo
visualization:
  type: mermaid
  alt: missing content
---`;
    expect(() => parseTopicContent(raw, "foo.md")).toThrow(/visualization.*content/i);
  });

  it("throws ValidationError on visualization.type=image without src", () => {
    const raw = `---
id: foo
visualization:
  type: image
  alt: missing src
---`;
    expect(() => parseTopicContent(raw, "foo.md")).toThrow(/visualization.*src/i);
  });
});
