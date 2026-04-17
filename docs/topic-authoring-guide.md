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
