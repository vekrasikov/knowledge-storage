# Project B — Topic Content Enrichment

**Date:** 2026-04-17
**Status:** Proposed
**Scope:** Project B of 4 (A done; C, D future). See Out of Scope for C/D.

## Problem

Topics in the roadmap have `summary` (1-3 sentences) + `resources` (3-5 external links). Missing:

- Substantive explanation of concepts without jumping to external sources.
- Quick-recall "cheat sheet" material for interview prep and code review.
- Diagrams to anchor mental models (bytebytego-style).
- Back-of-envelope capacity numbers for system design topics.

Users still leave the app to find these. The roadmap becomes a glorified bookmark list rather than a learning system.

## Goals

1. Add four optional content layers per topic: **overview**, **cheat_sheet**, **visualization**, **capacity_planning**.
2. Render them in `TopicDetail.tsx` as collapsible accordion sections with persisted expand state.
3. Store content in per-topic markdown files with YAML frontmatter (`data/topics/<id>.md`) — not in the main roadmap YAML (which would balloon to unreadable size).
4. Support both Mermaid diagrams (inline text) and static images (fallback for complex architecture diagrams).
5. Pilot authoring on ~25 topics in Phases 5-6 (System Design + Distributed/Events) + ~15 with capacity_planning. Rest is just-in-time as the user studies each topic.
6. Keep the philosophy: topics without content show existing summary/resources unchanged — no regression.

## Non-Goals

- **Project C** — event-log userdata (status transition timestamps).
- **Project D** — dynamics analytics UI.
- AI-generated content without human review.
- Inline editing in the browser.
- Full-text search across content.
- PDF/print output.
- Mermaid syntax pre-validation in build step (we accept that bad syntax surfaces in UI at runtime during pilot).
- Changing existing `summary`/`resources` fields.

## Proposed Design

### 1. Data Model

#### File: `data/topics/<topic-id>.md`

Markdown body = `overview`. YAML frontmatter = everything else.

```markdown
---
id: gc-g1
cheat_sheet:
  key_facts:
    - "Default GC since Java 9"
    - "Divides heap into ~2048 equal-sized regions"
    - "Pause goal tunable via -XX:MaxGCPauseMillis=N (default 200ms)"
  commands:
    - "jstat -gc <pid> 1s                 # live GC metrics"
    - "jcmd <pid> GC.heap_info            # heap layout snapshot"
  trade_offs:
    headers: [Aspect, G1, ZGC, Shenandoah]
    rows:
      - [Pause time, "~200ms typical", "<1ms", "<1ms"]
      - [Heap size sweet spot, "4-64 GB", "8 GB - 16 TB", "1 GB - 16 TB"]
  pitfalls:
    - "Mixed collection regressions with Old-gen fragmentation"
    - "IHOP tuning often overlooked"
  interview_questions:
    - "Why G1 over Parallel for low-latency services?"
    - "Role of Remembered Sets?"
  extras_markdown: |
    ### Advanced notes
    Free-form markdown for anything not fitting the sections above.

capacity_planning:
  inputs:
    - { name: "Heap size", value: "16", unit: "GB" }
    - { name: "Allocation rate", value: "500", unit: "MB/s" }
  formulas:
    - "Time to fill Eden = (Eden size) / (allocation rate)"
  worked_example: |
    Eden ≈ 1/3 of 16 GB heap = 5.3 GB
    Time between Young GCs = 5.3 GB / 500 MB/s ≈ 10.6 s
  numbers_to_memorize:
    - "Young GC typical: 50-200ms with G1"
    - "Full GC with G1: seconds (should be rare)"

visualization:
  type: mermaid
  content: |
    graph LR
      Eden --> S0[Survivor 0]
      S0 --> S1[Survivor 1]
      S1 --> Old
      Old -->|Mixed GC| Eden
  alt: "G1 region lifecycle: Eden → Survivor → Old"
---

# Overview

G1 (Garbage-First) divides the heap into equally-sized regions...
(300-800 words of markdown — concept explained in author's own words)

## When to reach for G1

...
```

#### TypeScript types (`src/types.ts` additions)

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
  content?: string;   // mermaid source when type=mermaid
  src?: string;       // path from /public when type=image
  alt: string;        // always required for a11y
}

export interface TopicContent {
  id: string;
  overview?: string;                   // markdown body
  cheat_sheet?: CheatSheet;
  capacity_planning?: CapacityPlanning;
  visualization?: Visualization;
}
```

All fields are optional. Missing fields render nothing (UI shows only existing `summary`/`resources`).

### 2. File Layout & Loader

```
data/
├── path.yaml            (Project A)
├── study-plan.yaml      (existing)
├── roadmap/             (Project A)
│   └── *.yaml
└── topics/              NEW — per-topic content
    ├── gc-g1.md
    ├── kafka-partitions.md
    ├── sd-capacity.md
    └── ... (pilot ~25, grows over time)

public/
└── visualizations/      NEW — image fallback for complex diagrams
    └── <id>.svg
```

**Loader:** `src/data/topicContent.ts`

- At module load, use Vite's `import.meta.glob("/data/topics/*.md", { query: "?raw", import: "default", eager: true })` to pull raw file contents.
- Parse each via `gray-matter` → `{ data: Frontmatter, content: string }`.
- Validate frontmatter shape (manual predicate or `zod` schema).
- Populate `Map<string, TopicContent>` keyed on `frontmatter.id`.
- Export:
  - `getTopicContent(id: string, aliasMap: Map<string, string>): TopicContent | null` — resolves alias → canonical before lookup.
  - `getAllTopicContentIds(): string[]` — for validator coverage checks.

**Deps to add:**
- `gray-matter` (~5 KB) — frontmatter parser.
- `mermaid` (~500 KB) — **lazy-loaded** in the `MermaidDiagram` component so it doesn't bloat initial bundle.
- Optional: `zod` for frontmatter schema validation (vs. manual predicates).

### 3. Validator Extensions

In `scripts/roadmap-validator.ts`, add pure functions:

- `checkTopicContentIds(roadmap, contentIds)` — every `frontmatter.id` in `data/topics/*.md` must reference a canonical topic id (not an alias). Returns errors for orphan or alias-targeting content files.
- `checkTopicContentFrontmatter(contentFiles)` — each content file's frontmatter has valid shape per the TypeScript types (arrays are arrays, `trade_offs` has matching column count across rows, `visualization` has either `content` or `src` based on `type`, etc.). Returns list of path + field violations.
- `checkVisualizationImageExists(contentFiles)` — for every `visualization.type: image`, verify `public${src}` file exists on disk.
- `checkPilotTopicsCovered(contentIds, pilotList)` — soft warning (not hard failure), lists pilot topics from the spec that don't yet have a content file. Useful during pilot authoring; can be demoted to diagnostic.

Mermaid syntax validation is **out of scope** for MVP — if a diagram doesn't compile, it fails in the UI during the author's local preview.

Wire these into `scripts/validate-roadmap.ts` alongside existing rules. Loader for `data/topics/*.md` added to `scripts/load-roadmap-yaml.ts` (or a new `scripts/load-topic-content.ts` peer).

### 4. UI Rendering

`TopicDetail.tsx` gets a new accordion region between the existing summary block and the existing resources/notes/materials section:

```
[Title + Status toggle]          ← existing
[Summary]                         ← existing
[Overview (accordion, default expanded)]      NEW
[Cheat Sheet (accordion, default collapsed)]  NEW
[Visualization (accordion, default collapsed)] NEW
[Capacity Planning (accordion, default collapsed, shown only if present)] NEW
[Resources]                       ← existing
[Notes]                           ← existing
[Materials]                       ← existing
```

**Components:**

- `<TopicAccordionSection title expanded onToggle>` — generic collapsible with chevron.
- `<OverviewSection markdown>` — wraps `react-markdown` (already in deps).
- `<CheatSheetSection cheatSheet>` — renders sub-sections in fixed order: key_facts → commands → trade_offs (HTML table with Tailwind classes) → pitfalls → interview_questions → extras_markdown.
- `<VisualizationSection viz>` — switches on `viz.type`; `type=mermaid` uses `<MermaidDiagram content={viz.content} />` (lazy import `mermaid` on mount); `type=image` uses `<img src={viz.src} alt={viz.alt}>`.
- `<CapacityPlanningSection cp>` — four named blocks: Inputs (definition list), Formulas (`<pre>` or KaTeX later), Worked Example (markdown), Numbers to Memorize (bullet list).

**Persistence:** per-topic expand/collapse state stored in `localStorage` under key `topic-accordion-<topicId>` as JSON `{ overview: bool, cheat_sheet: bool, visualization: bool, capacity_planning: bool }`.

**Empty state:** if `getTopicContent(id)` returns null, render a single unobtrusive note at the top of where the sections would be: *"No extended content yet."* No CTA — content authoring happens in git, not in the app.

### 5. Authoring Workflow

#### Template — `docs/topic-template.md`

Commit this once at the start of Project B. Authors copy it to `data/topics/<id>.md` and fill in.

```markdown
---
id: <topic-id>
# Remove sections you don't need; all fields are optional.
cheat_sheet:
  key_facts:
    - ""
  trade_offs:
    headers: []
    rows: []
  # ... etc
capacity_planning:
  inputs: []
  formulas: []
  worked_example: ""
  numbers_to_memorize: []
visualization:
  type: mermaid
  content: ""
  alt: ""
---

# Overview

<300-800 слов. Изложи концепцию своими словами.
Структура: 1) зачем это нужно, 2) как работает, 3) когда применять / когда не применять.>
```

#### Quality checklist (docs/topic-authoring-guide.md, out of MVP)

Can be authored later. MVP just relies on the template and validator to catch schema issues.

#### AI-assisted authoring (out of MVP)

Not in scope for this spec. A future addition could be a slash-command `/author-topic <id>` that generates a starter `.md` file from the existing `summary` + `resources`. Deferred until the manual authoring flow is proven.

### 6. Scope

**Pilot (~25 topics)** — authored fully during Project B implementation:

Phase 5:
- `sd-capacity`, `sd-components`, `sd-data-stores`, `sd-caching`, `sd-failure-modes`, `sd-cost-estimation`, `oltp-vs-olap`, `resilience-patterns-practical`, `network-protocols`, `sd-cap-theorem`, `authz-models`, `threat-modeling-stride`

Phase 6:
- `kafka-partitions`, `kafka-exactly-once`, `kafka-storage-model`, `event-sourcing`, `cqrs`, `saga-pattern`, `outbox-pattern`, `service-mesh`, `api-gateway`, `distributed-tracing`, `rabbitmq-vs-kafka`, `schema-registry-evolution`, `dlq-poison-messages`, `consumer-idempotency`

**Capacity planning subset (~15 topics)** — those in the pilot that justify back-of-envelope math:

- `sd-capacity`, `sd-caching`, `sd-components`
- `kafka-partitions`, `kafka-storage-model`
- `pg-memory`, `pg-indexing` *(not in pilot but add capacity only)*
- `redis-deep`, `mongodb-fundamentals` *(same)*
- `real-time-payments` *(out-of-pilot, add capacity only)*
- `rag-pipeline`, `embeddings`, `chunking-strategies` *(same)*
- `rabbitmq-vs-kafka`
- `resilience-patterns-practical`

**Post-MVP (just-in-time):** any topic the user is actively studying. Target: +5-10 content files per active study month. No hard coverage goal.

### 7. Milestones

Breaking Project B into implementable slices:

1. **B1 — Infrastructure.** Types, gray-matter loader, validator rules, tests. No UI yet. Acceptance: `npm run validate` passes when content files are present or absent.
2. **B2 — UI components.** Accordion, OverviewSection, CheatSheetSection, VisualizationSection (with lazy-loaded Mermaid), CapacityPlanningSection. Hook into TopicDetail. Use 1-2 hand-crafted seed content files for development.
3. **B3 — Template + authoring guide.** `docs/topic-template.md` + minimal quality checklist.
4. **B4 — Seed authoring (5 topics).** Author `sd-capacity`, `kafka-partitions`, `event-sourcing`, `saga-pattern`, `resilience-patterns-practical` end-to-end. Validates UX and surface any schema issues.
5. **B5 — Complete the pilot (~20 more topics).** Author the remaining Phase 5 + Phase 6 pilot topics.
6. **B6 — Add capacity_planning to the 5-10 out-of-pilot topics** (`pg-memory`, `pg-indexing`, `redis-deep`, `mongodb-fundamentals`, `real-time-payments`, `rag-pipeline`, `embeddings`, `chunking-strategies`) — these get a minimal content file with only `capacity_planning` + no overview. Establishes the pattern for partial content files.

Each milestone is a separate implementation-plan chunk. B1-B3 are mechanical. B4-B6 are content work.

### 8. Open Questions

1. **KaTeX for formulas?** MVP renders `formulas: string[]` as plain `<pre>` blocks. If capacity_planning grows heavy use of math notation, add `katex` later.
2. **Mermaid theming?** Default mermaid theme vs. matching Tailwind theme. Decide during B2; default theme is fine for MVP.
3. **Image optimization?** SVGs in `public/visualizations/` are served as-is. If files grow large, consider vite-plugin-image-optimizer later.
4. **Content coverage badge in UI?** Show a small icon on each topic card indicating "has extended content" — nice-to-have for discovery; deferred.

## Migration

No migration needed. Content files are additive; missing file = UI unchanged from today.

## Success Criteria

- `data/topics/<id>.md` files parse into `TopicContent` and appear in `TopicDetail.tsx` accordion sections.
- Missing content files do not break any existing UI path.
- Validator catches malformed frontmatter, orphan content ids, and missing image files.
- All 25 pilot topics (Phase 5 + Phase 6) have content files with at least `overview` + `cheat_sheet`; ~15 of them also have `capacity_planning`.
- Mermaid diagrams render in at least 10 of the pilot topics.
- Bundle size for initial load does not grow measurably (mermaid is lazy-loaded).
- Existing user progress/notes/materials remain intact.
