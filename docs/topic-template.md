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
