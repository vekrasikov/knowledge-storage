# Roadmap Semantic Path — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a unified 9-phase learning path across all 8 direction YAMLs, author 26 new topics filling content gaps (SQL/NoSQL, events, CI/CD, security), resolve 5 duplicate IDs via aliases, and enforce the new data model with a build-time validator.

**Architecture:** Extend `RoadmapNode` with `prerequisites`, `phase`, `phaseOrder`, `aliasOf`, `type`. Add `data/path.yaml` as semantic layer referencing existing topic IDs. Add `scripts/validate-roadmap.ts` that runs in `npm run build` preflight. Alias resolution handled in `src/data/roadmap.ts` loader so existing `userdata.json` progress entries keep working.

**Tech Stack:** TypeScript, Vite 8, Vitest 4, YAML (`@modyfi/vite-plugin-yaml`), React 19.

**Reference spec:** [`docs/superpowers/specs/2026-04-17-roadmap-semantic-path-design.md`](../specs/2026-04-17-roadmap-semantic-path-design.md) — authoritative source for phase assignments, new topic content, and prerequisite edges.

---

## Task 1 — Extend `RoadmapNode` type

**Files:**
- Modify: `src/types.ts:1-10`
- Test: `src/__tests__/types-smoke.test.ts` (new)

- [ ] **Step 1.1: Write failing test that exercises the new fields**

Create `src/__tests__/types-smoke.test.ts`:

```typescript
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
```

- [ ] **Step 1.2: Run test to verify TS compile error**

Run: `npm test -- src/__tests__/types-smoke.test.ts`
Expected: type errors on `prerequisites`, `phase`, `phaseOrder`, `aliasOf`, `type` (unknown properties).

- [ ] **Step 1.3: Extend the type**

In `src/types.ts`, replace the `RoadmapNode` interface with:

```typescript
export type RoadmapNodeType = "topic" | "reference" | "recurring";

export interface RoadmapNode {
  id: string;
  title: string;
  summary?: string;
  resources?: string[];
  children?: RoadmapNode[];
  prerequisites?: string[];
  phase?: string;
  phaseOrder?: number;
  aliasOf?: string;
  type?: RoadmapNodeType;
}
```

- [ ] **Step 1.4: Run test to verify it passes**

Run: `npm test -- src/__tests__/types-smoke.test.ts`
Expected: PASS.

Run full suite: `npm test`
Expected: all existing tests still pass (new fields are optional).

- [ ] **Step 1.5: Commit**

```bash
git add src/types.ts src/__tests__/types-smoke.test.ts
git commit -m "feat(types): add prerequisites, phase, phaseOrder, aliasOf, type to RoadmapNode"
```

---

## Task 2 — Validation script skeleton + ID uniqueness rule

**Files:**
- Create: `scripts/validate-roadmap.ts`
- Create: `scripts/roadmap-validator.ts` (pure functions, unit-testable)
- Create: `src/__tests__/roadmap-validator.test.ts`
- Modify: `package.json:5-11` (add `validate` script)

- [ ] **Step 2.1: Write failing test for duplicate ID detection**

Create `src/__tests__/roadmap-validator.test.ts`:

```typescript
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
```

- [ ] **Step 2.2: Run test to verify failure**

Run: `npm test -- src/__tests__/roadmap-validator.test.ts`
Expected: FAIL — cannot resolve module `../../scripts/roadmap-validator`.

- [ ] **Step 2.3: Implement `checkUniqueIds`**

Create `scripts/roadmap-validator.ts`:

```typescript
import type { RoadmapNode } from "../src/types";

export function collectAllIds(nodes: RoadmapNode[]): Map<string, number> {
  const counts = new Map<string, number>();
  function walk(ns: RoadmapNode[]) {
    for (const n of ns) {
      counts.set(n.id, (counts.get(n.id) ?? 0) + 1);
      if (n.children) walk(n.children);
    }
  }
  walk(nodes);
  return counts;
}

export function checkUniqueIds(nodes: RoadmapNode[]): string[] {
  const counts = collectAllIds(nodes);
  const errors: string[] = [];
  for (const [id, count] of counts) {
    if (count > 1) errors.push(`Duplicate ID: "${id}" appears ${count} times`);
  }
  return errors;
}
```

- [ ] **Step 2.4: Run test to verify pass**

Run: `npm test -- src/__tests__/roadmap-validator.test.ts`
Expected: PASS.

- [ ] **Step 2.5: Create CLI entry point**

Create `scripts/validate-roadmap.ts`:

```typescript
import { getRoadmap } from "../src/data/roadmap";
import { checkUniqueIds } from "./roadmap-validator";

function main() {
  const roadmap = getRoadmap();
  const errors = [...checkUniqueIds(roadmap)];

  if (errors.length > 0) {
    console.error("Roadmap validation failed:");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log("Roadmap validation passed.");
}

main();
```

- [ ] **Step 2.6: Add `validate` npm script**

In `package.json`, in the `scripts` block, add after `"lint": "eslint ."`:

```json
    "validate": "tsx scripts/validate-roadmap.ts",
```

Also add `tsx` to devDependencies if not present:

```bash
npm install --save-dev tsx
```

- [ ] **Step 2.7: Run `npm run validate` against current YAML**

Run: `npm run validate`
Expected: reports duplicate IDs for `pandas`, `numpy-basics`, `matplotlib-seaborn`, `jupyter-notebooks` (these are the known duplicates — confirms script works). Exit code 1.

- [ ] **Step 2.8: Commit (with known failing validate — will be fixed by Task 4)**

```bash
git add scripts/ src/__tests__/roadmap-validator.test.ts package.json package-lock.json
git commit -m "feat(validate): add ID uniqueness rule + CLI entry"
```

---

## Task 3 — Validator: alias + phase + prereq + cycle rules

**Files:**
- Modify: `scripts/roadmap-validator.ts`
- Modify: `src/__tests__/roadmap-validator.test.ts`

- [ ] **Step 3.1: Write failing tests for alias, phase, prereq, cycle rules**

Add to `src/__tests__/roadmap-validator.test.ts`:

```typescript
import {
  checkAliasTargets,
  checkPrereqExistence,
  checkPrereqCycles,
  checkPhaseOrderUniqueness,
} from "../../scripts/roadmap-validator";

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
```

- [ ] **Step 3.2: Run failing tests**

Run: `npm test -- src/__tests__/roadmap-validator.test.ts`
Expected: FAIL — 4 new exports missing.

- [ ] **Step 3.3: Implement the four new rules**

Add to `scripts/roadmap-validator.ts`:

```typescript
function flattenNodes(nodes: RoadmapNode[]): RoadmapNode[] {
  const out: RoadmapNode[] = [];
  function walk(ns: RoadmapNode[]) {
    for (const n of ns) {
      out.push(n);
      if (n.children) walk(n.children);
    }
  }
  walk(nodes);
  return out;
}

export function checkAliasTargets(nodes: RoadmapNode[]): string[] {
  const flat = flattenNodes(nodes);
  const byId = new Map(flat.map((n) => [n.id, n]));
  const errors: string[] = [];
  for (const n of flat) {
    if (!n.aliasOf) continue;
    const target = byId.get(n.aliasOf);
    if (!target) {
      errors.push(`Alias "${n.id}" points to missing id "${n.aliasOf}"`);
      continue;
    }
    if (target.aliasOf) {
      errors.push(
        `Alias "${n.id}" points to "${n.aliasOf}" which is itself an alias (chain not allowed)`
      );
    }
  }
  return errors;
}

export function checkPrereqExistence(nodes: RoadmapNode[]): string[] {
  const flat = flattenNodes(nodes);
  const byId = new Map(flat.map((n) => [n.id, n]));
  const errors: string[] = [];
  for (const n of flat) {
    if (!n.prerequisites) continue;
    for (const p of n.prerequisites) {
      const target = byId.get(p);
      if (!target) {
        errors.push(`Topic "${n.id}" has unknown prerequisite "${p}"`);
      } else if (target.aliasOf) {
        errors.push(
          `Topic "${n.id}" has prerequisite "${p}" which is an alias — use canonical id`
        );
      }
    }
  }
  return errors;
}

export function checkPrereqCycles(nodes: RoadmapNode[]): string[] {
  const flat = flattenNodes(nodes);
  const adj = new Map<string, string[]>();
  for (const n of flat) adj.set(n.id, n.prerequisites ?? []);

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const id of adj.keys()) color.set(id, WHITE);
  const errors: string[] = [];

  function dfs(id: string, stack: string[]): boolean {
    color.set(id, GRAY);
    for (const nxt of adj.get(id) ?? []) {
      if (color.get(nxt) === GRAY) {
        errors.push(`Prereq cycle: ${[...stack, id, nxt].join(" -> ")}`);
        return true;
      }
      if (color.get(nxt) === WHITE && dfs(nxt, [...stack, id])) return true;
    }
    color.set(id, BLACK);
    return false;
  }

  for (const id of adj.keys()) {
    if (color.get(id) === WHITE) dfs(id, []);
  }
  return errors;
}

export function checkPhaseOrderUniqueness(nodes: RoadmapNode[]): string[] {
  const flat = flattenNodes(nodes);
  const seen = new Map<string, string>(); // phase:order -> id
  const errors: string[] = [];
  for (const n of flat) {
    if (!n.phase || n.phaseOrder === undefined) continue;
    const key = `${n.phase}:${n.phaseOrder}`;
    const prev = seen.get(key);
    if (prev) {
      errors.push(
        `Duplicate phaseOrder ${n.phaseOrder} in phase ${n.phase}: "${prev}" and "${n.id}"`
      );
    } else {
      seen.set(key, n.id);
    }
  }
  return errors;
}
```

- [ ] **Step 3.4: Wire new rules into CLI**

In `scripts/validate-roadmap.ts` replace the `errors` line:

```typescript
  const errors = [
    ...checkUniqueIds(roadmap),
    ...checkAliasTargets(roadmap),
    ...checkPrereqExistence(roadmap),
    ...checkPrereqCycles(roadmap),
    ...checkPhaseOrderUniqueness(roadmap),
  ];
```

Add corresponding imports at the top:

```typescript
import {
  checkUniqueIds,
  checkAliasTargets,
  checkPrereqExistence,
  checkPrereqCycles,
  checkPhaseOrderUniqueness,
} from "./roadmap-validator";
```

- [ ] **Step 3.5: Run tests and CLI**

Run: `npm test -- src/__tests__/roadmap-validator.test.ts`
Expected: all pass.

Run: `npm run validate`
Expected: still fails on duplicate IDs (to be fixed in Task 4), but runs all rules.

- [ ] **Step 3.6: Commit**

```bash
git add scripts/ src/__tests__/roadmap-validator.test.ts
git commit -m "feat(validate): add alias/prereq/cycle/phaseOrder rules"
```

---

## Task 4 — Alias resolution in loader + progress redirect

**Files:**
- Modify: `src/data/roadmap.ts`
- Modify: `src/utils/progress.ts`
- Create: `src/__tests__/data/roadmap-alias.test.ts`
- Create: `src/__tests__/utils/progress-alias.test.ts`

- [ ] **Step 4.1: Write failing test for alias hiding in roadmap tree**

Create `src/__tests__/data/roadmap-alias.test.ts`:

```typescript
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
```

- [ ] **Step 4.2: Write failing test for progress redirect**

Create `src/__tests__/utils/progress-alias.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { resolveProgressId, getProgressStatus, setProgressStatus } from "../../utils/progress";
import type { Status } from "../../types";

describe("resolveProgressId", () => {
  it("returns canonical id when alias provided", () => {
    const aliasMap = new Map([["old-id", "new-id"]]);
    expect(resolveProgressId("old-id", aliasMap)).toBe("new-id");
  });
  it("returns id unchanged when not an alias", () => {
    const aliasMap = new Map();
    expect(resolveProgressId("x", aliasMap)).toBe("x");
  });
});

describe("getProgressStatus / setProgressStatus with aliases", () => {
  it("getProgressStatus redirects alias to canonical", () => {
    const progress: Record<string, Status> = { canonical: "done" };
    const aliasMap = new Map([["alias", "canonical"]]);
    expect(getProgressStatus("alias", progress, aliasMap)).toBe("done");
  });
  it("setProgressStatus writes to canonical when given alias", () => {
    const progress: Record<string, Status> = {};
    const aliasMap = new Map([["alias", "canonical"]]);
    setProgressStatus("alias", "in_progress", progress, aliasMap);
    expect(progress).toEqual({ canonical: "in_progress" });
  });
  it("setProgressStatus preserves existing alias entries by migrating to canonical", () => {
    const progress: Record<string, Status> = { alias: "done" };
    const aliasMap = new Map([["alias", "canonical"]]);
    // Simulate read-then-write flow that the UI would do
    const status = getProgressStatus("alias", progress, aliasMap);
    setProgressStatus("alias", status, progress, aliasMap);
    expect(progress.canonical).toBe("done");
  });
});
```

- [ ] **Step 4.3: Run failing tests**

Run: `npm test -- src/__tests__/data/roadmap-alias.test.ts src/__tests__/utils/progress-alias.test.ts`
Expected: FAIL — missing exports.

- [ ] **Step 4.4: Implement `resolveAliases` and `buildAliasMap`**

In `src/data/roadmap.ts`, add before the `const roadmap: RoadmapNode[]`:

```typescript
export function buildAliasMap(nodes: RoadmapNode[]): Map<string, string> {
  const map = new Map<string, string>();
  function walk(ns: RoadmapNode[]) {
    for (const n of ns) {
      if (n.aliasOf) map.set(n.id, n.aliasOf);
      if (n.children) walk(n.children);
    }
  }
  walk(nodes);
  return map;
}

export function resolveAliases(nodes: RoadmapNode[]): RoadmapNode[] {
  return nodes
    .filter((n) => !n.aliasOf)
    .map((n) => ({
      ...n,
      children: n.children ? resolveAliases(n.children) : undefined,
    }));
}
```

Replace the final `const roadmap` block with:

```typescript
const rawRoadmap: RoadmapNode[] = [
  ...(backend as RoadmapNode[]),
  ...(arch as RoadmapNode[]),
  ...(devops as RoadmapNode[]),
  ...(dataAnalysis as RoadmapNode[]),
  ...(python as RoadmapNode[]),
  ...(aiAgents as RoadmapNode[]),
  ...(english as RoadmapNode[]),
  ...(aiDevTools as RoadmapNode[]),
];

const aliasMap = buildAliasMap(rawRoadmap);
const roadmap = resolveAliases(rawRoadmap);

export function getAliasMap(): Map<string, string> {
  return aliasMap;
}
```

- [ ] **Step 4.5: Implement progress alias helpers**

In `src/utils/progress.ts`, add at top after imports:

```typescript
export function resolveProgressId(id: string, aliasMap: Map<string, string>): string {
  return aliasMap.get(id) ?? id;
}

export function getProgressStatus(
  id: string,
  progress: Record<string, Status>,
  aliasMap: Map<string, string>
): Status | undefined {
  const canonical = resolveProgressId(id, aliasMap);
  // Prefer canonical, but fall back to legacy alias entry for read-then-migrate flows
  return progress[canonical] ?? progress[id];
}

export function setProgressStatus(
  id: string,
  status: Status,
  progress: Record<string, Status>,
  aliasMap: Map<string, string>
): void {
  const canonical = resolveProgressId(id, aliasMap);
  progress[canonical] = status;
  if (canonical !== id) delete progress[id];
}
```

- [ ] **Step 4.6: Run tests to verify pass**

Run: `npm test`
Expected: all tests pass (new alias tests + existing suite).

- [ ] **Step 4.7: Commit**

```bash
git add src/data/roadmap.ts src/utils/progress.ts src/__tests__/data/roadmap-alias.test.ts src/__tests__/utils/progress-alias.test.ts
git commit -m "feat(loader): resolve aliasOf nodes and redirect progress to canonical"
```

---

## Task 5 — Apply `aliasOf` to 5 known duplicate topics

**Files:**
- Modify: `data/roadmap/04-data-analysis.yaml` (4 duplicates)
- Modify: `data/roadmap/04-data-analysis.yaml` (genai-awareness)

**Rationale:** Canonical versions live in `05-python.yaml` (py-pandas, py-numpy, py-matplotlib, py-jupyter) and `06-ai-agents.yaml` (prompt-engineering). The 04 versions become alias stubs.

- [ ] **Step 5.1: Convert `pandas` in `04-data-analysis.yaml` to alias**

Find the `pandas` entry (under `python-data` group) and replace the full node body with:

```yaml
        - id: pandas
          title: "Pandas: DataFrame, groupby, merge, pivot"
          aliasOf: py-pandas
```

(Keep the existing `title` so legacy UI references still render a label if alias map ever fails. Remove `summary` and `resources` — canonical has them.)

- [ ] **Step 5.2: Convert `numpy-basics` to alias**

```yaml
        - id: numpy-basics
          title: "NumPy: array operations"
          aliasOf: py-numpy
```

- [ ] **Step 5.3: Convert `matplotlib-seaborn` to alias**

```yaml
        - id: matplotlib-seaborn
          title: "Matplotlib & Seaborn: visualization"
          aliasOf: py-matplotlib
```

- [ ] **Step 5.4: Convert `jupyter-notebooks` to alias**

```yaml
        - id: jupyter-notebooks
          title: "Jupyter Notebooks workflow"
          aliasOf: py-jupyter
```

- [ ] **Step 5.5: Convert `genai-awareness` to alias**

```yaml
        - id: genai-awareness
          title: "GenAI/LLM: conceptual awareness for analysts"
          aliasOf: prompt-engineering
```

- [ ] **Step 5.6: Run validator**

Run: `npm run validate`
Expected: passes all rules implemented so far (no duplicate IDs, no broken aliases).

- [ ] **Step 5.7: Run full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 5.8: Commit**

```bash
git add data/roadmap/04-data-analysis.yaml
git commit -m "refactor(roadmap): alias 5 duplicate topics in 04-data-analysis to canonicals"
```

---

## Task 6 — Author 3 new Phase 3 topics (hexagonal + 2 security basics)

**Files:**
- Modify: `data/roadmap/02-arch.yaml` (hexagonal-architecture goes under `low-level-design`)
- Modify: `data/roadmap/03-devops.yaml` (new `security-fundamentals` group with crypto + secure-coding basics; these belong conceptually to Phase 3 even though file = devops, placement is convenient for future extraction)

**Design choice:** Keep all security topics in `03-devops.yaml` in a single new group `security-fundamentals` — this avoids scattering across files and matches devops' role as the security home.

- [ ] **Step 6.1: Add `hexagonal-architecture` to `02-arch.yaml`**

Inside the `low-level-design.children` array, add after `lld-grokking`:

```yaml
        - id: hexagonal-architecture
          title: "Hexagonal Architecture / Ports & Adapters"
          summary: "Hexagonal architecture (Alistair Cockburn) isolates domain logic from infrastructure by routing all interactions through explicit ports and adapters — enabling tests without a database, swap of messaging backends, and clean dependency rule (outer depends on inner). It's the concrete implementation pattern behind Clean Architecture and the foundation for testable microservices."
          resources:
            - "Alistair Cockburn: Hexagonal Architecture original essay (alistair.cockburn.us/hexagonal-architecture)"
            - "Book: Get Your Hands Dirty on Clean Architecture (Tom Hombergs, Packt)"
            - "Book: Clean Architecture, Chapters 21-22 (Robert C. Martin)"
            - "GitHub: thombergs/buckpal — reference hexagonal app in Java"
            - "InfoQ: Hexagonal Architecture explained (infoq.com)"
```

- [ ] **Step 6.2: Add `security-fundamentals` group with crypto + secure-coding to `03-devops.yaml`**

Inside the top-level `devops.children` array, add after the existing `security` group:

```yaml
    - id: security-fundamentals
      title: "Security Fundamentals"
      children:
        - id: crypto-fundamentals
          title: "Cryptography Fundamentals: symmetric, asymmetric, hashing, HMAC"
          summary: "Every backend developer must distinguish symmetric (AES, ChaCha20) from asymmetric (RSA, ECDSA) crypto, understand hashing (SHA-2/3 vs password hashing with bcrypt/argon2/scrypt), and know when HMAC is needed instead of plain hash — wrong choices here cause real-world breaches. Foundational knowledge before touching TLS, JWT, or authn/authz code."
          resources:
            - "Book: Serious Cryptography, 2nd Ed (Jean-Philippe Aumasson)"
            - "Cryptography I (Stanford, Dan Boneh) — free on Coursera"
            - "OWASP Cheat Sheet: Password Storage (cheatsheetseries.owasp.org)"
            - "libsodium docs: modern crypto library (doc.libsodium.org)"
            - "Filippo Valsorda blog: practical cryptography posts (filippo.io)"
        - id: secure-coding-basics
          title: "Secure Coding Basics: input validation, output encoding, injection"
          summary: "Secure coding boils down to treating all external input as hostile (validation at boundaries), encoding output for the correct context (HTML, SQL, shell), and using parameterized queries/prepared statements instead of string concatenation. Mastery of these three habits prevents 80%+ of OWASP Top 10 issues."
          resources:
            - "OWASP Secure Coding Practices Quick Reference (owasp.org)"
            - "OWASP Cheat Sheets: Input Validation + Output Encoding (cheatsheetseries.owasp.org)"
            - "Book: The Tangled Web (Michal Zalewski)"
            - "PortSwigger Web Security Academy: Injection labs (portswigger.net/web-security)"
            - "Book: Iron-Clad Java (Jim Manico, August Detlefsen)"
```

- [ ] **Step 6.3: Run validator + tests**

```bash
npm run validate
npm test
```

Expected: pass (no new IDs conflict; no phase/phaseOrder yet so those rules are vacuous for new topics).

- [ ] **Step 6.4: Commit**

```bash
git add data/roadmap/02-arch.yaml data/roadmap/03-devops.yaml
git commit -m "feat(roadmap): add Phase 3 topics — hexagonal arch, crypto, secure coding"
```

---

## Task 7 — Author 6 new Phase 4 topics (NoSQL + isolation + applied security)

**Files:**
- Modify: `data/roadmap/01-backend.yaml` (mongodb, redis, isolation-levels under new `nosql-and-transactions` group)
- Modify: `data/roadmap/03-devops.yaml` (tls-mtls, session-csrf-headers, secret-management under `security-fundamentals`)

- [ ] **Step 7.1: Add `nosql-and-transactions` group to `01-backend.yaml`**

Inside the top-level `backend.children` array, add after the `postgresql` group:

```yaml
    - id: nosql-and-transactions
      title: "NoSQL & Transaction Semantics"
      children:
        - id: mongodb-fundamentals
          title: "MongoDB: document model, indexes, aggregation pipeline"
          summary: "MongoDB's document model (BSON documents grouped in collections) fits hierarchical/semi-structured data well, but schema flexibility shifts validation into the application layer; mastering indexes (compound, multikey, text) and the aggregation pipeline ($match → $group → $lookup) is essential for any production MongoDB usage."
          resources:
            - "MongoDB University: M001 + M121 (free, university.mongodb.com)"
            - "MongoDB Docs: Aggregation Pipeline (docs.mongodb.com/manual/aggregation)"
            - "Book: MongoDB: The Definitive Guide, 3rd Ed (Bradshaw, Brazil, Chodorow)"
            - "Kyle Banker: The Little MongoDB Book (free PDF)"
            - "Baeldung: Spring Data MongoDB tutorials (baeldung.com)"
        - id: redis-deep
          title: "Redis Deep Dive: data types, persistence, cluster, pub/sub"
          summary: "Redis goes far beyond a key-value cache: lists, sorted sets, streams, HyperLogLog, and geospatial indexes enable specialized data structures server-side; persistence (RDB vs AOF), cluster mode (hash slots), and pub/sub patterns make Redis a lightweight alternative to full message brokers for many use cases."
          resources:
            - "Redis University: RU101 + RU201 (free, university.redis.io)"
            - "Redis docs: Data types + persistence (redis.io/docs)"
            - "Book: Redis in Action (Josiah Carlson) — older but still the best conceptual guide"
            - "Salvatore Sanfilippo blog: antirez.com (Redis author, design notes)"
            - "Baeldung: Spring Data Redis tutorials (baeldung.com)"
        - id: isolation-levels-practical
          title: "Isolation Levels in Practice: RC, RR, SER, phantom, lost update"
          summary: "SQL isolation levels (Read Committed, Repeatable Read, Serializable) are not academic — each has distinct concurrent-write anomalies (lost update, phantom read, write skew) that appear under load; understanding how PostgreSQL MVCC, MySQL InnoDB locking, and optimistic concurrency implement these is the difference between a correct system and a data-corruption incident."
          resources:
            - "Martin Kleppmann: Hermitage — isolation level test suite (github.com/ept/hermitage)"
            - "Book: Designing Data-Intensive Applications, Chapter 7 (Kleppmann)"
            - "PostgreSQL Docs: Transaction Isolation (postgresql.org/docs/current/transaction-iso.html)"
            - "Jepsen.io: consistency models reference (jepsen.io/consistency)"
            - "Blog: Peter Bailis — Weak Isolation in Modern Databases (bailis.org)"
```

- [ ] **Step 7.2: Add applied-security topics to `security-fundamentals` group in `03-devops.yaml`**

Inside `security-fundamentals.children`, append after `secure-coding-basics`:

```yaml
        - id: tls-mtls
          title: "TLS & mTLS: handshake, certificates, mutual auth"
          summary: "TLS 1.3 handshake (ClientHello → ServerHello → certificate exchange → finished) establishes encrypted connections, and mTLS adds client certificate verification for service-to-service authentication in microservices or service meshes; knowing how to debug handshake failures with openssl s_client is a required troubleshooting skill."
          resources:
            - "Cloudflare Learning: How TLS 1.3 works (cloudflare.com/learning/ssl)"
            - "Book: Bulletproof TLS and PKI, 2nd Ed (Ivan Ristić)"
            - "RFC 8446: TLS 1.3 specification (tools.ietf.org/html/rfc8446)"
            - "SmallStep docs: Everything about mTLS (smallstep.com/hello-mtls)"
            - "OpenSSL Cookbook (feistyduck.com, free)"
        - id: session-csrf-headers
          title: "Session Management, CSRF, and Security Headers"
          summary: "Sessions (cookie vs token, SameSite, HttpOnly, Secure flags), CSRF protection (synchronizer tokens, double-submit cookies), and security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) are the defensive layer against session hijacking, cross-site attacks, and MIME sniffing — every web backend developer needs this baseline."
          resources:
            - "OWASP Cheat Sheets: Session Management + CSRF Prevention (cheatsheetseries.owasp.org)"
            - "MDN: HTTP security headers (developer.mozilla.org)"
            - "Content Security Policy reference (content-security-policy.com)"
            - "Spring Security docs: CSRF + Session Management (docs.spring.io/spring-security)"
            - "PortSwigger: CSRF and session fixation labs (portswigger.net/web-security)"
        - id: secret-management
          title: "Secret Management: Vault, KMS, env-var anti-patterns"
          summary: "Storing secrets in env vars or config files leaks them into logs, crash dumps, and CI artifacts; production systems use HashiCorp Vault or cloud KMS (AWS KMS, GCP Secret Manager) with short-lived leases, automatic rotation, and audit trails. Understanding the threat model (who can read the process memory, filesystem, env) drives the choice."
          resources:
            - "HashiCorp Vault: Getting Started (learn.hashicorp.com/vault)"
            - "AWS KMS Developer Guide (docs.aws.amazon.com/kms)"
            - "12factor.net: Config section + its limitations (12factor.net/config)"
            - "CNCF: Secrets Management whitepaper (cncf.io)"
            - "Spring Cloud Vault docs (docs.spring.io/spring-cloud-vault)"
```

- [ ] **Step 7.3: Run validator + tests**

```bash
npm run validate
npm test
```

- [ ] **Step 7.4: Commit**

```bash
git add data/roadmap/01-backend.yaml data/roadmap/03-devops.yaml
git commit -m "feat(roadmap): add Phase 4 topics — NoSQL, isolation levels, applied security"
```

---

## Task 8 — Author 5 new Phase 5 topics (arch-level)

**Files:**
- Modify: `data/roadmap/02-arch.yaml` (all 5 under existing `system-design-hld` group except authz-models + threat-modeling which go into a new `architecture-security` group for clarity)

- [ ] **Step 8.1: Add `oltp-vs-olap`, `resilience-patterns-practical`, `network-protocols` to `system-design-hld`**

Inside `system-design-hld.children`, append (order doesn't matter yet; `phaseOrder` assigned in Task 12):

```yaml
        - id: oltp-vs-olap
          title: "OLTP vs OLAP: workload and storage trade-offs"
          summary: "OLTP (transactional, row-oriented, high write throughput, narrow queries) and OLAP (analytical, columnar, batch ingestion, wide aggregations) have fundamentally different storage engines and optimization goals; conflating them leads to either slow analytics on operational DBs or inconsistent real-time queries on warehouses. Recognizing which system serves which workload is a core architecture decision."
          resources:
            - "Book: Designing Data-Intensive Applications, Chapter 3 (Kleppmann)"
            - "Book: The Data Warehouse Toolkit, 3rd Ed (Kimball & Ross)"
            - "ClickHouse docs: Why columnar is fast (clickhouse.com/docs)"
            - "Snowflake: Data Warehouse whitepaper (snowflake.com/resources)"
            - "Jordan Tigani: Big Data is Dead (motherduck.com blog)"
        - id: resilience-patterns-practical
          title: "Resilience Patterns: bulkheads, timeouts, retry + jitter, rate limiting"
          summary: "Production systems survive dependency failures by combining bulkheads (resource isolation), timeouts (bounded waits), retry with exponential backoff + jitter (avoid thundering herd), and rate limiting (protect downstream); these four patterns — implemented together, not individually — are what separate availability-minded services from fragile ones."
          resources:
            - "Book: Release It!, 2nd Ed (Michael Nygard) — Stability Patterns chapters"
            - "Resilience4j docs (resilience4j.readme.io)"
            - "AWS Architecture Blog: Exponential Backoff and Jitter (aws.amazon.com/blogs)"
            - "Book: Site Reliability Engineering, Chapter 22 — Addressing Cascading Failures (sre.google/sre-book)"
            - "Netflix Hystrix wiki (archived): design notes (github.com/Netflix/Hystrix/wiki)"
        - id: network-protocols
          title: "Network Protocols: HTTP/2, HTTP/3, gRPC, WebSocket"
          summary: "Modern service-to-service and client-server communication relies on HTTP/2 (multiplexing, header compression), HTTP/3 (QUIC over UDP, better under packet loss), gRPC (binary, streaming, code generation), and WebSocket (full duplex); choosing the wrong protocol leads to latency problems that can't be fixed at the application layer."
          resources:
            - "Cloudflare Learning: HTTP/2 + HTTP/3 explainers (cloudflare.com/learning)"
            - "Book: High Performance Browser Networking (Ilya Grigorik, free at hpbn.co)"
            - "gRPC docs: Concepts + Performance (grpc.io/docs)"
            - "MDN: WebSockets API (developer.mozilla.org)"
            - "QUIC explained: RFC 9000 + Cloudflare posts"
```

- [ ] **Step 8.2: Add `architecture-security` group with `authz-models` and `threat-modeling-stride`**

Inside the top-level `arch.children` array, add after `fintech-patterns` and before `arch-practice`:

```yaml
    - id: architecture-security
      title: "Architecture-level Security"
      children:
        - id: authz-models
          title: "Authorization Models: RBAC vs ABAC, zero-trust"
          summary: "RBAC (role-based) is simple and auditable but rigid; ABAC (attribute-based) enables policy-as-code with dynamic rules (user + resource + context); zero-trust drops the perimeter assumption and verifies every request. Modern services layer these — RBAC for coarse roles, ABAC for fine-grained, mTLS + short-lived tokens for zero-trust networking."
          resources:
            - "NIST: ABAC Guide (csrc.nist.gov/publications/detail/sp/800-162/final)"
            - "OPA (Open Policy Agent) docs: openpolicyagent.org/docs"
            - "BeyondCorp: Google's zero-trust whitepaper (research.google/pubs/beyondcorp)"
            - "Book: Zero Trust Networks (Evan Gilman, Doug Barth)"
            - "AWS IAM: Policy evaluation logic (docs.aws.amazon.com/IAM)"
        - id: threat-modeling-stride
          title: "Threat Modeling with STRIDE"
          summary: "STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) is the most used threat modeling framework — walking each category against a data-flow diagram surfaces architectural security risks before code is written. It's a senior-level design-review habit, not a security team exclusive."
          resources:
            - "Microsoft: STRIDE Threat Modeling overview (learn.microsoft.com)"
            - "Book: Threat Modeling: Designing for Security (Adam Shostack)"
            - "OWASP: Threat Modeling Cheat Sheet (cheatsheetseries.owasp.org)"
            - "Tool: OWASP Threat Dragon (free, owasp.org/www-project-threat-dragon)"
            - "Book: Threats — What Every Engineer Should Learn from Star Wars (Adam Shostack)"
```

- [ ] **Step 8.3: Run validator + tests**

```bash
npm run validate
npm test
```

- [ ] **Step 8.4: Commit**

```bash
git add data/roadmap/02-arch.yaml
git commit -m "feat(roadmap): add Phase 5 topics — OLTP/OLAP, resilience, protocols, authz, STRIDE"
```

---

## Task 9 — Author 4 new Phase 6 topics (events)

**Files:**
- Modify: `data/roadmap/02-arch.yaml` (`rabbitmq-vs-kafka`, `schema-registry-evolution`, `dlq-poison-messages`, `consumer-idempotency` — new group `messaging-advanced` inside `event-driven-arch`)

- [ ] **Step 9.1: Add 4 new topics to `event-driven-arch` group**

Inside the `event-driven-arch.children` array in `02-arch.yaml`, append after `outbox-pattern`:

```yaml
        - id: rabbitmq-vs-kafka
          title: "RabbitMQ vs Kafka vs NATS/Pulsar: trade-offs"
          summary: "RabbitMQ (smart broker, dumb consumer — routing, per-message ack, priority queues) and Kafka (dumb broker, smart consumer — replayable log, high throughput, partitioned) solve different problems; picking the wrong one leads to either impossible scaling or re-implementing features you don't need. NATS and Pulsar fill the middle (Pulsar) and latency-first (NATS JetStream) niches."
          resources:
            - "Confluent blog: Kafka vs RabbitMQ comparison (confluent.io/blog)"
            - "Book: RabbitMQ in Depth (Gavin Roy)"
            - "NATS docs: JetStream concepts (docs.nats.io)"
            - "Apache Pulsar docs: concepts (pulsar.apache.org/docs)"
            - "Martin Kleppmann: Kafka — A Distributed Messaging System (talk)"
        - id: schema-registry-evolution
          title: "Schema Registry: Avro, Protobuf, forward/backward compatibility"
          summary: "Production event-driven systems use Schema Registry (Confluent, Apicurio) to version message schemas in Avro or Protobuf and enforce compatibility rules (BACKWARD, FORWARD, FULL) at publish time; without it, a schema change in one team silently breaks downstream consumers weeks later."
          resources:
            - "Confluent: Schema Registry docs (docs.confluent.io/platform/current/schema-registry)"
            - "Apicurio Registry docs (apicur.io/registry)"
            - "Avro specification: schema resolution (avro.apache.org/docs)"
            - "Book: Kafka: The Definitive Guide, 2nd Ed — Schemas chapter (Gwen Shapira et al.)"
            - "Baeldung: Confluent Schema Registry + Spring Kafka (baeldung.com)"
        - id: dlq-poison-messages
          title: "Dead-Letter Queues & Poison Message Handling"
          summary: "A single malformed message can block a Kafka partition or saturate a RabbitMQ queue unless you route it to a dead-letter destination after N retries; DLQ strategy (backoff, retry topic, DLQ, manual replay) is the operational difference between resilient and fragile consumers."
          resources:
            - "Confluent blog: Kafka Retry + DLQ patterns (confluent.io/blog)"
            - "AWS SQS: Dead-letter queue docs (docs.aws.amazon.com/AWSSimpleQueueService)"
            - "RabbitMQ docs: Dead Letter Exchanges (rabbitmq.com/dlx.html)"
            - "Spring Kafka: retry topic / DLT configuration (docs.spring.io/spring-kafka)"
            - "Book: Designing Event-Driven Systems (Ben Stopford, free at confluent.io)"
        - id: consumer-idempotency
          title: "Consumer Idempotency: dedup keys, offset management, compensations"
          summary: "At-least-once delivery means the same message can arrive twice — idempotent consumers handle this with dedup tables keyed on message ID, careful offset commit order (after side effects, not before), or compensating actions for non-idempotent operations. This is mandatory for any financial/billing/inventory use case."
          resources:
            - "Confluent blog: Idempotent consumers in Kafka (confluent.io/blog)"
            - "Book: Designing Data-Intensive Applications, Chapter 11 (Kleppmann)"
            - "Microservices.io: Idempotent Consumer pattern (microservices.io/patterns)"
            - "Debezium docs: idempotent sinks (debezium.io/documentation)"
            - "Chris Richardson: Microservices Patterns book (Chapter 3)"
```

- [ ] **Step 9.2: Run validator + tests**

```bash
npm run validate
npm test
```

- [ ] **Step 9.3: Commit**

```bash
git add data/roadmap/02-arch.yaml
git commit -m "feat(roadmap): add Phase 6 topics — broker trade-offs, schema registry, DLQ, idempotency"
```

---

## Task 10 — Author 8 new Phase 8 topics (CI/CD + observability + IaC + cloud)

**Files:**
- Modify: `data/roadmap/03-devops.yaml` (observability-3-pillars appended to `observability`; 5 new ci-cd topics appended to `ci-cd`; 2 new iac+cloud under new `infra-and-cloud` group)

- [ ] **Step 10.1: Add `observability-3-pillars` to `observability` group**

Append inside `observability.children`:

```yaml
        - id: observability-3-pillars
          title: "Observability: Metrics, Logs, Traces — the three pillars"
          summary: "Metrics (aggregated, cheap, low cardinality), logs (detailed, high volume, unstructured-ish), and traces (causal, request-scoped) each answer different questions — metrics say 'is something wrong?', traces say 'where?', logs say 'what exactly happened?'. Modern observability (wide structured events, high-cardinality) unifies them; knowing which pillar to reach for first saves hours per incident."
          resources:
            - "Book: Observability Engineering (Charity Majors, Liz Fong-Jones, George Miranda)"
            - "Honeycomb: What is Observability? (honeycomb.io/what-is-observability)"
            - "CNCF: OpenTelemetry overview (opentelemetry.io/docs/concepts)"
            - "Peter Bourgon: Metrics, Tracing, and Logging (peter.bourgon.org)"
            - "Book: Site Reliability Engineering, Chapter 6 — Monitoring (sre.google/sre-book)"
```

- [ ] **Step 10.2: Add 5 new CI/CD topics to `ci-cd` group**

Append inside `ci-cd.children`:

```yaml
        - id: pipeline-principles
          title: "CI/CD Pipeline Principles: stages, fail-fast, caching, artifacts"
          summary: "A well-designed pipeline moves code through stages (lint → unit test → build → integration test → security scan → deploy) failing fast at the earliest cheap stage to minimize feedback loop; proper caching (deps, Docker layers) and artifact passing between stages are what turn a 40-min pipeline into a 6-min one."
          resources:
            - "Book: Continuous Delivery (Jez Humble & David Farley) — foundational"
            - "Martin Fowler: Continuous Integration article (martinfowler.com)"
            - "GitHub Actions: Dependency caching docs (docs.github.com/actions)"
            - "Book: Accelerate (Forsgren, Humble, Kim) — pipeline metrics"
            - "Jenkins Handbook: Pipeline section (jenkins.io/doc/book/pipeline)"
        - id: deployment-strategies
          title: "Deployment Strategies: blue-green, canary, rolling, shadow"
          summary: "Blue-green (two full environments, switch traffic), canary (small fraction first, observe, expand), rolling (gradual replacement, default in K8s Deployment), and shadow (mirror traffic without user impact) each trade off rollback speed, resource cost, and risk exposure; picking the right one for a given change is a senior decision."
          resources:
            - "Martin Fowler: BlueGreenDeployment (martinfowler.com/bliki)"
            - "Kubernetes docs: Deployment strategies (kubernetes.io/docs/concepts/workloads)"
            - "Argo Rollouts: Canary and Blue-Green (argoproj.github.io/argo-rollouts)"
            - "Book: Release It!, 2nd Ed — Deployment chapter (Michael Nygard)"
            - "Google Cloud: Deployment strategies guide (cloud.google.com/architecture)"
        - id: trunk-based-development
          title: "Trunk-Based Development vs GitFlow + merge queue"
          summary: "Trunk-based development (short-lived branches merged to main multiple times per day) is empirically correlated with higher delivery performance than long-lived feature branches (GitFlow); feature flags and merge queues make it viable at scale by decoupling 'code merged' from 'feature visible'."
          resources:
            - "trunkbaseddevelopment.com — canonical reference site"
            - "Paul Hammant: Trunk-Based Development book (free online)"
            - "Book: Accelerate (Forsgren, Humble, Kim) — branching research"
            - "GitHub: merge queue docs (docs.github.com/en/pull-requests)"
            - "Martin Fowler: FeatureToggle article (martinfowler.com)"
        - id: release-management
          title: "Release Management: SemVer, Conventional Commits, automated changelog"
          summary: "Semantic Versioning (MAJOR.MINOR.PATCH), Conventional Commits (feat:/fix:/breaking), and automated tools (release-please, semantic-release) together reduce release to a machine-verifiable process — version bumps, changelog entries, and Git tags all flow from commit messages, eliminating human error in release notes."
          resources:
            - "SemVer spec (semver.org)"
            - "Conventional Commits spec (conventionalcommits.org)"
            - "release-please docs (github.com/googleapis/release-please)"
            - "semantic-release docs (semantic-release.gitbook.io)"
            - "Book: Version Control with Git, 3rd Ed — Tags and Releases (Loeliger, McCullough)"
        - id: quality-gates
          title: "Quality Gates: coverage thresholds, SonarQube, static analysis in CI"
          summary: "Quality gates prevent regression by failing the build on coverage drops, new critical SonarQube issues, or SAST findings (Semgrep, CodeQL); the art is setting thresholds that catch real regressions without becoming box-ticking ceremony — start loose, tighten based on incident data."
          resources:
            - "SonarSource: Quality Gate docs (docs.sonarsource.com)"
            - "Semgrep: rules and CI integration (semgrep.dev/docs)"
            - "GitHub Advanced Security: CodeQL (docs.github.com/en/code-security)"
            - "JaCoCo coverage + thresholds (jacoco.org)"
            - "Book: Continuous Delivery, Chapter 4 — Implementing a Testing Strategy"
```

- [ ] **Step 10.3: Add `infra-and-cloud` group with IaC + cloud fundamentals**

In `03-devops.yaml`, inside `devops.children`, add before `devops-practice`:

```yaml
    - id: infra-and-cloud
      title: "Infrastructure & Cloud"
      children:
        - id: iac-terraform
          title: "Infrastructure as Code: Terraform basics, state, modules"
          summary: "Terraform expresses infrastructure as versioned declarative code; understanding state (remote backends, locking), modules (composable units), and plan/apply workflow is required for any cloud engineering work — without IaC, environments drift and reproducibility dies."
          resources:
            - "HashiCorp Learn: Terraform Getting Started (learn.hashicorp.com/terraform)"
            - "Book: Terraform: Up & Running, 3rd Ed (Yevgeniy Brikman)"
            - "Terraform Registry: module best practices (registry.terraform.io)"
            - "Awesome Terraform: github.com/shuaibiyy/awesome-terraform"
            - "Gruntwork blog: IaC patterns (gruntwork.io/blog)"
        - id: cloud-fundamentals
          title: "Cloud Fundamentals: AWS/GCP core services (compute, storage, network, IAM)"
          summary: "Entry-level fluency across AWS (EC2, S3, VPC, IAM, RDS) and GCP (Compute Engine, Cloud Storage, VPC, IAM, Cloud SQL) is baseline for a backend senior — you don't need to be a cloud architect, but you do need to read the architecture review and ask good questions about VPC design, IAM roles, and cost."
          resources:
            - "AWS Cloud Practitioner Essentials (free, aws.amazon.com/training)"
            - "Google Cloud Digital Leader learning path (free, cloud.google.com/training)"
            - "AWS Well-Architected Framework (docs.aws.amazon.com/wellarchitected)"
            - "Book: AWS Certified Solutions Architect Study Guide (Ben Piper, David Clinton)"
            - "Cloud Resume Challenge: forrestbrazeal.com/the-cloud-resume-challenge"
```

- [ ] **Step 10.4: Run validator + tests**

```bash
npm run validate
npm test
```

- [ ] **Step 10.5: Commit**

```bash
git add data/roadmap/03-devops.yaml
git commit -m "feat(roadmap): add Phase 8 topics — 3 pillars, CI/CD extended, IaC, cloud basics"
```

---

## Task 11 — Create `data/path.yaml` with phase + recurring skeleton

**Files:**
- Create: `data/path.yaml`
- Create: `src/types.ts` additions (new types for Path / Phase / Recurring)
- Create: `src/data/path.ts`
- Create: `src/__tests__/data/path.test.ts`

- [ ] **Step 11.1: Add Path types to `src/types.ts`**

At the bottom of `src/types.ts`, add:

```typescript
export interface PathPhase {
  id: string;
  title: string;
  summary?: string;
}

export interface PathRecurring {
  topicId: string;
  cadence: string;
}

export interface Path {
  id: string;
  title: string;
  phases: PathPhase[];
  recurring: PathRecurring[];
}

export interface PathFile {
  path: Path;
}
```

- [ ] **Step 11.2: Write failing test for path loader**

Create `src/__tests__/data/path.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { getPath } from "../../data/path";

describe("getPath", () => {
  it("returns path with 9 phases", () => {
    const p = getPath();
    expect(p.id).toBe("senior-backend-polyglot");
    expect(p.phases).toHaveLength(9);
    expect(p.phases[0].id).toBe("phase-1-programming");
    expect(p.phases[8].id).toBe("phase-9-specialization");
  });

  it("includes required recurring tracks", () => {
    const p = getPath();
    const ids = p.recurring.map((r) => r.topicId);
    expect(ids).toContain("leetcode-practice");
    expect(ids).toContain("clozemaster-practice");
    expect(ids).toContain("shadowing");
  });
});
```

- [ ] **Step 11.3: Run failing test**

Run: `npm test -- src/__tests__/data/path.test.ts`
Expected: FAIL — module `../../data/path` not found.

- [ ] **Step 11.4: Create `data/path.yaml`**

Create `data/path.yaml` with the full content from spec §1:

```yaml
path:
  id: senior-backend-polyglot
  title: "Senior Backend Polyglot Path"
  phases:
    - id: phase-1-programming
      title: "Programming Fundamentals"
      summary: "Язык и инструменты — Java core, Python basics, AI dev tools adoption"
    - id: phase-2-cs-foundations
      title: "CS Foundations"
      summary: "Алгоритмы, DS, Big-O, SQL basics, capacity basics"
    - id: phase-3-software-design
      title: "Software Design"
      summary: "OOP, SOLID, patterns, DDD, hexagonal, testing, security basics"
    - id: phase-4-backend-engineering
      title: "Backend Engineering"
      summary: "JVM, concurrency, Spring, Persistence (SQL + NoSQL), applied security"
    - id: phase-5-system-design-hld
      title: "System Design Foundations"
      summary: "HLD components, data stores, caching, resilience, network protocols, arch security"
    - id: phase-6-distributed-events
      title: "Distributed & Event-Driven"
      summary: "Microservices, event-driven patterns, Kafka, messaging alternatives, schema evolution"
    - id: phase-7-data-ml
      title: "Data & ML Foundations"
      summary: "Pandas, NumPy, statistics, visualization, ML basics, BI tools"
    - id: phase-8-devops
      title: "DevOps & Production"
      summary: "K8s, observability, CI/CD (extended), security ops, troubleshooting, IaC, cloud"
    - id: phase-9-specialization
      title: "Specialization — AI + Fintech + Interview"
      summary: "LLM/agents/MCP/RAG, fintech patterns, interview English, FAANG prep"
  recurring:
    - topicId: leetcode-practice
      cadence: "3x/week"
    - topicId: clozemaster-practice
      cadence: "daily"
    - topicId: talkio-ai
      cadence: "2x/week"
    - topicId: shadowing
      cadence: "daily"
    - topicId: anki-srs
      cadence: "daily"
    - topicId: elsa-speak
      cadence: "daily-15min"
    - topicId: lingvist
      cadence: "daily"
    - topicId: gliglish
      cadence: "daily-free-tier"
    - topicId: langua-call-mode
      cadence: "weekly"
    - topicId: javarush
      cadence: "ongoing"
    - topicId: exercism-java
      cadence: "ongoing"
    - topicId: codewars-java
      cadence: "ongoing"
    - topicId: codewars-python
      cadence: "ongoing"
    - topicId: exercism-python
      cadence: "ongoing"
    - topicId: ai-code-review
      cadence: "ongoing"
```

- [ ] **Step 11.5: Create loader `src/data/path.ts`**

```typescript
import pathYaml from "../../data/path.yaml";
import type { Path, PathFile } from "../types";

const file = pathYaml as PathFile;

export function getPath(): Path {
  return file.path;
}

export function getPhaseById(id: string) {
  return file.path.phases.find((p) => p.id === id);
}

export function getRecurringTopicIds(): string[] {
  return file.path.recurring.map((r) => r.topicId);
}
```

- [ ] **Step 11.6: Run tests**

Run: `npm test`
Expected: all pass.

- [ ] **Step 11.7: Commit**

```bash
git add data/path.yaml src/data/path.ts src/types.ts src/__tests__/data/path.test.ts
git commit -m "feat(path): add data/path.yaml with 9 phases + recurring tracks"
```

---

## Task 12 — Extend validator with phase coverage + recurring existence + study-plan compat

**Files:**
- Modify: `scripts/roadmap-validator.ts`
- Modify: `scripts/validate-roadmap.ts`
- Modify: `src/__tests__/roadmap-validator.test.ts`

- [ ] **Step 12.1: Write failing tests for three new rules**

Add to `src/__tests__/roadmap-validator.test.ts`:

```typescript
import {
  checkPhaseReferencesValid,
  checkEveryLeafHasPhaseOrType,
  checkRecurringTopicIds,
  checkStudyPlanTopicIds,
} from "../../scripts/roadmap-validator";

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

describe("checkEveryLeafHasPhaseOrType", () => {
  it("ok for recurring type without phase", () => {
    const nodes = [{ id: "a", title: "A", type: "recurring" }];
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
    const nodes = [{ id: "a", title: "A", aliasOf: "b" }, { id: "b", title: "B", phase: "p1" }];
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
```

- [ ] **Step 12.2: Run tests**

Run: `npm test -- src/__tests__/roadmap-validator.test.ts`
Expected: FAIL — 4 missing exports.

- [ ] **Step 12.3: Implement the four rules**

Append to `scripts/roadmap-validator.ts`:

```typescript
export function checkPhaseReferencesValid(
  nodes: RoadmapNode[],
  validPhases: Set<string>
): string[] {
  const flat = flattenNodes(nodes);
  const errors: string[] = [];
  for (const n of flat) {
    if (n.phase && !validPhases.has(n.phase)) {
      errors.push(`Topic "${n.id}" references unknown phase "${n.phase}"`);
    }
  }
  return errors;
}

export function checkEveryLeafHasPhaseOrType(nodes: RoadmapNode[]): string[] {
  const errors: string[] = [];
  function walk(ns: RoadmapNode[]) {
    for (const n of ns) {
      const isLeaf = !n.children || n.children.length === 0;
      const isAlias = !!n.aliasOf;
      if (isLeaf && !isAlias) {
        const okByPhase = !!n.phase;
        const okByType = n.type === "recurring" || n.type === "reference";
        if (!okByPhase && !okByType) {
          errors.push(`Leaf "${n.id}" has no phase and no type override`);
        }
      }
      if (n.children) walk(n.children);
    }
  }
  walk(nodes);
  return errors;
}

export function checkRecurringTopicIds(
  nodes: RoadmapNode[],
  recurringIds: string[]
): string[] {
  const flat = flattenNodes(nodes);
  const known = new Set(flat.map((n) => n.id));
  return recurringIds
    .filter((id) => !known.has(id))
    .map((id) => `Recurring topicId "${id}" does not exist in roadmap`);
}

export function checkStudyPlanTopicIds(
  nodes: RoadmapNode[],
  studyPlanIds: string[]
): string[] {
  const flat = flattenNodes(nodes);
  const known = new Set(flat.map((n) => n.id));
  return studyPlanIds
    .filter((id) => !known.has(id))
    .map((id) => `study-plan topicId "${id}" does not resolve to any roadmap entry`);
}
```

- [ ] **Step 12.4: Wire new rules into CLI**

Modify `scripts/validate-roadmap.ts`:

```typescript
import { getRoadmap } from "../src/data/roadmap";
import { getPath, getRecurringTopicIds } from "../src/data/path";
import { getStudyPlan } from "../src/data/studyPlan";
import {
  checkUniqueIds,
  checkAliasTargets,
  checkPrereqExistence,
  checkPrereqCycles,
  checkPhaseOrderUniqueness,
  checkPhaseReferencesValid,
  checkEveryLeafHasPhaseOrType,
  checkRecurringTopicIds,
  checkStudyPlanTopicIds,
} from "./roadmap-validator";

function main() {
  // IMPORTANT: use raw roadmap (before alias stripping) — we need alias nodes visible for validation
  const roadmap = getRawRoadmap();
  const path = getPath();
  const validPhases = new Set(path.phases.map((p) => p.id));

  const studyPlan = getStudyPlan();
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
    ...checkRecurringTopicIds(roadmap, getRecurringTopicIds()),
    ...checkStudyPlanTopicIds(roadmap, studyPlanIds),
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

Update the imports at the top to include `getRawRoadmap` and `checkPhaseCoverage`:

```typescript
import { getRawRoadmap } from "../src/data/roadmap";
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
} from "./roadmap-validator";
```

**Also add `getRawRoadmap` export to `src/data/roadmap.ts`:**

```typescript
export function getRawRoadmap(): RoadmapNode[] {
  return rawRoadmap;
}
```

**And implement `checkPhaseCoverage` in `scripts/roadmap-validator.ts`:**

```typescript
export function checkPhaseCoverage(
  nodes: RoadmapNode[],
  declaredPhases: string[]
): string[] {
  const flat = flattenNodes(nodes);
  const usedPhases = new Set(flat.map((n) => n.phase).filter(Boolean) as string[]);
  return declaredPhases
    .filter((p) => !usedPhases.has(p))
    .map((p) => `Phase "${p}" declared in path.yaml but no topic references it`);
}
```

Add the matching unit test to `src/__tests__/roadmap-validator.test.ts`:

```typescript
import { checkPhaseCoverage } from "../../scripts/roadmap-validator";

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
```

- [ ] **Step 12.5: Run tests**

Run: `npm test`
Expected: validator unit tests pass.

Run: `npm run validate`
Expected: fails with many "Leaf X has no phase and no type override" errors (expected — no topics have phases yet; fixed by Tasks 13-15).

- [ ] **Step 12.6: Commit**

```bash
git add scripts/ src/__tests__/roadmap-validator.test.ts src/data/roadmap.ts
git commit -m "feat(validate): add phase coverage, recurring, study-plan rules"
```

---

## Task 13 — Assign `phase` + `phaseOrder` + `type` to topics in 01-backend.yaml and 02-arch.yaml

**Files:**
- Modify: `data/roadmap/01-backend.yaml`
- Modify: `data/roadmap/02-arch.yaml`

**Guidance:**
- Every leaf topic gets `phase:` + `phaseOrder:`.
- Use increments of 10 (`10, 20, 30, ...`) for order; leave gaps to allow future inserts.
- Topics under `backend-practice` that are recurring platforms (javarush, exercism, codewars, leetcode-practice) get `type: recurring` **instead** of `phase`/`phaseOrder`.
- Topics under `backend-awesome-repos`, `backend-platforms`, `arch-awesome-repos`, `arch-books` get `type: reference` **in addition to** a phase (references belong to a phase conceptually and count toward percent).
- Refer to spec §2 (phase breakdown) for exact assignments.

- [ ] **Step 13.1: Assign phases in `01-backend.yaml` — group by group**

For each leaf node under the backend tree, add `phase` + `phaseOrder` fields (or `type: recurring`). Target phases:

- `interview-fundamentals.*` (6) → `phase: phase-1-programming`, `phaseOrder: 10..60`
- `java-modern.*` (6) → Phase 1, order 70..120
- `jvm-internals.*` (7) → Phase 4, order 10..70
- `concurrency.*` (5) → Phase 4, order 80..120
- `spring-ecosystem.*` (12) → Phase 4, order 150..260 (except `spring-ai` → Phase 9)
  - `spring-ai`: Phase 9, order 10
- `kotlin-backend.kotlin-idioms` → Phase 1, order 130
- `kotlin-backend.kotlin-coroutines` → Phase 4, order 130
- `kotlin-backend.kotlin-dsl` → Phase 3, order 100
- `kotlin-backend.ktor` → Phase 4, order 140
- `postgresql.*` (7) → Phase 4, order 300..360 (except `pg-pgvector` → Phase 9, order 20)
- `kafka.*` (8) → Phase 6, order 100..170
  - `transactional-outbox` → Phase 6, order 180
- `testing-strategy.*` (4) → Phase 3, order 110..140
- `nosql-and-transactions.*` (3, added in Task 7) → Phase 4, order 400..420
- `backend-practice.*` (8):
  - `javarush`, `exercism-java`, `codewars-java`, `leetcode-practice` → `type: recurring`
  - `educative-java`, `hyperskill-kotlin`, `spring-academy`, `testcontainers-workshop`, `kafka-tutorials-confluent` → Phase 4, `type: reference`, order 500..540
- `backend-awesome-repos.*` (7) → Phase 4, `type: reference`, order 600..660
- `backend-platforms.*` (5) → Phase 4, `type: reference`, order 700..740

Example edit (single node):

```yaml
        - id: collections-internals
          title: "Collections Internals: HashMap, ConcurrentHashMap, LinkedHashMap"
          summary: "..."
          resources:
            - "..."
          phase: phase-1-programming
          phaseOrder: 10
```

Apply similar additions to every leaf. Use an editor macro or sed-style batch to speed up; validate incrementally.

- [ ] **Step 13.2: Assign phases in `02-arch.yaml`**

- `algorithms-ds.*` (4) → Phase 2, order 10..40
- `system-design-hld.*`:
  - `sd-sql-interviews` → Phase 2, order 100
  - `sd-requirements`, `sd-capacity` → Phase 2, order 50..60
  - `sd-cap-theorem` → Phase 2, order 70
  - `sd-components`, `sd-data-stores`, `sd-caching`, `sd-failure-modes`, `sd-cost-estimation` → Phase 5, order 10..50
  - `sd-ai-components` → Phase 9, order 30
  - `oltp-vs-olap`, `resilience-patterns-practical`, `network-protocols` (added in Task 8) → Phase 5, order 60..80
- `low-level-design.*` (4 + hexagonal-architecture added in Task 6) → Phase 3, order 10..50
- `ddd.*` (3) → Phase 3, order 60..80
- `event-driven-arch.*` (4 + 4 added in Task 9) → Phase 6, order 10..80
- `microservices.*` (3) → Phase 6, order 200..220
- `fintech-patterns.*` (4) → Phase 9, order 100..130
- `architecture-security.*` (2 added in Task 8) → Phase 5, order 200..210
- `arch-practice.*` (6):
  - `bytebytego`, `hello-interview`, `educative-grokking` → Phase 5, `type: reference`, order 500..520
  - `codemia-io`, `pramp-sd`, `educative-lld` → Phase 9, `type: reference`, order 500..520
- `arch-awesome-repos.*` (8) → split between Phase 5 (system-design-primer, awesome-system-design-repo, awesome-scalability, martin-fowler-articles, high-scalability-blog, coding-interview-university, tech-interview-handbook) and Phase 3 (ddd-resources-repo), all `type: reference`, order 600+
- `arch-books.*` (4):
  - `book-ddia`, `book-sd-interview`, `book-clean-arch` → Phase 5, `type: reference`, order 700..720
  - `book-ddd-evans` → Phase 3, `type: reference`, order 700

- [ ] **Step 13.3: Run validator — expect cleaner errors**

Run: `npm run validate`
Expected: errors about phases remain only for topics in 03/04/05/06/07/08 YAMLs (next tasks). Topics in 01 and 02 should no longer trigger "no phase" errors.

- [ ] **Step 13.4: Commit**

```bash
git add data/roadmap/01-backend.yaml data/roadmap/02-arch.yaml
git commit -m "feat(roadmap): assign phase+phaseOrder to backend and arch topics"
```

---

## Task 14 — Assign `phase`/`phaseOrder`/`type` in 03-devops, 04-data-analysis, 05-python

**Files:**
- Modify: `data/roadmap/03-devops.yaml`
- Modify: `data/roadmap/04-data-analysis.yaml`
- Modify: `data/roadmap/05-python.yaml`

- [ ] **Step 14.1: `03-devops.yaml`**

- `kubernetes-dev.*` (5) → Phase 8, order 10..50
- `observability.*` (4 + observability-3-pillars) → Phase 8, order 100..140
- `ci-cd.*` (3 + 5 added in Task 10) → Phase 8, order 200..270
- `security.*` (3) → Phase 8, order 300..320
- `security-fundamentals.*` (5, added in Tasks 6-7):
  - `crypto-fundamentals`, `secure-coding-basics` → Phase 3, order 200..210
  - `tls-mtls`, `session-csrf-headers`, `secret-management` → Phase 4, order 500..520
- `troubleshooting.*` (3) → Phase 8, order 400..420
- `infra-and-cloud.*` (2, added in Task 10) → Phase 8, order 500..510
- `devops-practice.*` (5) → Phase 8, `type: reference`, order 600..640
- `devops-awesome-repos.*` (8) → Phase 8, `type: reference`, order 700..770

- [ ] **Step 14.2: `04-data-analysis.yaml`**

Aliased nodes (`pandas`, `numpy-basics`, `matplotlib-seaborn`, `jupyter-notebooks`, `genai-awareness`) do **not** get phase — they're aliases.

- `sql-analytics.*` (4) → Phase 2, order 200..230
- `statistics.*` (5) → Phase 7, order 10..50
- `visualization-tools.*` (2) → Phase 7, order 100..110
- `ml-basics.regression-classification`, `ml-basics.overfitting-crossval` → Phase 7, order 200..210
- `da-interview-prep.*` (3) → Phase 7, order 300..320
- `da-practice.*` (5):
  - `datalemur` → `type: recurring` (daily platform)
  - `stratascratch`, `mode-analytics`, `kaggle-eda`, `power-bi-learn` → Phase 7, `type: reference`, order 400..430
- `da-books.*` (4) → Phase 7, `type: reference`, order 500..530
- `da-awesome-repos.*` (5) → Phase 7, `type: reference`, order 600..640

- [ ] **Step 14.3: `05-python.yaml`**

- `python-fundamentals.*` (6) → Phase 1, order 150..200
- `python-data-libs.*` (5) → Phase 7, order 400..440 (these are canonicals for aliased 04 topics)
- `python-ml.*` (4):
  - `py-scikit-learn`, `py-pyspark` → Phase 7, order 500..510
  - `py-langchain`, `py-fastapi` → Phase 9, order 200..210
- `python-practice.*` (7):
  - `exercism-python`, `codewars-python` → `type: recurring`
  - `educative-python`, `leetcode-python`, `kaggle-notebooks`, `datacamp-python`, `coursera-python-umich`, `realpython` → Phase 1, `type: reference`, order 210..260
- `python-awesome-repos.*` (4) → Phase 1, `type: reference`, order 300..330
- `python-articles.*` (2) → Phase 1, `type: reference`, order 400..410

- [ ] **Step 14.4: Run validator + tests**

```bash
npm run validate
npm test
```

Expected: only topics in 06/07/08 trigger "no phase" errors now.

- [ ] **Step 14.5: Commit**

```bash
git add data/roadmap/03-devops.yaml data/roadmap/04-data-analysis.yaml data/roadmap/05-python.yaml
git commit -m "feat(roadmap): assign phase+phaseOrder to devops/data/python topics"
```

---

## Task 15 — Assign `phase`/`phaseOrder`/`type` in 06-ai-agents, 07-english, 08-ai-dev-tools

**Files:**
- Modify: `data/roadmap/06-ai-agents.yaml`
- Modify: `data/roadmap/07-english.yaml`
- Modify: `data/roadmap/08-ai-dev-tools.yaml`

- [ ] **Step 15.1: `06-ai-agents.yaml`**

All topics under `ai-agents` → Phase 9 with varying order:

- `llm-fundamentals.*` (4) → order 300..330
- `agent-architectures.*` (5) → order 400..440
- `agent-frameworks.*` (5) → order 500..540
- `mcp-protocol.*` (3) → order 600..620
- `rag-vectordb.*` (4) → order 700..730
- `agent-evals.*` (3) → order 800..820
- `ai-portfolio.*` (4) → order 900..930
- `ai-practice.*` (7) → `type: reference`, order 1000..1060
- `ai-books.*` (2) → `type: reference`, order 1100..1110
- `ai-awesome-repos.*` (8) → `type: reference`, order 1200..1270
- `ai-newsletters-blogs.*` (3) → `type: reference`, order 1300..1320

- [ ] **Step 15.2: `07-english.yaml`**

English phase IDs per spec (§"English Cross-Cutting Phase IDs"):

- `vocabulary-grammar.*` (5): `clozemaster-practice`, `anki-srs`, `lingvist` → `type: recurring`. Rest → `phase: english-phase1-activation`, order 10..50.
- `speaking.*` (7): `elsa-speak`, `talkio-ai`, `langua-call-mode`, `gliglish`, `shadowing` → `type: recurring`. `record-transcribe-fix`, `style-shift-drills` → `phase: english-phase2-immersion`, order 10..20.
- `writing.*` (4) → `phase: english-phase2-immersion`, order 100..130.
- `reading-listening.*` (5) → `phase: english-phase2-immersion`, order 200..240.
- `tech-english.*` (4) → `phase: english-phase2-immersion`, order 300..330.
- `interview-english.*` (5) → `phase: phase-9-specialization`, order 1400..1440.
- `immersion.*` (5) → `phase: english-phase3-polish`, order 10..50.
- `english-phases.*` (3) → `phase: english-phase3-polish`, `type: reference`, order 500..520.
- `english-awesome-repos.*` (5) → `phase: english-phase2-immersion`, `type: reference`, order 500..540.

Update the path validator to accept `english-phase1-activation`, `english-phase2-immersion`, `english-phase3-polish` as valid phase IDs. In `scripts/validate-roadmap.ts`:

```typescript
const validPhases = new Set([
  ...path.phases.map((p) => p.id),
  "english-phase1-activation",
  "english-phase2-immersion",
  "english-phase3-polish",
]);
```

- [ ] **Step 15.3: `08-ai-dev-tools.yaml`**

All 8 topics directly under `ai-dev-tools` (flat, no subgroups):

- `github-copilot`, `cursor-ide`, `claude-code` → Phase 1, order 250..270
- `ai-code-review` → `type: recurring`
- `ai-limitations` → Phase 9, order 1500
- `awesome-claude-code`, `awesome-cursor`, `ai-coding-benchmarks` → Phase 9, `type: reference`, order 1600..1620

- [ ] **Step 15.4: Run validator**

Run: `npm run validate`
Expected: only explicit prerequisite errors remain (if any test prereqs are present) — phase-assignment rule should now pass for all leaves.

- [ ] **Step 15.5: Run tests**

Run: `npm test`
Expected: all pass.

- [ ] **Step 15.6: Commit**

```bash
git add data/roadmap/06-ai-agents.yaml data/roadmap/07-english.yaml data/roadmap/08-ai-dev-tools.yaml scripts/validate-roadmap.ts
git commit -m "feat(roadmap): assign phase+phaseOrder to AI/english/dev-tools topics"
```

---

## Task 16 — Author explicit prerequisites (~30 edges)

**Files:**
- Modify: `data/roadmap/01-backend.yaml`, `02-arch.yaml`, `03-devops.yaml`, `05-python.yaml`, `06-ai-agents.yaml`

**Source:** spec §5 lists the target edges.

- [ ] **Step 16.1: Add prereqs in `01-backend.yaml`**

Examples (append `prerequisites:` to each listed topic):

```yaml
        - id: gc-zgc-shenandoah
          # ... existing fields
          prerequisites: [gc-g1]

        - id: jfr-async-profiler
          # ... existing fields
          prerequisites: [heap-stack-metaspace]

        - id: threadlocal-leaks
          # ... existing fields
          prerequisites: [heap-stack-metaspace]

        - id: virtual-threads-spring
          # ... existing fields
          prerequisites: [virtual-threads, completable-future]

        - id: spring-virtual-threads
          # ... existing fields
          prerequisites: [virtual-threads, spring-mvc-flow]

        - id: spring-transactional
          # ... existing fields
          prerequisites: [spring-bean-lifecycle, spring-data-jpa]

        - id: spring-autoconfig
          # ... existing fields
          prerequisites: [spring-bean-lifecycle]

        - id: kafka-exactly-once
          # ... existing fields
          prerequisites: [kafka-partitions, kafka-reliability]

        - id: kafka-streams
          # ... existing fields
          prerequisites: [kafka-partitions]

        - id: transactional-outbox
          # ... existing fields
          prerequisites: [outbox-pattern]
```

- [ ] **Step 16.2: Add prereqs in `02-arch.yaml`**

```yaml
        - id: saga-pattern
          prerequisites: [event-sourcing]

        - id: outbox-pattern
          prerequisites: [spring-transactional, kafka-connect-debezium]

        - id: schema-registry-evolution
          prerequisites: [kafka-partitions]

        - id: consumer-idempotency
          prerequisites: [kafka-exactly-once]

        - id: hexagonal-architecture
          prerequisites: [solid-principles, ddd-aggregates]

        - id: resilience-patterns-practical
          prerequisites: [sd-failure-modes]

        - id: authz-models
          prerequisites: [jwt-oauth2-deep]

        - id: threat-modeling-stride
          prerequisites: [owasp-top10]
```

- [ ] **Step 16.3: Add prereqs in `03-devops.yaml`**

```yaml
        - id: deployment-strategies
          prerequisites: [pipeline-principles]

        - id: release-management
          prerequisites: [trunk-based-development]

        - id: quality-gates
          prerequisites: [pipeline-principles]

        - id: iac-terraform
          prerequisites: [cloud-fundamentals]

        - id: secure-coding-basics
          prerequisites: [crypto-fundamentals]

        - id: tls-mtls
          prerequisites: [crypto-fundamentals]
```

- [ ] **Step 16.4: Add prereqs in `06-ai-agents.yaml`**

```yaml
        - id: mcp-server-building
          prerequisites: [mcp-spec, tool-calling]

        - id: chunking-strategies
          prerequisites: [embeddings]

        - id: rag-pipeline
          prerequisites: [embeddings, chunking-strategies]

        - id: project-mcp-server
          prerequisites: [mcp-server-building, python-async]

        - id: project-rag-codebase
          prerequisites: [pgvector-rag, rag-pipeline]

        - id: project-spring-ai-api
          prerequisites: [spring-ai, tool-calling]
```

And in `01-backend.yaml`:

```yaml
        - id: pg-pgvector
          prerequisites: [pg-indexing, embeddings]
```

- [ ] **Step 16.5: Run validator**

Run: `npm run validate`
Expected: **PASS** — all rules satisfied.

- [ ] **Step 16.6: Run tests**

Run: `npm test`
Expected: all pass.

- [ ] **Step 16.7: Commit**

```bash
git add data/roadmap/
git commit -m "feat(roadmap): add explicit prerequisites for intra-phase dependencies"
```

---

## Task 17 — Wire validator into build + final smoke test

**Files:**
- Modify: `package.json` (prebuild hook)
- Smoke test: manual browser check

- [ ] **Step 17.1: Add `prebuild` hook**

In `package.json` scripts block, add:

```json
    "prebuild": "npm run validate",
```

This runs validation before every `npm run build`, ensuring CI catches schema violations.

- [ ] **Step 17.2: Run `npm run build`**

Run: `npm run build`
Expected: validator passes, then tsc + vite build succeeds.

- [ ] **Step 17.3: Run `npm test` (full suite)**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 17.4: Manual smoke test in dev server**

```bash
npm run dev
```

Open the app in browser. Verify:
- All 8 directions render on the main roadmap view.
- Navigating into a topic still works.
- Previously marked-done topics remain done.
- No console errors about missing or aliased IDs.
- (If `/path` route was added) path view shows 9 phases.

- [ ] **Step 17.5: Commit**

```bash
git add package.json
git commit -m "chore: wire validate into prebuild hook"
```

---

## Done Criteria (from spec §Success Criteria)

- [x] All 272 existing topics resolvable by ID; zero user progress loss.
- [x] 26 new topics authored with summary + resources matching existing style.
- [x] `path.yaml` loads and validates; every non-recurring leaf has a phase.
- [x] Validation script catches broken prereqs and orphan IDs.
- [x] `npm run build` succeeds; existing tests pass.
- [x] Manual smoke test: all directions render, marked-done topics stay done.
