# Project B — Status & Handoff

**Last updated:** 2026-04-17
**Plan:** [`2026-04-17-project-b-topic-enrichment.md`](./2026-04-17-project-b-topic-enrichment.md)
**Spec:** [`../specs/2026-04-17-project-b-topic-enrichment-design.md`](../specs/2026-04-17-project-b-topic-enrichment-design.md)

## Completed: T1 – T13 (infrastructure + UI + 5 seeds)

| Task | Status | Commit |
|------|--------|--------|
| T1 — Types (TopicContent, CheatSheet, CapacityPlanning, Visualization, LoadedTopicFile) | ✅ | `d76af37` |
| T2 — `gray-matter` + frontmatter parser with shape validation | ✅ | `1f7118a` |
| T3 — UI-side topic content loader (Vite `import.meta.glob`) | ✅ | `9de669c` |
| T4 — CLI-side topic content loader (fs + js-yaml) | ✅ | `e0b8a6d` |
| T5 — Validator rules `checkTopicContentIds` + `checkVisualizationImageExists` | ✅ | `c6dd5e6` |
| T6 — `TopicAccordionSection` + `useAccordionState` hook | ✅ | `f53b21b` |
| T7 — `OverviewSection` | ✅ | `c46a8f3` |
| T8 — `CheatSheetSection` (all structured sub-sections) | ✅ | `baf1795` |
| T9 — `MermaidDiagram` (lazy) + `VisualizationSection` | ✅ | `1058937` |
| T10 — `CapacityPlanningSection` | ✅ | `1c22c6e`, `5dac441` |
| T11 — Wire accordion region into `TopicDetail.tsx` | ✅ | `2e16aa0` |
| T12 — `docs/topic-template.md` + `docs/topic-authoring-guide.md` | ✅ | `b0b2d6e` |
| T13 — 5 seed topic content files (full overview + cheat_sheet + visualization; capacity for 2) | ✅ | `af64ce0` |
| Build fixes (erasableSyntaxOnly, node types via transitive import) | ✅ | `9d49432` |

**Seed topics authored:**
- `data/topics/sd-capacity.md` — exemplar; all fields populated
- `data/topics/kafka-partitions.md` — exemplar; all fields populated
- `data/topics/resilience-patterns-practical.md` — 4 patterns, sequence diagram, capacity
- `data/topics/event-sourcing.md` — vs CRUD trade-offs, Mermaid sequence, no capacity
- `data/topics/saga-pattern.md` — orchestration vs choreography, compensations, Mermaid

**Verification:** `npm test` → 146 tests pass across 26 files. `npm run validate` → passed. `npm run build` → passed.

## Deferred: T14 – T17

### T14 — Complete Phase 5 pilot (10 topics)

Author `data/topics/<id>.md` for each. Use `docs/topic-template.md` + the two exemplars (`sd-capacity.md`, `kafka-partitions.md`) as style reference. Depth target: 300-800 word overview + cheat_sheet with key_facts + trade_offs + pitfalls + interview_questions.

Topics:
- `sd-components`, `sd-data-stores`, `sd-caching`, `sd-failure-modes`, `sd-cost-estimation`
- `oltp-vs-olap`, `network-protocols`, `sd-cap-theorem`
- `authz-models`, `threat-modeling-stride`

**Capacity planning** for: `sd-caching`, `sd-components`, `sd-cost-estimation`.
**Visualization** for: `sd-components`, `sd-data-stores`, `sd-caching`, `oltp-vs-olap`, `network-protocols`, `authz-models`.

### T15 — Complete Phase 6 pilot (11 topics)

Topics:
- `kafka-exactly-once`, `kafka-storage-model`, `cqrs`, `outbox-pattern`
- `service-mesh`, `api-gateway`, `distributed-tracing`
- `rabbitmq-vs-kafka`, `schema-registry-evolution`, `dlq-poison-messages`, `consumer-idempotency`

**Capacity planning** for: `kafka-storage-model`.
**Visualization** for: all except perhaps the simplest.

### T16 — Capacity-only files (8 topics)

Frontmatter-only files (no overview, no cheat_sheet, no visualization) with just `id` + `capacity_planning` block. Surfaces memorizable numbers without requiring a full write-up. Use `pg-memory` as the pattern (see plan §T16.1).

Topics: `pg-memory`, `pg-indexing`, `redis-deep`, `mongodb-fundamentals`, `real-time-payments`, `rag-pipeline`, `embeddings`, `chunking-strategies`

### T17 — Final manual smoke

- `npm run build` — confirm bundle size hasn't regressed (main chunk ~610 KB at handoff, mermaid bundled — see optimization note below)
- `npm run dev` — open each of the 5 seed topics and verify: Overview renders, Cheat Sheet expands, Mermaid renders, Capacity Planning renders when present
- Load pre-existing `userdata.json` (if any) — verify progress, notes, materials remain intact
- Check topics with NO content file → "No extended content yet." message

## Recommended authoring workflow (just-in-time)

When you start actively studying a topic from Phase 5/6:

1. `cp docs/topic-template.md data/topics/<topic-id>.md`
2. Fill `id:` with the canonical topic id (check against `data/roadmap/*.yaml` — must NOT be an alias)
3. Draft `cheat_sheet.key_facts` while you learn (accumulate 3-7 crisp facts as you go)
4. Sketch a Mermaid diagram when you encounter a flow worth mental-modeling
5. Write the Overview last, in your own words (300-800 words)
6. If it's a topic in the "capacity_planning scope" list from the spec, add the block
7. `npm run validate` — must pass before commit
8. Commit: `git commit -m "docs(content): author <topic-id>"`

## Deferred UX improvements

### Full-page topic view (post-MVP priority)

**Problem surfaced during smoke test (2026-04-17):** the `TopicPanel` side-sheet is 420 px wide on desktop — too narrow for:

- Long-form overview markdown (300-800 words wraps into a tall, narrow column that's uncomfortable to read).
- Wide `trade_offs` tables (3-4 columns force heavy word-wrapping inside cells).
- Mermaid diagrams of non-trivial complexity (horizontal diagrams get squeezed).
- Worked examples in `capacity_planning` with multi-line arithmetic.

**Proposed fix — new route `/topic/:directionId/:topicId` (full page):**

1. Add a real route using the currently-orphaned `TopicDetail.tsx` pattern (or a fresh component). Full-page layout (max-width 4xl / prose), same four accordion sections but with comfortable reading width.
2. In `TopicPanel.tsx`, keep the accordion as-is for quick peek, but add a prominent "Open full page →" link at the top that navigates to the new route.
3. Breadcrumb at the top of the full page: `← Back to <direction name>`.
4. Consider: on full page, default Cheat Sheet / Visualization to expanded (full width makes them readable); keep side-panel defaults as they are.

**Scope estimate:** 1-2 hours (router + component + link). No data changes.

**Alternative considered:** widen the side-panel to 600-800px on large screens. Simpler but still cramped for Mermaid, and steals horizontal space from the roadmap tree. Full-page wins.

### Other UX polish candidates (lower priority)

- Mermaid diagrams: default theme uses light colors that blend with light Tailwind prose. Consider theme override to match Tailwind slate palette.
- KaTeX for `capacity_planning.formulas` if the current `<code>` blocks feel under-dressed for math.
- Collapse-all / expand-all toggle at the top of the accordion region.
- Link prereq topics in overview markdown automatically (`gc-g1` → link to its topic view).

## Known technical debt

- **Main bundle size (~610 KB).** Project B added mermaid but bundle didn't grow meaningfully. Either mermaid was already lazy-split successfully or Vite 8 / rolldown is inlining it. If performance becomes a concern, inspect with `npm run build -- --mode analyze` or add explicit chunking via `build.rollupOptions.output.manualChunks` in `vite.config.ts`.
- **Mermaid syntax validation.** Plan spec §3 noted this is out-of-scope for MVP — syntax errors surface at runtime. If this bites during authoring, add a CLI-side Mermaid parse in `loadAllTopicContent` or a separate `checkMermaidSyntax` validator rule using the mermaid parser.
- **`checkTopicContentFrontmatter`** — spec mentions this as a distinct rule; in implementation, validation is done by `parseTopicContent` itself (throws `ValidationError` with file + field). Either approach satisfies the spec requirement; document just in case someone sees the spec-vs-code discrepancy.

## How to resume

1. Open `docs/superpowers/plans/2026-04-17-project-b-topic-enrichment.md` — re-read the sections for T14 / T15 / T16 / T17 you want to pick up.
2. Or pick a single topic from the deferred lists above, copy the template, author inline.
3. For T17 specifically: run `npm run dev` and manually verify the UI against the 5 seed topics that already exist.

The infrastructure is production-ready. Content authoring is now an organic, topic-by-topic activity tied to your actual study rhythm.
