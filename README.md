# Knowledge Storage

Personal learning roadmap tracker with progress tracking, notes, and curated materials.

## Roadmap Directions

| Direction | Topics | Focus |
|-----------|--------|-------|
| Backend (Java/Kotlin) | Java 21-25, JVM internals, Spring Boot 3.x, PostgreSQL, Kafka, testing | Senior-level fundamentals + interview prep |
| Arch + Design | System Design (HLD/LLD), DDD, Event-Driven, Algorithms & DS | FAANG interview readiness |
| DevOps & Cloud | Kubernetes, OpenTelemetry, CI/CD, security, troubleshooting | Developer-side ops skills |
| Data Analysis | Advanced SQL, statistics, A/B testing, Power BI | Data Analyst interview prep |
| Python | Fundamentals, Pandas/NumPy, Scikit-learn, FastAPI, PySpark | Secondary language for data & AI |
| AI Agents & LLM | LangGraph, MCP, RAG, Spring AI, portfolio projects | Hands-on agent building |
| English (B2 to C1) | Speaking, writing, technical English, interview practice | Fluency for tech interviews |
| AI-Assisted Dev | Copilot, Cursor, Claude Code | Cross-cutting productivity |

**272 topics** with summaries and recommended resources per item.

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS v4
- GitHub Pages + StaticCrypt (password protection)
- localStorage for progress data + GitHub API sync

## Features

- Hierarchical roadmap with collapsible groups and connector lines
- Progress tracking per topic (Not Started / In Progress / Done)
- Markdown notes and curated materials per topic
- Summary and recommended resources for each topic (from YAML)
- Export/Import JSON backup
- GitHub sync (Push/Pull via GitHub API)
- Responsive: desktop side panel, mobile bottom sheet

## Development

```bash
npm install
npm run dev          # Start dev server
npm test             # Run tests (vitest)
npm run build        # Production build
```

## Deployment

1. Set GitHub Pages source to **GitHub Actions** in repo settings
2. Add `SITE_PASSWORD` secret in repo settings
3. Push to `main` — auto-deploys via `.github/workflows/deploy.yml`

## Customizing the Roadmap

Edit `data/roadmap.yaml` to add/modify topics:

```yaml
- id: my-topic
  title: "Topic Title"
  summary: "Brief description of what this topic covers."
  resources:
    - "Platform: course or resource name"
    - "Book: recommended reading"
  children:
    - id: subtopic
      title: "Subtopic"
      summary: "..."
      resources: [...]
```

Rebuild and deploy to apply changes.
