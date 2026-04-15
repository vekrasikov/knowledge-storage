# Roadmap Files

Per-direction YAML files. Each contains one top-level direction with hierarchical topics.

| File | Direction | Lines |
|------|-----------|-------|
| `01-backend.yaml` | Backend (Java/Kotlin) | ~720 |
| `02-arch.yaml` | Architecture & System Design | ~450 |
| `03-devops.yaml` | DevOps & Cloud | ~280 |
| `04-data-analysis.yaml` | Data Analysis / Data Science | ~320 |
| `05-python.yaml` | Python | ~230 |
| `06-ai-agents.yaml` | AI Agents & LLM | ~415 |
| `07-english.yaml` | English (B2 → C1) | ~330 |
| `08-ai-dev-tools.yaml` | AI-Assisted Development | ~60 |

## Schema

Each file is a YAML list of `RoadmapNode`:

```yaml
- id: direction-id
  title: "Direction Title"
  children:
    - id: group-id
      title: "Group Title"
      children:
        - id: topic-id
          title: "Topic Title"
          summary: "Brief description of what this covers and why it matters"
          resources:
            - "Book: Title (Author)"
            - "GitHub: org/repo"
            - "Course: platform — course name"
```

Group nodes (with `children`) don't need `summary`/`resources`. Leaf nodes (trackable items) should have both.

## Loading

`src/data/roadmap.ts` imports all 8 files and concatenates them into a single tree. To add a new direction, create a new file and add the import.
