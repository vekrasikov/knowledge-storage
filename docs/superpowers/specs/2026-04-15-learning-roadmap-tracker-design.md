# Learning Roadmap Tracker — Design Spec

**Date:** 2026-04-15
**Status:** Approved
**Repository:** knowledge-storage
**Deploy:** GitHub Pages

## Problem

Need a personal tool to track learning progress across multiple directions (Backend, Arch + Design, DevOps, Data Science, English) with hierarchical structure, notes, and curated materials/excerpts.

## Requirements

- Hierarchical roadmap: direction → topic → subtopic
- Progress tracking per subtopic (not started / in progress / done)
- Text notes (markdown) attached to any topic
- Materials storage: title + URL + excerpt per topic
- Works equally well on mobile and desktop (50/50 usage)
- Offline: nice to have, not critical
- Page protected by password
- Roadmap structure editable as files in repo; progress/notes via UI
- Pure utility — fastest path to working tool

## Decision: SPA on GitHub Pages

**Rejected alternatives:**
- **Android app** — covers only mobile (50% of usage), needs separate desktop solution
- **PWA** — overengineering; offline not critical, sync adds complexity
- **Existing tools** — roadmap.sh (no notes/materials, not customizable), TrackIt (mobile only), SiYuan/Obsidian (no web deployment on GitHub Pages), Notion (not self-hosted)
- **GATE DA 2026 Roadmap** — closest analog (SPA + localStorage + GitHub Pages) but single-topic, no multi-direction hierarchy

## Architecture

```
GitHub Pages
├── roadmap.yaml (repo)  ──►  SPA (React)  ◄──  staticrypt (build)
│                                  │
│                            localStorage
│                         (progress, notes,
│                          materials)
```

### Data flow

1. Build: `roadmap.yaml` → bundled as JSON into the app
2. Load: SPA reads structure from bundle + user data from localStorage
3. Edit: user updates progress/notes/materials → saved to localStorage
4. Backup: Export/Import JSON button for backup and device transfer
5. Deploy: GitHub Actions → build → staticrypt → GitHub Pages

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | React 18 + TypeScript | Known by user, fast start |
| Build | Vite | Fast, GitHub Pages support out of the box |
| Styling | Tailwind CSS | Rapid styling, responsive built-in |
| YAML parsing | js-yaml | Parse roadmap.yaml at build time |
| Page protection | staticrypt | AES-256 client-side encryption, no backend |
| CI/CD | GitHub Actions | Build → staticrypt → deploy to Pages |

## Data Model

### Roadmap structure (file: `data/roadmap.yaml`)

```yaml
- id: backend
  title: Backend
  children:
    - id: java-concurrency
      title: "Java Concurrency"
      children:
        - id: thread-pools
          title: "Thread Pools & Executors"
        - id: completable-future
          title: "CompletableFuture"
    - id: spring-webflux
      title: "Spring WebFlux"

- id: arch
  title: "Arch + Design"
  children:
    - id: ddd
      title: "Domain-Driven Design"

- id: devops
  title: DevOps
  children: []

- id: data-science
  title: "Data Analysis / Data Science"
  children: []

- id: english
  title: English
  children: []
```

Each node has: `id` (unique, kebab-case), `title`, optional `children[]`.

### User data (localStorage)

```typescript
interface UserData {
  version: number // schema version for future migrations
  progress: Record<string, "not_started" | "in_progress" | "done">
  notes: Record<string, Note[]>
  materials: Record<string, Material[]>
}

interface Note {
  id: string
  text: string        // markdown
  createdAt: string   // ISO 8601
  updatedAt: string
}

interface Material {
  id: string
  title: string
  url?: string
  excerpt: string     // key takeaway / summary
  createdAt: string
}
```

Key in `progress`, `notes`, `materials` maps = topic `id` from roadmap.yaml.

### Persistence strategy

| What | Where | Sync |
|------|-------|------|
| Roadmap structure | `data/roadmap.yaml` in repo | Edit in IDE, rebuild & deploy |
| Progress, notes, materials | localStorage | Export/Import JSON for backup |

**Future evolution path (not in scope):**
- Level 2: manual sync via GitHub API ("Save to repo" / "Load from repo" buttons)
- Level 3: auto-sync via GitHub API

## UI Screens

### 1. Dashboard (home)

- List of 5 directions with progress bars (% of completed topics)
- Overall progress summary
- Export/Import buttons

### 2. Roadmap View (per direction)

- Hierarchical tree: topic → subtopics
- Status indicator per item: not started / in progress / done
- Note/material count badges
- Click on subtopic → opens Topic Detail

### 3. Topic Detail (side panel on desktop, full page on mobile)

- Status toggle (not started → in progress → done)
- **Notes section:** list of markdown notes, add/edit/delete
- **Materials section:** list of materials (title + link + excerpt), add/edit/delete

### Navigation

```
Dashboard → click direction → Roadmap View → click topic → Topic Detail
```

### Responsive behavior

- Desktop: Topic Detail opens as right side panel
- Mobile: Topic Detail opens as separate full-screen page
- Breakpoint: Tailwind `md:` (768px)

## CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - run: npx staticrypt dist/index.html -p "${{ secrets.SITE_PASSWORD }}" --short
      - uses: actions/deploy-pages@v4
```

Password stored in GitHub Secrets (`SITE_PASSWORD`), never in code.

## Out of Scope

- User authentication (OAuth, accounts)
- Backend / database
- PWA / Service Worker / offline mode
- GitHub API sync (future evolution)
- Flashcards / spaced repetition
- Multi-user support
- Push notifications
