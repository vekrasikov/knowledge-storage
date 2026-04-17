# Project B — Topic Content Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four optional content layers per topic (overview, cheat_sheet, visualization, capacity_planning), stored as markdown files with YAML frontmatter in `data/topics/`, rendered as accordion sections in TopicDetail, with ~25 fully-authored pilot topics + 8 capacity-only files.

**Architecture:** Content lives in `data/topics/<id>.md` — frontmatter holds structured fields (cheat_sheet, capacity_planning, visualization metadata); markdown body is `overview`. A pure frontmatter parser module is shared by the UI loader (Vite `import.meta.glob`) and the CLI validator loader (`fs.readdirSync`). UI renders each section in a generic `TopicAccordionSection` with localStorage-backed expand state. Mermaid is lazy-loaded so initial bundle stays lean.

**Tech Stack:** React 19, Vite 8, TypeScript, Vitest 4, gray-matter (frontmatter parser), mermaid (lazy-loaded client renderer), react-markdown (already present).

**Reference spec:** [`docs/superpowers/specs/2026-04-17-project-b-topic-enrichment-design.md`](../specs/2026-04-17-project-b-topic-enrichment-design.md)

---

## Task 1 — Add content types to `src/types.ts`

**Files:**
- Modify: `src/types.ts` (append at bottom)
- Create: `src/__tests__/topic-content-types.test.ts`

- [ ] **Step 1.1: Write failing smoke test**

Create `src/__tests__/topic-content-types.test.ts`:

```typescript
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
      inputs: [{ name: "DAU", value: "1M", unit: "users" }],
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
```

- [ ] **Step 1.2: Run to verify failure**

Run: `npm test -- src/__tests__/topic-content-types.test.ts`
Expected: FAIL with "has no exported member" errors.

- [ ] **Step 1.3: Append types to `src/types.ts`**

At the bottom of `src/types.ts`, append:

```typescript
export interface CheatSheet {
  key_facts?: string[];
  commands?: string[];
  trade_offs?: { headers: string[]; rows: string[][] };
  pitfalls?: string[];
  interview_questions?: string[];
  extras_markdown?: string;
}

export interface CapacityInput {
  name: string;
  value: string;
  unit: string;
}

export interface CapacityPlanning {
  inputs: CapacityInput[];
  formulas: string[];
  worked_example: string;
  numbers_to_memorize: string[];
}

export interface Visualization {
  type: "mermaid" | "image";
  content?: string;   // when type=mermaid
  src?: string;       // when type=image (path relative to /public)
  alt: string;
}

export interface TopicContent {
  id: string;
  overview?: string;
  cheat_sheet?: CheatSheet;
  capacity_planning?: CapacityPlanning;
  visualization?: Visualization;
}
```

- [ ] **Step 1.4: Run test to verify pass**

Run: `npm test -- src/__tests__/topic-content-types.test.ts`
Expected: PASS.

Run: `npm test`
Expected: all previous suites still pass.

- [ ] **Step 1.5: Commit**

```bash
git add src/types.ts src/__tests__/topic-content-types.test.ts
git commit -m "feat(types): add TopicContent, CheatSheet, CapacityPlanning, Visualization"
```

---

## Task 2 — Install `gray-matter` + pure frontmatter parser utility

**Files:**
- Modify: `package.json` (add dep)
- Create: `src/utils/topicContentFrontmatter.ts`
- Create: `src/__tests__/utils/topicContentFrontmatter.test.ts`

- [ ] **Step 2.1: Install gray-matter**

Run:

```bash
npm install gray-matter
```

- [ ] **Step 2.2: Write failing test**

Create `src/__tests__/utils/topicContentFrontmatter.test.ts`:

```typescript
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
    expect(() => parseTopicContent(raw, "foo.md")).toThrow(/visualization.*mermaid.*content/i);
  });

  it("throws ValidationError on visualization.type=image without src", () => {
    const raw = `---
id: foo
visualization:
  type: image
  alt: missing src
---`;
    expect(() => parseTopicContent(raw, "foo.md")).toThrow(/visualization.*image.*src/i);
  });
});
```

- [ ] **Step 2.3: Run to verify failure**

Run: `npm test -- src/__tests__/utils/topicContentFrontmatter.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 2.4: Implement parser**

Create `src/utils/topicContentFrontmatter.ts`:

```typescript
import matter from "gray-matter";
import type {
  TopicContent,
  CheatSheet,
  CapacityPlanning,
  Visualization,
  CapacityInput,
} from "../types";

export class ValidationError extends Error {
  constructor(public filename: string, public field: string, message: string) {
    super(`[${filename}] ${field}: ${message}`);
    this.name = "ValidationError";
  }
}

function asStringArray(v: unknown, filename: string, field: string): string[] | undefined {
  if (v === undefined) return undefined;
  if (!Array.isArray(v)) throw new ValidationError(filename, field, "must be an array");
  return v.map((x) => String(x));
}

function parseCheatSheet(raw: unknown, filename: string): CheatSheet | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== "object" || raw === null) {
    throw new ValidationError(filename, "cheat_sheet", "must be an object");
  }
  const r = raw as Record<string, unknown>;
  const cs: CheatSheet = {};
  cs.key_facts = asStringArray(r.key_facts, filename, "cheat_sheet.key_facts");
  cs.commands = asStringArray(r.commands, filename, "cheat_sheet.commands");
  cs.pitfalls = asStringArray(r.pitfalls, filename, "cheat_sheet.pitfalls");
  cs.interview_questions = asStringArray(r.interview_questions, filename, "cheat_sheet.interview_questions");
  if (typeof r.extras_markdown === "string") cs.extras_markdown = r.extras_markdown;

  if (r.trade_offs !== undefined) {
    const t = r.trade_offs as Record<string, unknown>;
    const headers = asStringArray(t.headers, filename, "cheat_sheet.trade_offs.headers") ?? [];
    const rawRows = t.rows;
    if (!Array.isArray(rawRows)) {
      throw new ValidationError(filename, "cheat_sheet.trade_offs.rows", "must be an array of arrays");
    }
    const rows = rawRows.map((row, i) => {
      if (!Array.isArray(row)) {
        throw new ValidationError(filename, `cheat_sheet.trade_offs.rows[${i}]`, "must be an array");
      }
      if (row.length !== headers.length) {
        throw new ValidationError(
          filename,
          `cheat_sheet.trade_offs.rows[${i}]`,
          `has ${row.length} cells but headers has ${headers.length}`
        );
      }
      return row.map((cell) => String(cell));
    });
    cs.trade_offs = { headers, rows };
  }
  return cs;
}

function parseCapacityPlanning(raw: unknown, filename: string): CapacityPlanning | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== "object" || raw === null) {
    throw new ValidationError(filename, "capacity_planning", "must be an object");
  }
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.inputs)) {
    throw new ValidationError(filename, "capacity_planning.inputs", "must be an array");
  }
  const inputs: CapacityInput[] = r.inputs.map((x, i) => {
    if (typeof x !== "object" || x === null) {
      throw new ValidationError(filename, `capacity_planning.inputs[${i}]`, "must be an object");
    }
    const o = x as Record<string, unknown>;
    return {
      name: String(o.name ?? ""),
      value: String(o.value ?? ""),
      unit: String(o.unit ?? ""),
    };
  });
  return {
    inputs,
    formulas: asStringArray(r.formulas, filename, "capacity_planning.formulas") ?? [],
    worked_example: typeof r.worked_example === "string" ? r.worked_example : "",
    numbers_to_memorize:
      asStringArray(r.numbers_to_memorize, filename, "capacity_planning.numbers_to_memorize") ?? [],
  };
}

function parseVisualization(raw: unknown, filename: string): Visualization | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== "object" || raw === null) {
    throw new ValidationError(filename, "visualization", "must be an object");
  }
  const r = raw as Record<string, unknown>;
  const type = r.type;
  if (type !== "mermaid" && type !== "image") {
    throw new ValidationError(filename, "visualization.type", 'must be "mermaid" or "image"');
  }
  const alt = typeof r.alt === "string" ? r.alt : undefined;
  if (!alt) throw new ValidationError(filename, "visualization.alt", "is required");

  if (type === "mermaid") {
    if (typeof r.content !== "string" || r.content.trim() === "") {
      throw new ValidationError(filename, "visualization.content", "required when type is mermaid");
    }
    return { type, content: r.content, alt };
  }
  if (typeof r.src !== "string" || r.src.trim() === "") {
    throw new ValidationError(filename, "visualization.src", "required when type is image");
  }
  return { type, src: r.src, alt };
}

export function parseTopicContent(raw: string, filename: string): TopicContent {
  const { data, content } = matter(raw);
  if (typeof data.id !== "string" || data.id.trim() === "") {
    throw new ValidationError(filename, "id", "missing id in frontmatter");
  }
  const body = content.trim();
  return {
    id: data.id,
    overview: body === "" ? undefined : body,
    cheat_sheet: parseCheatSheet(data.cheat_sheet, filename),
    capacity_planning: parseCapacityPlanning(data.capacity_planning, filename),
    visualization: parseVisualization(data.visualization, filename),
  };
}
```

- [ ] **Step 2.5: Run test to verify pass**

Run: `npm test -- src/__tests__/utils/topicContentFrontmatter.test.ts`
Expected: PASS — all 7 tests green.

- [ ] **Step 2.6: Commit**

```bash
git add package.json package-lock.json src/utils/topicContentFrontmatter.ts src/__tests__/utils/topicContentFrontmatter.test.ts
git commit -m "feat(content): add gray-matter-based topic content frontmatter parser"
```

---

## Task 3 — UI-side topic content loader

**Files:**
- Create: `src/data/topicContent.ts`
- Create: `src/__tests__/data/topicContent.test.ts`
- Create: `data/topics/.gitkeep` (empty placeholder so directory exists)

- [ ] **Step 3.1: Create empty topics dir**

Run:

```bash
mkdir -p /Users/user1/personal/repos/knowledge-storage/data/topics
touch /Users/user1/personal/repos/knowledge-storage/data/topics/.gitkeep
```

- [ ] **Step 3.2: Write failing test**

Create `src/__tests__/data/topicContent.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { getTopicContent, getAllTopicContentIds, buildContentMap } from "../../data/topicContent";
import type { TopicContent } from "../../types";

describe("buildContentMap", () => {
  it("returns empty map when no files", () => {
    const map = buildContentMap({});
    expect(map.size).toBe(0);
  });

  it("parses raw markdown entries into map keyed by id", () => {
    const files = {
      "/data/topics/a.md": `---
id: topic-a
---

# A body`,
      "/data/topics/b.md": `---
id: topic-b
---

# B body`,
    };
    const map = buildContentMap(files);
    expect(map.size).toBe(2);
    expect(map.get("topic-a")?.overview).toContain("A body");
    expect(map.get("topic-b")?.overview).toContain("B body");
  });

  it("throws on parse error in any file", () => {
    const files = {
      "/data/topics/bad.md": `---\n---\n`, // missing id
    };
    expect(() => buildContentMap(files)).toThrow();
  });
});

describe("getTopicContent (with alias resolution)", () => {
  const contentMap = new Map<string, TopicContent>([
    ["canonical", { id: "canonical", overview: "real" }],
  ]);

  it("returns content for canonical id", () => {
    const aliasMap = new Map<string, string>();
    expect(getTopicContent("canonical", contentMap, aliasMap)?.overview).toBe("real");
  });

  it("redirects alias to canonical content", () => {
    const aliasMap = new Map<string, string>([["alias", "canonical"]]);
    expect(getTopicContent("alias", contentMap, aliasMap)?.overview).toBe("real");
  });

  it("returns null for unknown id", () => {
    expect(getTopicContent("missing", contentMap, new Map())).toBeNull();
  });
});
```

- [ ] **Step 3.3: Run to verify failure**

Run: `npm test -- src/__tests__/data/topicContent.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3.4: Implement loader**

Create `src/data/topicContent.ts`:

```typescript
import { parseTopicContent } from "../utils/topicContentFrontmatter";
import type { TopicContent } from "../types";

// Raw markdown files eagerly imported from data/topics/
// eager:true so the map is ready synchronously at module load.
const rawFiles = import.meta.glob("/data/topics/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export function buildContentMap(
  files: Record<string, string>
): Map<string, TopicContent> {
  const map = new Map<string, TopicContent>();
  for (const [path, raw] of Object.entries(files)) {
    const filename = path.split("/").pop() ?? path;
    const content = parseTopicContent(raw, filename);
    map.set(content.id, content);
  }
  return map;
}

const contentMap = buildContentMap(rawFiles);

export function getTopicContent(
  id: string,
  map: Map<string, TopicContent> = contentMap,
  aliasMap: Map<string, string> = new Map()
): TopicContent | null {
  const canonical = aliasMap.get(id) ?? id;
  return map.get(canonical) ?? null;
}

export function getAllTopicContentIds(): string[] {
  return Array.from(contentMap.keys());
}
```

- [ ] **Step 3.5: Run test to verify pass**

Run: `npm test -- src/__tests__/data/topicContent.test.ts`
Expected: PASS.

Run: `npm test`
Expected: all other suites still pass.

- [ ] **Step 3.6: Commit**

```bash
git add src/data/topicContent.ts src/__tests__/data/topicContent.test.ts data/topics/.gitkeep
git commit -m "feat(content): add Vite-side topic content loader with alias resolution"
```

---

## Task 4 — CLI-side topic content loader

**Files:**
- Create: `scripts/load-topic-content.ts`
- Modify: `scripts/load-roadmap-yaml.ts` (export helper to read `data/topics/*.md` directory listing for validator use)

- [ ] **Step 4.1: Implement CLI loader**

Create `scripts/load-topic-content.ts`:

```typescript
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseTopicContent } from "../src/utils/topicContentFrontmatter";
import type { TopicContent } from "../src/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOPICS_DIR = join(__dirname, "..", "data", "topics");

export interface LoadedTopicFile {
  filename: string;
  content: TopicContent;
}

export function loadAllTopicContent(): LoadedTopicFile[] {
  let entries: string[];
  try {
    entries = readdirSync(TOPICS_DIR);
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read data/topics/: ${cause}`);
  }
  const mdFiles = entries.filter((f) => f.endsWith(".md"));
  const out: LoadedTopicFile[] = [];
  for (const filename of mdFiles) {
    const path = join(TOPICS_DIR, filename);
    let raw: string;
    try {
      raw = readFileSync(path, "utf-8");
    } catch (err) {
      const cause = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to read ${filename}: ${cause}`);
    }
    const content = parseTopicContent(raw, filename);
    out.push({ filename, content });
  }
  return out;
}

export function getTopicContentIdsFromDisk(): string[] {
  return loadAllTopicContent().map((f) => f.content.id);
}
```

- [ ] **Step 4.2: Smoke-test via CLI**

Run:

```bash
npx tsx -e "import('./scripts/load-topic-content.ts').then(m => console.log(m.loadAllTopicContent()))"
```

Expected: empty array `[]` (since `data/topics/` only contains `.gitkeep`). No errors.

- [ ] **Step 4.3: Commit**

```bash
git add scripts/load-topic-content.ts
git commit -m "feat(content): add CLI-side topic content loader"
```

---

## Task 5 — Validator rules for topic content

**Files:**
- Modify: `scripts/roadmap-validator.ts` (append 3 new exported functions)
- Modify: `scripts/validate-roadmap.ts` (wire new rules)
- Modify: `src/__tests__/roadmap-validator.test.ts` (add tests)

- [ ] **Step 5.1: Write failing tests**

Append to `src/__tests__/roadmap-validator.test.ts`:

```typescript
import {
  checkTopicContentIds,
  checkVisualizationImageExists,
} from "../../scripts/roadmap-validator";

describe("checkTopicContentIds", () => {
  it("ok when all content ids reference canonical roadmap topics", () => {
    const roadmap = [{ id: "gc-g1", title: "G1" }];
    const contentIds = ["gc-g1"];
    expect(checkTopicContentIds(roadmap, contentIds)).toEqual([]);
  });

  it("errors on orphan content id (no matching roadmap topic)", () => {
    const roadmap = [{ id: "gc-g1", title: "G1" }];
    const contentIds = ["ghost-topic"];
    const errors = checkTopicContentIds(roadmap, contentIds);
    expect(errors[0]).toContain("ghost-topic");
  });

  it("errors when content id targets an alias instead of canonical", () => {
    const roadmap = [
      { id: "canonical", title: "C" },
      { id: "alias", title: "A", aliasOf: "canonical" },
    ];
    const contentIds = ["alias"];
    const errors = checkTopicContentIds(roadmap, contentIds);
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
    const publicFiles = new Set<string>();
    const errors = checkVisualizationImageExists(loaded, publicFiles);
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
    expect(checkVisualizationImageExists(loaded, new Set())).toEqual([]);
  });
});
```

- [ ] **Step 5.2: Run to verify failure**

Run: `npm test -- src/__tests__/roadmap-validator.test.ts`
Expected: FAIL — missing exports.

- [ ] **Step 5.3: Implement rules**

Note: shape validation of frontmatter (arrays are arrays, trade_offs columns match, visualization type/content consistency) is done by `parseTopicContent` in `src/utils/topicContentFrontmatter.ts` (Task 2). The validator CLI invokes `loadAllTopicContent()` which calls that parser, and `ValidationError` propagates up to `main()` — so malformed frontmatter triggers a failing build without a dedicated validator rule. The two rules below cover orphan-id and missing-image concerns that the parser can't see.

Append to `scripts/roadmap-validator.ts`:

```typescript
import type { LoadedTopicFile } from "./load-topic-content";

export function checkTopicContentIds(
  nodes: RoadmapNode[],
  contentIds: string[]
): string[] {
  const flat = flattenNodes(nodes);
  const byId = new Map(flat.map((n) => [n.id, n]));
  const errors: string[] = [];
  for (const id of contentIds) {
    const node = byId.get(id);
    if (!node) {
      errors.push(`Topic content file id "${id}" does not match any roadmap topic`);
      continue;
    }
    if (node.aliasOf) {
      errors.push(
        `Topic content file id "${id}" targets an alias; use the canonical id "${node.aliasOf}" instead`
      );
    }
  }
  return errors;
}

export function checkVisualizationImageExists(
  loaded: LoadedTopicFile[],
  publicFiles: Set<string>
): string[] {
  const errors: string[] = [];
  for (const { filename, content } of loaded) {
    const viz = content.visualization;
    if (!viz || viz.type !== "image") continue;
    if (!viz.src || !publicFiles.has(viz.src)) {
      errors.push(
        `[${filename}] visualization.src "${viz.src}" not found in /public`
      );
    }
  }
  return errors;
}
```

- [ ] **Step 5.4: Wire rules into CLI**

In `scripts/validate-roadmap.ts`, replace the imports and main body to include the new checks. Update the file to:

```typescript
import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRoadmapFromYaml, loadPathFromYaml, loadStudyPlanFromYaml } from "./load-roadmap-yaml";
import { loadAllTopicContent } from "./load-topic-content";
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
} from "./roadmap-validator";

const __dirname = dirname(fileURLToPath(import.meta.url));

function listPublicFiles(): Set<string> {
  const publicDir = join(__dirname, "..", "public");
  const out = new Set<string>();
  function walk(dir: string, rel: string) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const nextRel = rel + "/" + e.name;
      if (e.isDirectory()) walk(join(dir, e.name), nextRel);
      else out.add(nextRel);
    }
  }
  walk(publicDir, "");
  return out;
}

function main() {
  const roadmap = loadRoadmapFromYaml();
  const { path } = loadPathFromYaml();
  const studyPlan = loadStudyPlanFromYaml();
  const topicFiles = loadAllTopicContent();
  const topicContentIds = topicFiles.map((f) => f.content.id);
  const publicFiles = listPublicFiles();

  const validPhases = new Set<string>([
    ...path.phases.map((p) => p.id),
    "english-phase1-activation",
    "english-phase2-immersion",
    "english-phase3-polish",
  ]);
  const studyPlanIds = studyPlan.weeks.flatMap((w) => w.days.map((d) => d.topicId));

  const errors = [
    ...checkUniqueIds(roadmap),
    ...checkAliasTargets(roadmap),
    ...checkPrereqExistence(roadmap),
    ...checkPrereqCycles(roadmap),
    ...checkPhaseOrderUniqueness(roadmap),
    ...checkPhaseReferencesValid(roadmap, validPhases),
    ...checkPhaseCoverage(roadmap, path.phases.map((p) => p.id)),
    ...checkEveryLeafHasPhaseOrType(roadmap),
    ...checkRecurringTopicIds(roadmap, path.recurring.map((r) => r.topicId)),
    ...checkStudyPlanTopicIds(roadmap, studyPlanIds),
    ...checkTopicContentIds(roadmap, topicContentIds),
    ...checkVisualizationImageExists(topicFiles, publicFiles),
  ];

  if (errors.length > 0) {
    console.error("Roadmap validation failed:");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log("Roadmap validation passed.");
}

main();
```

- [ ] **Step 5.5: Run tests + validator**

```bash
npm test -- src/__tests__/roadmap-validator.test.ts
npm run validate
```

Expected: unit tests all pass. `npm run validate` exits 0 (no content files yet → no content ids → no errors).

- [ ] **Step 5.6: Commit**

```bash
git add scripts/ src/__tests__/roadmap-validator.test.ts
git commit -m "feat(validate): add topic-content id and image-existence rules"
```

---

## Task 6 — Generic `TopicAccordionSection` + persistence hook

**Files:**
- Create: `src/hooks/useAccordionState.ts`
- Create: `src/components/TopicAccordionSection.tsx`
- Create: `src/__tests__/hooks/useAccordionState.test.tsx`
- Create: `src/__tests__/components/TopicAccordionSection.test.tsx`

- [ ] **Step 6.1: Write failing test for hook**

Create `src/__tests__/hooks/useAccordionState.test.tsx`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAccordionState } from "../../hooks/useAccordionState";

describe("useAccordionState", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("uses defaults when no persisted state", () => {
    const { result } = renderHook(() =>
      useAccordionState("topic-x", { overview: true, cheat: false })
    );
    expect(result.current.state).toEqual({ overview: true, cheat: false });
  });

  it("toggles and persists state", () => {
    const { result } = renderHook(() =>
      useAccordionState("topic-x", { overview: true, cheat: false })
    );
    act(() => result.current.toggle("cheat"));
    expect(result.current.state.cheat).toBe(true);
    // Reload simulated by rendering again with same topic id
    const { result: result2 } = renderHook(() =>
      useAccordionState("topic-x", { overview: true, cheat: false })
    );
    expect(result2.current.state.cheat).toBe(true);
  });

  it("isolates state per topic id", () => {
    const { result: a } = renderHook(() =>
      useAccordionState("topic-a", { overview: true })
    );
    const { result: b } = renderHook(() =>
      useAccordionState("topic-b", { overview: true })
    );
    act(() => a.current.toggle("overview"));
    expect(a.current.state.overview).toBe(false);
    expect(b.current.state.overview).toBe(true);
  });
});
```

- [ ] **Step 6.2: Run failing test**

Run: `npm test -- src/__tests__/hooks/useAccordionState.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 6.3: Implement hook**

Create `src/hooks/useAccordionState.ts`:

```typescript
import { useCallback, useEffect, useState } from "react";

function storageKey(topicId: string): string {
  return `topic-accordion-${topicId}`;
}

export function useAccordionState<T extends Record<string, boolean>>(
  topicId: string,
  defaults: T
) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey(topicId));
      if (raw === null) return defaults;
      const parsed = JSON.parse(raw) as Partial<T>;
      return { ...defaults, ...parsed };
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(topicId), JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }, [topicId, state]);

  const toggle = useCallback((key: keyof T) => {
    setState((s) => ({ ...s, [key]: !s[key] } as T));
  }, []);

  return { state, toggle };
}
```

- [ ] **Step 6.4: Run hook tests**

Run: `npm test -- src/__tests__/hooks/useAccordionState.test.tsx`
Expected: PASS.

- [ ] **Step 6.5: Write failing test for component**

Create `src/__tests__/components/TopicAccordionSection.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TopicAccordionSection } from "../../components/TopicAccordionSection";

describe("TopicAccordionSection", () => {
  it("renders title and children when expanded", () => {
    render(
      <TopicAccordionSection title="Overview" expanded={true} onToggle={() => {}}>
        <p>Body</p>
      </TopicAccordionSection>
    );
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("hides children when collapsed", () => {
    render(
      <TopicAccordionSection title="Overview" expanded={false} onToggle={() => {}}>
        <p>Body</p>
      </TopicAccordionSection>
    );
    expect(screen.queryByText("Body")).not.toBeInTheDocument();
  });

  it("fires onToggle when header clicked", () => {
    let called = 0;
    render(
      <TopicAccordionSection title="Overview" expanded={false} onToggle={() => called++}>
        <p>Body</p>
      </TopicAccordionSection>
    );
    fireEvent.click(screen.getByText("Overview"));
    expect(called).toBe(1);
  });
});
```

- [ ] **Step 6.6: Run failing test**

Run: `npm test -- src/__tests__/components/TopicAccordionSection.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 6.7: Implement component**

Create `src/components/TopicAccordionSection.tsx`:

```typescript
import type { ReactNode } from "react";

interface Props {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function TopicAccordionSection({ title, expanded, onToggle, children }: Props) {
  return (
    <section className="border-t border-gray-200 dark:border-gray-700">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between py-3 text-left text-lg font-semibold hover:opacity-80"
      >
        <span>{title}</span>
        <span aria-hidden className="text-sm">
          {expanded ? "▾" : "▸"}
        </span>
      </button>
      {expanded && <div className="pb-4">{children}</div>}
    </section>
  );
}
```

- [ ] **Step 6.8: Run all new tests + full suite**

```bash
npm test -- src/__tests__/hooks/useAccordionState.test.tsx src/__tests__/components/TopicAccordionSection.test.tsx
npm test
```

Expected: all pass.

- [ ] **Step 6.9: Commit**

```bash
git add src/hooks/useAccordionState.ts src/components/TopicAccordionSection.tsx src/__tests__/hooks/useAccordionState.test.tsx src/__tests__/components/TopicAccordionSection.test.tsx
git commit -m "feat(ui): add TopicAccordionSection and useAccordionState with persistence"
```

---

## Task 7 — OverviewSection component

**Files:**
- Create: `src/components/OverviewSection.tsx`
- Create: `src/__tests__/components/OverviewSection.test.tsx`

- [ ] **Step 7.1: Write failing test**

Create `src/__tests__/components/OverviewSection.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OverviewSection } from "../../components/OverviewSection";

describe("OverviewSection", () => {
  it("renders markdown headings and paragraphs", () => {
    render(<OverviewSection markdown={"# Title\n\nBody text."} />);
    expect(screen.getByRole("heading", { level: 1, name: "Title" })).toBeInTheDocument();
    expect(screen.getByText("Body text.")).toBeInTheDocument();
  });

  it("renders an empty state when markdown is empty", () => {
    render(<OverviewSection markdown={undefined} />);
    expect(screen.getByText(/no overview yet/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 7.2: Run failing test**

Run: `npm test -- src/__tests__/components/OverviewSection.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 7.3: Implement**

Create `src/components/OverviewSection.tsx`:

```typescript
import ReactMarkdown from "react-markdown";

interface Props {
  markdown: string | undefined;
}

export function OverviewSection({ markdown }: Props) {
  if (!markdown) {
    return <p className="text-sm italic text-gray-500">No overview yet.</p>;
  }
  return (
    <div className="prose dark:prose-invert max-w-none">
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
}
```

- [ ] **Step 7.4: Run tests**

Run: `npm test -- src/__tests__/components/OverviewSection.test.tsx`
Expected: PASS.

- [ ] **Step 7.5: Commit**

```bash
git add src/components/OverviewSection.tsx src/__tests__/components/OverviewSection.test.tsx
git commit -m "feat(ui): add OverviewSection component"
```

---

## Task 8 — CheatSheetSection component

**Files:**
- Create: `src/components/CheatSheetSection.tsx`
- Create: `src/__tests__/components/CheatSheetSection.test.tsx`

- [ ] **Step 8.1: Write failing test**

Create `src/__tests__/components/CheatSheetSection.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CheatSheetSection } from "../../components/CheatSheetSection";
import type { CheatSheet } from "../../types";

describe("CheatSheetSection", () => {
  it("renders key_facts, commands, trade_offs, pitfalls, interview_questions, and extras", () => {
    const cs: CheatSheet = {
      key_facts: ["fact 1", "fact 2"],
      commands: ["cmd --flag"],
      trade_offs: {
        headers: ["Aspect", "A", "B"],
        rows: [
          ["Speed", "fast", "slow"],
          ["Memory", "low", "high"],
        ],
      },
      pitfalls: ["watch out for X"],
      interview_questions: ["why Y?"],
      extras_markdown: "### Extras\n\nDetail.",
    };
    render(<CheatSheetSection cheatSheet={cs} />);
    expect(screen.getByText("fact 1")).toBeInTheDocument();
    expect(screen.getByText("cmd --flag")).toBeInTheDocument();
    expect(screen.getByText("Aspect")).toBeInTheDocument();
    expect(screen.getByText("Memory")).toBeInTheDocument();
    expect(screen.getByText("watch out for X")).toBeInTheDocument();
    expect(screen.getByText("why Y?")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Extras" })).toBeInTheDocument();
  });

  it("skips missing sub-sections gracefully", () => {
    render(<CheatSheetSection cheatSheet={{ key_facts: ["only fact"] }} />);
    expect(screen.getByText("only fact")).toBeInTheDocument();
    expect(screen.queryByText(/trade-offs/i)).not.toBeInTheDocument();
  });

  it("renders empty-state when cheatSheet is undefined", () => {
    render(<CheatSheetSection cheatSheet={undefined} />);
    expect(screen.getByText(/no cheat sheet yet/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 8.2: Run failing**

Run: `npm test -- src/__tests__/components/CheatSheetSection.test.tsx`
Expected: FAIL.

- [ ] **Step 8.3: Implement**

Create `src/components/CheatSheetSection.tsx`:

```typescript
import ReactMarkdown from "react-markdown";
import type { CheatSheet } from "../types";

interface Props {
  cheatSheet: CheatSheet | undefined;
}

function BulletList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="mt-4 mb-1 text-base font-semibold">{title}</h3>
      <ul className="list-disc space-y-1 pl-5">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  );
}

export function CheatSheetSection({ cheatSheet }: Props) {
  if (!cheatSheet) {
    return <p className="text-sm italic text-gray-500">No cheat sheet yet.</p>;
  }
  const { key_facts, commands, trade_offs, pitfalls, interview_questions, extras_markdown } =
    cheatSheet;

  return (
    <div className="space-y-2 text-sm">
      {key_facts && key_facts.length > 0 && <BulletList title="Key facts" items={key_facts} />}
      {commands && commands.length > 0 && (
        <div>
          <h3 className="mt-4 mb-1 text-base font-semibold">Commands</h3>
          <ul className="list-disc space-y-1 pl-5">
            {commands.map((c, i) => (
              <li key={i}>
                <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">{c}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
      {trade_offs && trade_offs.rows.length > 0 && (
        <div>
          <h3 className="mt-4 mb-1 text-base font-semibold">Trade-offs</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="border-b border-gray-300 dark:border-gray-600">
                <tr>
                  {trade_offs.headers.map((h, i) => (
                    <th key={i} className="px-2 py-1 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trade_offs.rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-gray-200 dark:border-gray-700">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-2 py-1">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {pitfalls && pitfalls.length > 0 && <BulletList title="Pitfalls" items={pitfalls} />}
      {interview_questions && interview_questions.length > 0 && (
        <BulletList title="Interview questions" items={interview_questions} />
      )}
      {extras_markdown && (
        <div className="prose dark:prose-invert mt-4 max-w-none">
          <ReactMarkdown>{extras_markdown}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 8.4: Run tests**

Run: `npm test -- src/__tests__/components/CheatSheetSection.test.tsx`
Expected: PASS.

- [ ] **Step 8.5: Commit**

```bash
git add src/components/CheatSheetSection.tsx src/__tests__/components/CheatSheetSection.test.tsx
git commit -m "feat(ui): add CheatSheetSection with structured sub-sections"
```

---

## Task 9 — MermaidDiagram (lazy) + VisualizationSection

**Files:**
- Modify: `package.json` (add mermaid)
- Create: `src/components/MermaidDiagram.tsx`
- Create: `src/components/VisualizationSection.tsx`
- Create: `src/__tests__/components/VisualizationSection.test.tsx`

- [ ] **Step 9.1: Install mermaid**

```bash
npm install mermaid
```

- [ ] **Step 9.2: Implement MermaidDiagram (lazy-load mermaid on mount)**

Create `src/components/MermaidDiagram.tsx`:

```typescript
import { useEffect, useId, useRef, useState } from "react";

interface Props {
  content: string;
  alt: string;
}

export function MermaidDiagram({ content, alt }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reactId = useId();
  const diagramId = "mermaid-" + reactId.replace(/:/g, "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "default" });
        const { svg } = await mermaid.render(diagramId, content);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [content, diagramId]);

  if (error) {
    return (
      <div role="alert" className="rounded border border-red-400 bg-red-50 p-3 text-sm text-red-700">
        Failed to render diagram: {error}
      </div>
    );
  }
  return <div ref={containerRef} aria-label={alt} role="img" />;
}
```

- [ ] **Step 9.3: Write failing test for VisualizationSection**

Create `src/__tests__/components/VisualizationSection.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VisualizationSection } from "../../components/VisualizationSection";
import type { Visualization } from "../../types";

// Mock MermaidDiagram to avoid loading mermaid in tests.
vi.mock("../../components/MermaidDiagram", () => ({
  MermaidDiagram: ({ content, alt }: { content: string; alt: string }) => (
    <div data-testid="mermaid" aria-label={alt}>
      {content}
    </div>
  ),
}));

describe("VisualizationSection", () => {
  it("renders MermaidDiagram for type=mermaid", () => {
    const v: Visualization = { type: "mermaid", content: "graph LR\n A --> B", alt: "A to B" };
    render(<VisualizationSection visualization={v} />);
    expect(screen.getByTestId("mermaid")).toBeInTheDocument();
    expect(screen.getByTestId("mermaid")).toHaveAttribute("aria-label", "A to B");
  });

  it("renders <img> for type=image", () => {
    const v: Visualization = { type: "image", src: "/visualizations/x.svg", alt: "X diagram" };
    render(<VisualizationSection visualization={v} />);
    const img = screen.getByAltText("X diagram") as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toContain("/visualizations/x.svg");
  });

  it("renders empty state when visualization is undefined", () => {
    render(<VisualizationSection visualization={undefined} />);
    expect(screen.getByText(/no visualization yet/i)).toBeInTheDocument();
  });
});
```

Also, at the very top of the file, add `import { vi } from "vitest";`.

- [ ] **Step 9.4: Run failing test**

Run: `npm test -- src/__tests__/components/VisualizationSection.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 9.5: Implement VisualizationSection**

Create `src/components/VisualizationSection.tsx`:

```typescript
import type { Visualization } from "../types";
import { MermaidDiagram } from "./MermaidDiagram";

interface Props {
  visualization: Visualization | undefined;
}

export function VisualizationSection({ visualization }: Props) {
  if (!visualization) {
    return <p className="text-sm italic text-gray-500">No visualization yet.</p>;
  }
  if (visualization.type === "mermaid") {
    return <MermaidDiagram content={visualization.content ?? ""} alt={visualization.alt} />;
  }
  return (
    <img
      src={visualization.src}
      alt={visualization.alt}
      className="max-w-full rounded border border-gray-200 dark:border-gray-700"
    />
  );
}
```

- [ ] **Step 9.6: Run tests**

Run: `npm test -- src/__tests__/components/VisualizationSection.test.tsx`
Expected: PASS.

Run: `npm test`
Expected: all pass.

- [ ] **Step 9.7: Commit**

```bash
git add package.json package-lock.json src/components/MermaidDiagram.tsx src/components/VisualizationSection.tsx src/__tests__/components/VisualizationSection.test.tsx
git commit -m "feat(ui): add VisualizationSection with lazy-loaded Mermaid support"
```

---

## Task 10 — CapacityPlanningSection component

**Files:**
- Create: `src/components/CapacityPlanningSection.tsx`
- Create: `src/__tests__/components/CapacityPlanningSection.test.tsx`

- [ ] **Step 10.1: Write failing test**

Create `src/__tests__/components/CapacityPlanningSection.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CapacityPlanningSection } from "../../components/CapacityPlanningSection";
import type { CapacityPlanning } from "../../types";

describe("CapacityPlanningSection", () => {
  it("renders inputs, formulas, worked_example, numbers_to_memorize", () => {
    const cp: CapacityPlanning = {
      inputs: [{ name: "DAU", value: "1M", unit: "users" }],
      formulas: ["RPS = DAU / 86400"],
      worked_example: "1M / 86400 ≈ 11.6 RPS",
      numbers_to_memorize: ["1 day ≈ 86400s", "1 year ≈ 3.15e7s"],
    };
    render(<CapacityPlanningSection capacity={cp} />);
    expect(screen.getByText(/DAU/)).toBeInTheDocument();
    expect(screen.getByText(/1M/)).toBeInTheDocument();
    expect(screen.getByText(/users/)).toBeInTheDocument();
    expect(screen.getByText("RPS = DAU / 86400")).toBeInTheDocument();
    expect(screen.getByText(/11.6 RPS/)).toBeInTheDocument();
    expect(screen.getByText(/86400s/)).toBeInTheDocument();
  });

  it("renders empty state when capacity is undefined", () => {
    render(<CapacityPlanningSection capacity={undefined} />);
    expect(screen.getByText(/no capacity planning yet/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 10.2: Run failing**

Run: `npm test -- src/__tests__/components/CapacityPlanningSection.test.tsx`
Expected: FAIL.

- [ ] **Step 10.3: Implement**

Create `src/components/CapacityPlanningSection.tsx`:

```typescript
import ReactMarkdown from "react-markdown";
import type { CapacityPlanning } from "../types";

interface Props {
  capacity: CapacityPlanning | undefined;
}

export function CapacityPlanningSection({ capacity }: Props) {
  if (!capacity) {
    return <p className="text-sm italic text-gray-500">No capacity planning yet.</p>;
  }
  return (
    <div className="space-y-4 text-sm">
      {capacity.inputs.length > 0 && (
        <div>
          <h3 className="mb-1 text-base font-semibold">Inputs</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            {capacity.inputs.map((i, idx) => (
              <div key={idx} className="contents">
                <dt className="font-medium">{i.name}</dt>
                <dd>
                  {i.value} <span className="text-gray-500">{i.unit}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {capacity.formulas.length > 0 && (
        <div>
          <h3 className="mb-1 text-base font-semibold">Formulas</h3>
          <ul className="space-y-1">
            {capacity.formulas.map((f, i) => (
              <li key={i}>
                <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">{f}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
      {capacity.worked_example && (
        <div>
          <h3 className="mb-1 text-base font-semibold">Worked example</h3>
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown>{capacity.worked_example}</ReactMarkdown>
          </div>
        </div>
      )}
      {capacity.numbers_to_memorize.length > 0 && (
        <div>
          <h3 className="mb-1 text-base font-semibold">Numbers to memorize</h3>
          <ul className="list-disc space-y-1 pl-5">
            {capacity.numbers_to_memorize.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 10.4: Run tests**

Run: `npm test -- src/__tests__/components/CapacityPlanningSection.test.tsx`
Expected: PASS.

- [ ] **Step 10.5: Commit**

```bash
git add src/components/CapacityPlanningSection.tsx src/__tests__/components/CapacityPlanningSection.test.tsx
git commit -m "feat(ui): add CapacityPlanningSection component"
```

---

## Task 11 — Wire accordion region into TopicDetail

**Files:**
- Modify: `src/pages/TopicDetail.tsx`
- Create: `src/__tests__/pages/TopicDetail-content.test.tsx`

- [ ] **Step 11.1: Read current TopicDetail to understand structure**

Run: `cat src/pages/TopicDetail.tsx`

Make note of where the existing summary, resources, notes, materials are rendered. The new accordion region goes **between summary and resources**.

- [ ] **Step 11.2: Write failing integration test**

Create `src/__tests__/pages/TopicDetail-content.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TopicDetail } from "../../pages/TopicDetail";
import type { TopicContent } from "../../types";
import { vi } from "vitest";

// Mock the topicContent loader so we can inject a content map.
const sampleContent: TopicContent = {
  id: "gc-g1",
  overview: "# G1 overview\n\nBody.",
  cheat_sheet: { key_facts: ["default since Java 9"] },
};
vi.mock("../../data/topicContent", () => ({
  getTopicContent: (id: string) => (id === "gc-g1" ? sampleContent : null),
}));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/topic/:topicId" element={<TopicDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("TopicDetail — Project B content sections", () => {
  it("shows Overview heading and markdown body when content exists", () => {
    renderAt("/topic/gc-g1");
    expect(screen.getByRole("button", { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "G1 overview" })).toBeInTheDocument();
  });

  it("shows Cheat Sheet collapsed by default (header visible, body hidden)", () => {
    renderAt("/topic/gc-g1");
    expect(screen.getByRole("button", { name: /cheat sheet/i })).toBeInTheDocument();
    expect(screen.queryByText("default since Java 9")).not.toBeInTheDocument();
  });

  it("shows empty-state note when no content for topic", () => {
    renderAt("/topic/some-topic-without-content");
    expect(screen.getByText(/no extended content yet/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 11.3: Run to verify failure**

Run: `npm test -- src/__tests__/pages/TopicDetail-content.test.tsx`
Expected: FAIL — TopicDetail doesn't yet render Project B sections.

- [ ] **Step 11.4: Modify TopicDetail.tsx**

Add the accordion region between the summary section and the resources section. Structure of the new region:

```typescript
import { getTopicContent } from "../data/topicContent";
import { getAliasMap } from "../data/roadmap";
import { TopicAccordionSection } from "../components/TopicAccordionSection";
import { OverviewSection } from "../components/OverviewSection";
import { CheatSheetSection } from "../components/CheatSheetSection";
import { VisualizationSection } from "../components/VisualizationSection";
import { CapacityPlanningSection } from "../components/CapacityPlanningSection";
import { useAccordionState } from "../hooks/useAccordionState";
```

Inside the component body, after loading the topic node and summary, add:

```typescript
const topicContent = getTopicContent(topicId!, undefined, getAliasMap());
const { state, toggle } = useAccordionState(topicId!, {
  overview: true,
  cheat_sheet: false,
  visualization: false,
  capacity_planning: false,
});
```

In the JSX, after the existing summary block and before resources/notes/materials, insert:

```tsx
{topicContent ? (
  <>
    <TopicAccordionSection
      title="Overview"
      expanded={state.overview}
      onToggle={() => toggle("overview")}
    >
      <OverviewSection markdown={topicContent.overview} />
    </TopicAccordionSection>
    <TopicAccordionSection
      title="Cheat Sheet"
      expanded={state.cheat_sheet}
      onToggle={() => toggle("cheat_sheet")}
    >
      <CheatSheetSection cheatSheet={topicContent.cheat_sheet} />
    </TopicAccordionSection>
    <TopicAccordionSection
      title="Visualization"
      expanded={state.visualization}
      onToggle={() => toggle("visualization")}
    >
      <VisualizationSection visualization={topicContent.visualization} />
    </TopicAccordionSection>
    {topicContent.capacity_planning && (
      <TopicAccordionSection
        title="Capacity Planning"
        expanded={state.capacity_planning}
        onToggle={() => toggle("capacity_planning")}
      >
        <CapacityPlanningSection capacity={topicContent.capacity_planning} />
      </TopicAccordionSection>
    )}
  </>
) : (
  <p className="my-4 text-sm italic text-gray-500">No extended content yet.</p>
)}
```

Adjust indentation and surrounding markup to match the existing `TopicDetail.tsx` style.

- [ ] **Step 11.5: Run tests**

Run: `npm test`
Expected: all pass (including new TopicDetail-content tests + existing suites).

- [ ] **Step 11.6: Manual smoke**

```bash
npm run dev
```

Open `http://localhost:5173/` (or whatever port Vite reports), navigate to any topic. Verify:
- Topics without content files show "No extended content yet."
- Topics with content show Overview (expanded by default), Cheat Sheet + Visualization (collapsed), and Capacity Planning only if present.
- Clicking section headers toggles. Reloading preserves toggle state.
- No console errors.

Stop dev server.

- [ ] **Step 11.7: Commit**

```bash
git add src/pages/TopicDetail.tsx src/__tests__/pages/TopicDetail-content.test.tsx
git commit -m "feat(ui): wire Project B content accordion into TopicDetail"
```

---

## Task 12 — Authoring template + guide

**Files:**
- Create: `docs/topic-template.md`
- Create: `docs/topic-authoring-guide.md`

- [ ] **Step 12.1: Create template**

Create `docs/topic-template.md`:

```markdown
---
# Copy this file to data/topics/<topic-id>.md. Replace placeholders below.
# All top-level keys EXCEPT id are optional — delete what you don't need.

id: <topic-id>

cheat_sheet:
  key_facts:
    - "Replace with crisp facts — one per line, no fluff."
  commands:
    - "cmd --flag    # optional: annotated shell/tool commands"
  trade_offs:
    headers: [Aspect, Option A, Option B]
    rows:
      - [Dimension, "Value A", "Value B"]
  pitfalls:
    - "Common failure modes, misconceptions, or operational gotchas."
  interview_questions:
    - "Question you'd ask to test depth of understanding"
  extras_markdown: |
    ### Extras
    Free-form notes that don't fit the structured sections above.

capacity_planning:
  # Only include for topics where back-of-envelope math matters (~15 topics total).
  inputs:
    - { name: "Input name", value: "Value", unit: "unit" }
  formulas:
    - "Name = formula"
  worked_example: |
    Step-by-step calculation grounded in the inputs above.
  numbers_to_memorize:
    - "Key orders of magnitude or rule-of-thumb numbers."

visualization:
  # Use type: mermaid for simple diagrams (sequence, flowchart, ER, state).
  # Use type: image for complex architecture diagrams (put SVG/PNG in public/visualizations/).
  type: mermaid
  content: |
    graph LR
      A --> B
  alt: "Accessibility description — what the diagram shows in plain English."
---

# Overview

Write 300-800 words explaining the concept in your own words.

Structure suggestion (not required, but helps):

1. **Why it exists** — what problem does this solve? what's the pain without it?
2. **How it works** — core mechanism, critical moving parts.
3. **When to use / not use** — trade-offs with alternatives.
4. **Connection to what you already know** — prereqs, related topics.

Avoid just copying from external sources. This section should be the version you'd give to a teammate verbally over 3-5 minutes.
```

- [ ] **Step 12.2: Create authoring guide**

Create `docs/topic-authoring-guide.md`:

```markdown
# Topic Authoring Guide

## Where to start

1. Copy `docs/topic-template.md` to `data/topics/<topic-id>.md`.
2. Replace `id: <topic-id>` with the canonical topic id (check the roadmap YAML — must NOT be an alias).
3. Delete frontmatter sections you won't fill (all are optional except `id`).
4. Write the overview last — it's the hardest part; do cheat_sheet + capacity first if applicable.

## Validation

Before commit, run:

```bash
npm run validate
```

This catches: orphan ids, malformed frontmatter, mismatched `trade_offs` columns, missing image files for `visualization.type=image`. Mermaid syntax is NOT validated at build time — verify visually in the dev server (`npm run dev`).

## Quality checklist per section

**Overview (300-800 words):**
- [ ] Explains the concept without requiring the reader to know it already
- [ ] Uses your words, not copy-paste from Wikipedia or the library docs
- [ ] Includes at least one trade-off or non-obvious gotcha
- [ ] Links to prereq topic by name (not by URL)

**Cheat sheet:**
- [ ] `key_facts`: 3-7 facts, each standalone (readable out of context)
- [ ] `commands`: exact, with flags and a trailing `#` comment
- [ ] `trade_offs`: every row has the same number of cells as `headers`
- [ ] `pitfalls`: real production failure modes you'd mention in code review
- [ ] `interview_questions`: interviewer-style, not student-style

**Capacity planning (when applicable):**
- [ ] `inputs`: realistic values with units
- [ ] `formulas`: named, each formula = one line
- [ ] `worked_example`: shows the arithmetic, not just the answer
- [ ] `numbers_to_memorize`: orders of magnitude worth recalling under time pressure

**Visualization:**
- [ ] Mermaid for simple flows; image fallback for complex architecture diagrams
- [ ] `alt` text is a complete sentence describing what the diagram shows
- [ ] No horizontal scroll required at default width

## When to skip a section

Skip `capacity_planning` unless the topic is one of the ~15 explicitly listed in the Project B spec (Section 6). Don't force math into topics where it isn't meaningful.

Skip `visualization` if you can't think of a diagram that adds more than text alone.

Skip the whole content file until you're actively studying the topic ("just-in-time authoring"). Missing file = no degradation in UI.

## Style

- Use active voice. "G1 collects Eden regions concurrently" not "Eden regions are collected".
- Prefer specific over generic. "5-15ms typical pause" not "short pause".
- Link concepts, not URLs. Users will find URLs via the existing `resources` field.
```

- [ ] **Step 12.3: Commit**

```bash
git add docs/topic-template.md docs/topic-authoring-guide.md
git commit -m "docs: add topic content authoring template and guide"
```

---

## Task 13 — Seed authoring: 5 topics

**Files:**
- Create: `data/topics/sd-capacity.md`
- Create: `data/topics/resilience-patterns-practical.md`
- Create: `data/topics/kafka-partitions.md`
- Create: `data/topics/event-sourcing.md`
- Create: `data/topics/saga-pattern.md`

Each seed topic gets a full content file: overview + cheat_sheet + (capacity_planning where relevant) + visualization.

The task provides fully-authored content for `sd-capacity` and `kafka-partitions` as exemplars. The other three use the same style — author per the template with equivalent depth (300-800 word overview, 5-7 key facts, trade-off table if meaningful, at least one diagram).

- [ ] **Step 13.1: Author `data/topics/sd-capacity.md`**

Create exactly this file:

```markdown
---
id: sd-capacity

cheat_sheet:
  key_facts:
    - "Back-of-envelope estimation trades precision for speed — aim for order-of-magnitude, not exact numbers."
    - "Three dimensions to estimate: QPS (requests/sec), storage (GB), bandwidth (Mbps)."
    - "Peak traffic is typically 2-3× average; design to peak + 20% headroom."
    - "Seconds per day ≈ 10^5 (86,400). Seconds per year ≈ 3.15 × 10^7."
    - "Memory latency: L1 ~1ns, RAM ~100ns, SSD ~100µs, spinning disk ~10ms, cross-AZ network ~500µs, cross-region ~100ms."
  commands:
    - "echo '1000000 * 2 / 86400' | bc   # 1M users × 2 writes/day ≈ 23 writes/sec"
  trade_offs:
    headers: [Choice, When it helps, When it hurts]
    rows:
      - [Pre-compute at write, Read-heavy workloads, "Write amplification; storage cost"]
      - [Compute at read, Write-heavy or rarely-read data, "Read latency; repeated work"]
      - [Cache result, "Read ≫ write, tolerable staleness", "Invalidation complexity; memory cost"]
  pitfalls:
    - "Ignoring peak-to-average ratio — system sized for average crashes during traffic spikes."
    - "Forgetting replication factor when sizing storage (3× for typical distributed DB)."
    - "Treating bandwidth as infinite — 1 Gbps = ~125 MB/s, large payloads saturate NICs quickly."
  interview_questions:
    - "Estimate the QPS for Twitter timeline generation. Walk me through your assumptions."
    - "How does the estimate change if 10% of users are power users generating 90% of traffic?"
  extras_markdown: |
    ### The 5-minute estimation recipe
    1. State assumptions explicitly (DAU, per-user action rate, payload sizes).
    2. Compute average QPS = total actions/day ÷ 86,400.
    3. Multiply by peak factor (2-3×) for peak QPS.
    4. Storage = (items/day × avg size × retention days × replication factor).
    5. Bandwidth = peak QPS × avg payload size.
    6. Sanity-check against well-known systems ("Twitter does ~6k QPS writes, YouTube does ~30 TB/day uploads").

capacity_planning:
  inputs:
    - { name: "Daily active users", value: "10M", unit: "users" }
    - { name: "Avg actions per user per day", value: "5", unit: "actions" }
    - { name: "Avg payload size", value: "2", unit: "KB" }
    - { name: "Retention", value: "365", unit: "days" }
    - { name: "Replication factor", value: "3", unit: "" }
    - { name: "Peak-to-average ratio", value: "3", unit: "" }
  formulas:
    - "Avg QPS = DAU × actions/user / 86400"
    - "Peak QPS = Avg QPS × peak_factor"
    - "Storage/year = DAU × actions × payload × retention × replication"
    - "Bandwidth = Peak QPS × payload"
  worked_example: |
    Avg QPS = 10M × 5 / 86,400 ≈ 580 QPS
    Peak QPS = 580 × 3 ≈ 1,740 QPS
    Storage/year = 10M × 5 × 2 KB × 365 × 3 ≈ 110 TB/year
    Bandwidth = 1,740 × 2 KB ≈ 3.5 MB/s ≈ 28 Mbps
  numbers_to_memorize:
    - "1 day ≈ 10^5 seconds (86,400 exactly)"
    - "1 year ≈ 3.15 × 10^7 seconds"
    - "1 Gbps ≈ 125 MB/s"
    - "Typical cross-region RTT ≈ 100ms; cross-AZ ≈ 1-2ms; same-AZ ≈ 0.1ms"

visualization:
  type: mermaid
  content: |
    graph TD
      Assumptions[State assumptions:<br/>DAU, actions/user, payload] --> QPS[Compute avg QPS]
      QPS --> Peak[Multiply by peak factor]
      Peak --> Storage[Storage = DAU × actions × payload × retention × RF]
      Storage --> Bandwidth[Bandwidth = peak QPS × payload]
      Bandwidth --> Sanity[Sanity-check vs known systems]
  alt: "Flow: state assumptions → average QPS → peak QPS → storage → bandwidth → sanity check"
---

# Overview

Capacity estimation is the skill of producing back-of-envelope numbers — QPS, storage, bandwidth — fast enough to drive architectural decisions without access to production metrics. Senior interviewers lean heavily on it because it separates engineers who reason about systems from those who memorize reference architectures.

## Why it exists

Every real architectural choice depends on scale. "Use Redis" is wrong for a 100 QPS system (overkill) and right for a 100k QPS system (necessary). Without rough numbers, you either over-engineer the first case or under-provision the second. Capacity estimation is the bridge between a vague requirement ("design Twitter") and a concrete design ("fan-out on write, because average user has 200 followers and we tolerate 100ms write latency").

## How it works

1. **State assumptions explicitly.** DAU, per-user actions, payload size, retention, replication factor, peak-to-average ratio. Your interviewer or stakeholder can challenge any one of these; they can't challenge your arithmetic.

2. **Compute average QPS.** `(DAU × actions/day) / 86,400`. Memorize `86,400 ≈ 10^5` so you can do this in your head.

3. **Multiply by peak factor.** Typical services see 2-3× peak vs average. Design to peak + 20% headroom.

4. **Project storage.** `items/day × avg size × retention × replication`. For a 3-replica distributed DB, multiply by 3. Don't forget indexes (typically 10-30% of data size for well-normalized workloads).

5. **Project bandwidth.** `peak QPS × avg payload size`. Sanity-check against NIC limits (1 Gbps ≈ 125 MB/s).

6. **Sanity-check.** Compare to known public numbers — Twitter, YouTube, Stripe have published engineering blog posts with real QPS and storage numbers. Your estimate should be in the same order of magnitude as comparable systems.

## When to use it

- Interview system design rounds — expected, rewarded.
- Early architectural planning — "can we do this on one Postgres or do we need sharding?"
- Sizing cloud resources before deployment — avoids both cost surprises and embarrassing autoscale-out events.

## When to not use it

- Optimization after a system is live — you have real metrics; use them. Estimates are for when metrics don't exist yet.
- When the answer is obvious — don't waste time estimating QPS for a single-user admin tool.

## Common mistakes

The biggest trap is forgetting that **real traffic is bursty**. Averaging over 24 hours hides the fact that your Black Friday peak is 10× your usual peak. Always multiply by a peak factor, and when possible ask what the 99th-percentile peak looks like.

The second trap is **ignoring replication and indexes**. A 100 GB dataset is 300 GB at 3× replication, and another 30-100 GB of indexes — your actual storage bill is 4-5× the raw data size.

## Connection to other topics

This underpins `sd-components`, `sd-data-stores`, `sd-caching`, and every individual system design topic. In interview prep, pair it with memorized latency numbers (L1 to cross-region) so you can speak fluently about cost of a round-trip.
```

- [ ] **Step 13.2: Author `data/topics/kafka-partitions.md`**

Create exactly this file:

```markdown
---
id: kafka-partitions

cheat_sheet:
  key_facts:
    - "Partitions are Kafka's unit of parallelism — N partitions = up to N concurrent consumers in one group."
    - "Producer picks partition via key hash (default), round-robin (no key), or explicit partitioner."
    - "Consumer group rebalancing can be eager (stop-the-world) or cooperative (incremental, Kafka 2.4+)."
    - "Partition count is effectively immutable — increasing it reshuffles keys; decreasing requires recreate."
    - "Rule of thumb: partition count = max(expected peak throughput / per-partition throughput, desired max consumers)."
  commands:
    - "kafka-topics.sh --describe --topic t --bootstrap-server localhost:9092   # partition layout + leader"
    - "kafka-consumer-groups.sh --describe --group g --bootstrap-server localhost:9092   # lag per partition"
  trade_offs:
    headers: [Partition count, Pro, Con]
    rows:
      - [Low (< 10), "Low metadata overhead", "Poor consumer parallelism"]
      - [Moderate (10-100), "Balanced parallelism vs overhead", "Most production workloads"]
      - [High (1000+), "Massive consumer parallelism", "Controller bottleneck; rebalance cost"]
  pitfalls:
    - "Hot partition: skewed key distribution = one partition overloaded while others idle."
    - "Consumer count > partition count = idle consumers (each partition assigned to exactly one)."
    - "Increasing partition count breaks key ordering guarantees for existing keys."
  interview_questions:
    - "Why can't a consumer group have more consumers than partitions? Show the math for throughput."
    - "You're seeing lag only on partition 7. What are the top 3 hypotheses?"
  extras_markdown: |
    ### Assignment strategies
    - **RangeAssignor** (default pre-2.4): consumers get contiguous ranges. Simple but causes skew.
    - **RoundRobinAssignor**: spreads partitions evenly.
    - **StickyAssignor**: minimizes partition movement during rebalance.
    - **CooperativeStickyAssignor**: incremental rebalance — consumers keep working during rebalancing.

capacity_planning:
  inputs:
    - { name: "Target throughput", value: "100", unit: "MB/s" }
    - { name: "Per-partition throughput ceiling", value: "10", unit: "MB/s" }
    - { name: "Desired consumer parallelism", value: "20", unit: "consumers" }
  formulas:
    - "MinPartitions = max(target_throughput / per_partition_ceiling, desired_consumers)"
  worked_example: |
    MinPartitions = max(100 / 10, 20) = max(10, 20) = 20 partitions
    Headroom for future consumer scaling: start with 30-40 to allow 2× consumer growth without repartitioning.
  numbers_to_memorize:
    - "Single Kafka partition: ~10 MB/s sustained (varies 1-50 based on record size, acks, replication)"
    - "Kafka cluster practical max partition count: ~200k with ZooKeeper, millions with KRaft"
    - "Rebalance duration with eager protocol: seconds; cooperative: near-zero stop-the-world"

visualization:
  type: mermaid
  content: |
    graph LR
      P1[Producer] -->|key=A, hash→0| T0[Partition 0]
      P1 -->|key=B, hash→1| T1[Partition 1]
      P1 -->|key=C, hash→2| T2[Partition 2]
      T0 --> C1[Consumer 1]
      T1 --> C2[Consumer 2]
      T2 --> C3[Consumer 3]
  alt: "Producer hashes key to partition; each partition in a consumer group is owned by exactly one consumer"
---

# Overview

Partitions are how Kafka achieves parallelism. A topic is a logical stream; a partition is a physical, append-only log. When you want to scale either producers or consumers, you scale partitions.

## Why it exists

Without partitioning, a single consumer has to read the entire stream in order — a hard limit on throughput. Partitioning splits the stream into independent lanes: producers spread writes across lanes, consumers (within a group) each own one or more lanes exclusively. This is the same principle as database sharding applied to a log.

## How it works

**Producer side.** When you produce a record with a key, Kafka hashes the key modulo partition count to pick a partition. Same key → same partition → same order. This is how you get per-key ordering in a massively parallel system.

**Consumer side.** Consumers join a **consumer group**. The group coordinator assigns each partition to exactly one consumer in the group. If you have 8 partitions and 4 consumers, each consumer gets 2 partitions. If you have 8 partitions and 12 consumers, 4 consumers sit idle — you can't parallelize beyond the partition count.

**Rebalancing.** When a consumer joins or leaves, the group coordinator reassigns partitions. Eager rebalancing revokes all assignments and re-distributes (stop-the-world). Cooperative rebalancing (since Kafka 2.4) moves only the partitions that need to move, so consumers keep processing during the rebalance.

## When to use what

- **Partition count — start low, grow carefully.** Doubling partition count reshuffles keys (hash mod changes), breaking per-key ordering for active keys. Plan for peak throughput + 2× consumer growth headroom.
- **Key choice.** Choose a key whose distribution matches your desired locality. User ID is good if you want all events for a user in order. Random UUID is bad if you later want ordering.
- **Assignment strategy.** Use CooperativeStickyAssignor for consumer groups that do stateful processing — minimizes disruption.

## When not to use what

- **Don't partition by timestamp or incrementing ID** — recent partitions become hot, old partitions idle.
- **Don't set partition count = consumer count exactly.** Leave headroom for future scale without repartitioning.

## Common mistakes

1. **Hot partitions from skewed keys.** If 90% of your events have `key=tenant-1`, 90% of your load hits one partition. Fix: use a composite key or a salt.

2. **More consumers than partitions.** The excess sit idle. Increase partition count, don't spin up more consumers.

3. **Ordering assumption across partitions.** Kafka guarantees order *within* a partition, not across. If you need a global order, either use 1 partition (no parallelism) or rely on application-level sequencing.

## Connection to other topics

`kafka-exactly-once` requires partition awareness — transactional writes span partitions. `kafka-reliability` (acks, ISR) is also per-partition. `outbox-pattern` and `schema-registry-evolution` both build on partition ordering guarantees.
```

- [ ] **Step 13.3: Author `data/topics/resilience-patterns-practical.md`**

Create `data/topics/resilience-patterns-practical.md` with the same depth as the two exemplars above. The topic covers bulkheads, timeouts, retry+jitter, and rate limiting. Include:

- Overview 300-800 words explaining the four patterns and why they must be layered, not used in isolation.
- cheat_sheet.key_facts (5-7): e.g., "Exponential backoff alone causes thundering herd — add jitter."
- cheat_sheet.trade_offs comparing retry strategies (no retry / fixed backoff / exponential / exponential+jitter).
- cheat_sheet.pitfalls (3-5) including "retry storm from synchronized clients."
- cheat_sheet.interview_questions (2-3).
- capacity_planning with inputs for rate limit sizing (peak QPS, target RPS), formula, worked example.
- Mermaid diagram: sequence or flow showing request → timeout → retry+jitter → circuit breaker trip.
- Prereq reference: `sd-failure-modes`.

- [ ] **Step 13.4: Author `data/topics/event-sourcing.md`**

Create `data/topics/event-sourcing.md` matching the exemplar style. Cover:

- Overview 300-800 words on event sourcing vs state sourcing, append-only log, replay, audit.
- cheat_sheet.key_facts covering immutability, snapshots, projections, CQRS pairing.
- trade_offs vs CRUD (table with dimensions: audit, query complexity, storage, team unfamiliarity).
- pitfalls including "schema evolution of old events is hard."
- interview_questions about snapshotting strategy and projection consistency.
- Mermaid sequence: command → event → append → projection update → query side.
- No capacity_planning unless a meaningful numeric example applies.

- [ ] **Step 13.5: Author `data/topics/saga-pattern.md`**

Create `data/topics/saga-pattern.md` matching exemplar style. Cover:

- Overview 300-800 words: orchestration vs choreography, compensating transactions, why we can't use 2PC in microservices.
- cheat_sheet.key_facts on compensations, idempotency requirements, observability challenges.
- trade_offs: orchestration vs choreography (central coordinator, coupling, visibility, failure handling).
- pitfalls: "forgot compensation logic for step N" and "compensation itself fails."
- interview_questions on saga state machine and what happens mid-saga on process crash.
- Mermaid sequence showing Order → Payment → Inventory → Shipping with compensations on failure.
- Link to `event-sourcing` and `cqrs` as pairing patterns.

- [ ] **Step 13.6: Validate + commit**

```bash
npm run validate
npm test
```

Both should pass.

Run `npm run dev` briefly and check that 3-5 of these topics render their accordion sections correctly with Mermaid diagrams.

```bash
git add data/topics/
git commit -m "feat(content): seed 5 topic content files (sd-capacity, kafka-partitions, resilience-patterns-practical, event-sourcing, saga-pattern)"
```

---

## Task 14 — Complete Phase 5 pilot (10 topics)

**Files:**
- Create one `data/topics/<id>.md` for each of:
  - `sd-components`
  - `sd-data-stores`
  - `sd-caching`
  - `sd-failure-modes`
  - `sd-cost-estimation`
  - `oltp-vs-olap`
  - `network-protocols`
  - `sd-cap-theorem`
  - `authz-models`
  - `threat-modeling-stride`

- [ ] **Step 14.1: Author each file per `docs/topic-template.md`**

For each topic:

1. Copy `docs/topic-template.md` to `data/topics/<topic-id>.md`.
2. Fill `id:` with the exact topic id.
3. Write `overview` (300-800 words) per the authoring guide.
4. Author cheat_sheet with at minimum `key_facts` (5-7) and `trade_offs` when the topic has alternatives. Include `pitfalls` and `interview_questions`.
5. Add `visualization` (Mermaid preferred) for `sd-components`, `sd-data-stores`, `sd-caching`, `oltp-vs-olap`, `network-protocols`, `authz-models`. Skip for others if no diagram adds value.
6. Add `capacity_planning` for `sd-caching`, `sd-components`, `sd-cost-estimation`. Skip for the rest.

Match the depth and style of the two exemplars (`sd-capacity`, `kafka-partitions`) in Task 13.

- [ ] **Step 14.2: Validate incrementally**

After every 2-3 files, run:

```bash
npm run validate
```

Fix any errors immediately — much easier than debugging 10 files at once.

- [ ] **Step 14.3: Final validate + commit**

```bash
npm run validate
npm test
git add data/topics/
git commit -m "feat(content): author 10 Phase 5 pilot topic content files"
```

---

## Task 15 — Complete Phase 6 pilot (11 topics)

**Files:**
- Create one `data/topics/<id>.md` for each of:
  - `kafka-exactly-once`
  - `kafka-storage-model`
  - `cqrs`
  - `outbox-pattern`
  - `service-mesh`
  - `api-gateway`
  - `distributed-tracing`
  - `rabbitmq-vs-kafka`
  - `schema-registry-evolution`
  - `dlq-poison-messages`
  - `consumer-idempotency`

- [ ] **Step 15.1: Author each per template**

Same process as Task 14. Recommendations:

- `kafka-storage-model`, `kafka-exactly-once`, `rabbitmq-vs-kafka`: include Mermaid diagrams and detailed `trade_offs`.
- `kafka-storage-model`: include `capacity_planning` (log segment size, retention, storage projection).
- `outbox-pattern`, `cqrs`: include diagrams showing the flow.
- `distributed-tracing`: diagram showing a request touching 3-4 services with span tree.
- `api-gateway` vs `service-mesh`: include `trade_offs` comparing placement (edge vs mesh) and concerns (auth vs retry vs observability).
- `consumer-idempotency`: `capacity_planning` optional (dedup table size sizing).

- [ ] **Step 15.2: Validate incrementally; commit**

```bash
npm run validate
npm test
git add data/topics/
git commit -m "feat(content): author 11 Phase 6 pilot topic content files"
```

---

## Task 16 — Capacity-only content files (8 topics)

**Files:**
- Create: `data/topics/pg-memory.md`
- Create: `data/topics/pg-indexing.md`
- Create: `data/topics/redis-deep.md`
- Create: `data/topics/mongodb-fundamentals.md`
- Create: `data/topics/real-time-payments.md`
- Create: `data/topics/rag-pipeline.md`
- Create: `data/topics/embeddings.md`
- Create: `data/topics/chunking-strategies.md`

Each of these gets a content file with **only `capacity_planning` frontmatter** — no overview, no cheat_sheet, no visualization. The purpose is to surface memorizable numbers without requiring a full write-up.

- [ ] **Step 16.1: Author `data/topics/pg-memory.md`**

Create exactly this file as a template for the pattern:

```markdown
---
id: pg-memory

capacity_planning:
  inputs:
    - { name: "Total RAM", value: "64", unit: "GB" }
    - { name: "max_connections", value: "200", unit: "" }
    - { name: "shared_buffers", value: "16", unit: "GB" }
    - { name: "work_mem per operation", value: "16", unit: "MB" }
  formulas:
    - "shared_buffers ≈ 25% of RAM (up to 40% for dedicated DB hosts)"
    - "work_mem total = max_connections × operations_per_query × work_mem"
    - "maintenance_work_mem ≈ 512 MB - 2 GB (VACUUM, CREATE INDEX)"
  worked_example: |
    shared_buffers = 64 × 0.25 = 16 GB ✓
    work_mem worst case = 200 × 3 × 16 MB = 9.4 GB (watch this!)
    Total committed = 16 + 9.4 + 1 (maintenance) = 26.4 GB — leaves 37.6 GB for OS page cache (good).
  numbers_to_memorize:
    - "shared_buffers: 25-40% of RAM (never 100% — leave room for OS page cache)"
    - "work_mem per operation, not per query — multiply by connections × operations"
    - "effective_cache_size: hint to planner ≈ (shared_buffers + OS page cache available)"
---
```

- [ ] **Step 16.2: Author the remaining 7 capacity-only files**

For each of `pg-indexing`, `redis-deep`, `mongodb-fundamentals`, `real-time-payments`, `rag-pipeline`, `embeddings`, `chunking-strategies`:

- Follow the `pg-memory.md` pattern exactly (frontmatter with only `id` and `capacity_planning`, no markdown body).
- Numbers must be concrete and grounded. Examples of what each file should include:
  - `pg-indexing`: index overhead (~10-30% of data), B-Tree seek cost log(N), GIN vs BRIN size trade-offs.
  - `redis-deep`: memory per key (~50-100 bytes overhead), pipeline throughput (100k+ ops/sec/instance), cluster hash slot range.
  - `mongodb-fundamentals`: WiredTiger cache sizing (50% RAM default), index size estimation, aggregation pipeline cost.
  - `real-time-payments`: transaction-per-second peaks for banks (~10k), settlement windows (ISO 20022), idempotency key TTL.
  - `rag-pipeline`: retrieval latency budget (sub-100ms for UX), reranker cost, context token limits.
  - `embeddings`: vector dimension common sizes (384, 768, 1536, 3072), bytes-per-vector (dim × 4 or dim × 2 for fp16), index size scaling.
  - `chunking-strategies`: chunk size sweet spot (256-1024 tokens), overlap 10-20%, chunks-per-document typical.

- [ ] **Step 16.3: Validate + commit**

```bash
npm run validate
npm test
git add data/topics/
git commit -m "feat(content): add capacity-only files for 8 out-of-pilot topics"
```

---

## Task 17 — Final smoke test + manual verification

**Files:** None — verification only.

- [ ] **Step 17.1: Run full build**

```bash
npm run build
```

Expected: validator passes, TypeScript compiles, Vite builds. No warnings about large chunks (mermaid should be lazy).

- [ ] **Step 17.2: Check bundle size**

Inspect `dist/` output. Main bundle should NOT include mermaid (it's in a lazy chunk). Look for a separate mermaid chunk of ~500 KB.

If main bundle grew by >100 KB vs the Project A baseline, investigate — mermaid may not be properly code-split.

- [ ] **Step 17.3: Run full test suite**

```bash
npm test
```

Expected: all suites pass.

- [ ] **Step 17.4: Manual dev-server smoke**

```bash
npm run dev
```

For 5 pilot topics chosen randomly from Phase 5 and Phase 6:

1. Navigate to the topic page.
2. Verify Overview section is expanded and renders markdown.
3. Expand Cheat Sheet — verify all subsections render (key_facts bullets, commands as code, trade_offs as table, etc.).
4. Expand Visualization — verify Mermaid diagram renders without console errors.
5. If `capacity_planning` is present, verify the section appears and renders inputs/formulas/example/numbers.
6. Toggle sections closed, reload the page, verify toggle state persisted.

For 2-3 topics that have NO content file:

1. Verify "No extended content yet." message appears.
2. Verify no sections are rendered.
3. Verify no console errors.

For 2-3 capacity-only topics (e.g., `pg-memory`, `embeddings`):

1. Verify Overview shows empty state ("No overview yet.").
2. Verify Capacity Planning section appears and renders numbers.
3. Verify Cheat Sheet and Visualization sections show their empty states.

Stop dev server.

- [ ] **Step 17.5: Verify existing progress still works**

If you have a saved `userdata.json` from before Project B:

1. Load it via the UI import function.
2. Verify marked-done and in-progress topics retain their state.
3. Verify notes and materials attached to topics still render.

- [ ] **Step 17.6: Commit manual-verification log (optional)**

If any issues surfaced during manual smoke, either fix them now (preferred) or capture them in a GitHub issue / markdown note under `docs/superpowers/plans/`. No commit required if everything passed.

---

## Done Criteria (from spec)

- [x] Content types added to `src/types.ts`.
- [x] `gray-matter`-based frontmatter parser with validation.
- [x] UI-side and CLI-side topic content loaders.
- [x] Validator rules for orphan ids, shape validation, missing images.
- [x] Accordion UI with persisted expand state.
- [x] Overview, Cheat Sheet, Visualization, Capacity Planning components.
- [x] Mermaid lazy-loaded to preserve initial bundle size.
- [x] Authoring template + guide committed.
- [x] 5 seed topics authored end-to-end.
- [x] 10 Phase 5 + 11 Phase 6 pilot topics authored (total 26 with seeds).
- [x] 8 capacity-only content files for out-of-pilot topics.
- [x] Full `npm run build` + `npm test` pass.
- [x] Manual smoke test in dev server verifies end-to-end render path.
