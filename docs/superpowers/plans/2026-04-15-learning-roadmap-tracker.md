# Learning Roadmap Tracker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an SPA on GitHub Pages to track learning progress across 5 directions with notes and curated materials.

**Architecture:** Static React SPA bundled with Vite. Roadmap structure loaded from YAML at build time. User data (progress, notes, materials) persisted in localStorage with JSON export/import. Page protected by staticrypt. Deployed via GitHub Actions.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, React Router (HashRouter), Vitest, React Testing Library, react-markdown, @modyfi/vite-plugin-yaml, staticrypt

---

## File Structure

```
knowledge-storage/
├── data/
│   └── roadmap.yaml                 # roadmap tree (edited manually in IDE)
├── src/
│   ├── main.tsx                     # React entry point
│   ├── App.tsx                      # HashRouter + routes + layout
│   ├── types.ts                     # all TypeScript interfaces
│   ├── index.css                    # Tailwind directives
│   ├── vite-env.d.ts                # Vite + YAML type declarations
│   ├── data/
│   │   └── roadmap.ts               # import YAML, flatten helpers
│   ├── utils/
│   │   ├── storage.ts               # localStorage CRUD + export/import
│   │   └── progress.ts              # progress calculation
│   ├── hooks/
│   │   └── useUserData.ts           # React hook wrapping storage
│   ├── components/
│   │   ├── ProgressBar.tsx          # reusable progress bar
│   │   └── StatusToggle.tsx         # status cycling button
│   └── pages/
│       ├── Dashboard.tsx            # direction list + progress bars
│       ├── RoadmapView.tsx          # hierarchical tree for a direction
│       └── TopicDetail.tsx          # notes + materials CRUD
├── src/__tests__/
│   ├── utils/
│   │   ├── storage.test.ts
│   │   └── progress.test.ts
│   ├── data/
│   │   └── roadmap.test.ts
│   └── pages/
│       ├── Dashboard.test.tsx
│       ├── RoadmapView.test.tsx
│       └── TopicDetail.test.tsx
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
└── .github/
    └── workflows/
        └── deploy.yml
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/vite-env.d.ts`

- [ ] **Step 1: Scaffold Vite project**

```bash
cd /Users/user1/personal/repos/knowledge-storage/.claude/worktrees/charming-albattani
npm create vite@latest . -- --template react-ts
```

Accept overwrite prompts. This creates the base project structure.

- [ ] **Step 2: Install dependencies**

```bash
npm install react-router-dom react-markdown @modyfi/vite-plugin-yaml
npm install -D tailwindcss @tailwindcss/vite @tailwindcss/typography vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 3: Configure Vite**

Replace `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import yaml from "@modyfi/vite-plugin-yaml";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/knowledge-storage/",
  plugins: [react(), yaml(), tailwindcss()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test-setup.ts",
  },
});
```

- [ ] **Step 4: Configure Tailwind CSS**

Replace `src/index.css`:

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

- [ ] **Step 5: Create test setup**

Create `src/test-setup.ts`:

```typescript
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 6: Update vite-env.d.ts**

Replace `src/vite-env.d.ts`:

```typescript
/// <reference types="vite/client" />

declare module "*.yaml" {
  const data: unknown;
  export default data;
}
```

- [ ] **Step 7: Create minimal App**

Replace `src/App.tsx`:

```tsx
function App() {
  return <div className="min-h-screen bg-gray-50 p-4">
    <h1 className="text-2xl font-bold">Learning Roadmap</h1>
  </div>;
}

export default App;
```

Replace `src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 8: Verify dev server works**

```bash
npm run dev
```

Expected: opens on localhost, shows "Learning Roadmap" with Tailwind styling (gray background, bold text).

- [ ] **Step 9: Verify tests work**

```bash
npx vitest run
```

Expected: test suite runs (may have 0 tests, no errors).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React + TypeScript + Tailwind project"
```

---

## Task 2: Types and Roadmap Data

**Files:**
- Create: `src/types.ts`, `data/roadmap.yaml`, `src/data/roadmap.ts`, `src/__tests__/data/roadmap.test.ts`

- [ ] **Step 1: Define TypeScript types**

Create `src/types.ts`:

```typescript
export type Status = "not_started" | "in_progress" | "done";

export interface RoadmapNode {
  id: string;
  title: string;
  children?: RoadmapNode[];
}

export interface Note {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  id: string;
  title: string;
  url?: string;
  excerpt: string;
  createdAt: string;
}

export interface UserData {
  version: number;
  progress: Record<string, Status>;
  notes: Record<string, Note[]>;
  materials: Record<string, Material[]>;
}
```

- [ ] **Step 2: Create roadmap.yaml**

Create `data/roadmap.yaml`:

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
    - id: spring-security
      title: "Spring Security"

- id: arch
  title: "Arch + Проектирование"
  children:
    - id: ddd
      title: "Domain-Driven Design"
    - id: system-design
      title: "System Design"
    - id: design-patterns
      title: "Design Patterns"

- id: devops
  title: DevOps
  children:
    - id: kubernetes
      title: "Kubernetes"
    - id: ci-cd
      title: "CI/CD Pipelines"
    - id: monitoring
      title: "Monitoring & Observability"

- id: data-science
  title: "Data Analysis / Data Science"
  children:
    - id: python-data
      title: "Python for Data"
    - id: sql-analytics
      title: "SQL Analytics"
    - id: ml-basics
      title: "ML Basics"

- id: english
  title: English
  children:
    - id: technical-writing
      title: "Technical Writing"
    - id: speaking
      title: "Speaking Practice"
```

- [ ] **Step 3: Write failing test for roadmap helpers**

Create `src/__tests__/data/roadmap.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { getRoadmap, getAllNodeIds, findNode } from "../../data/roadmap";

describe("roadmap", () => {
  it("getRoadmap returns array of root directions", () => {
    const roadmap = getRoadmap();
    expect(roadmap).toBeInstanceOf(Array);
    expect(roadmap.length).toBeGreaterThan(0);
    expect(roadmap[0]).toHaveProperty("id");
    expect(roadmap[0]).toHaveProperty("title");
  });

  it("getAllNodeIds returns flat list of all node IDs", () => {
    const ids = getAllNodeIds();
    expect(ids).toContain("backend");
    expect(ids).toContain("thread-pools");
    expect(ids).toContain("english");
  });

  it("findNode finds a nested node by id", () => {
    const node = findNode("thread-pools");
    expect(node).not.toBeNull();
    expect(node!.title).toBe("Thread Pools & Executors");
  });

  it("findNode returns null for unknown id", () => {
    expect(findNode("nonexistent")).toBeNull();
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

```bash
npx vitest run src/__tests__/data/roadmap.test.ts
```

Expected: FAIL — module `../../data/roadmap` not found.

- [ ] **Step 5: Implement roadmap helpers**

Create `src/data/roadmap.ts`:

```typescript
import rawData from "../../data/roadmap.yaml";
import type { RoadmapNode } from "../types";

const roadmap: RoadmapNode[] = rawData as RoadmapNode[];

export function getRoadmap(): RoadmapNode[] {
  return roadmap;
}

export function getAllNodeIds(): string[] {
  const ids: string[] = [];
  function collect(nodes: RoadmapNode[]) {
    for (const node of nodes) {
      ids.push(node.id);
      if (node.children) collect(node.children);
    }
  }
  collect(roadmap);
  return ids;
}

export function findNode(id: string): RoadmapNode | null {
  function search(nodes: RoadmapNode[]): RoadmapNode | null {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = search(node.children);
        if (found) return found;
      }
    }
    return null;
  }
  return search(roadmap);
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/data/roadmap.test.ts
```

Expected: all 4 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/types.ts data/roadmap.yaml src/data/roadmap.ts src/__tests__/data/roadmap.test.ts
git commit -m "feat: add types, roadmap YAML data, and roadmap helpers"
```

---

## Task 3: Storage Utilities (TDD)

**Files:**
- Create: `src/utils/storage.ts`, `src/__tests__/utils/storage.test.ts`

- [ ] **Step 1: Write failing tests for storage**

Create `src/__tests__/utils/storage.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import {
  loadUserData,
  saveUserData,
  setProgress,
  addNote,
  updateNote,
  deleteNote,
  addMaterial,
  deleteMaterial,
  exportData,
  importData,
  EMPTY_USER_DATA,
} from "../../utils/storage";
import type { UserData } from "../../types";

beforeEach(() => {
  localStorage.clear();
});

describe("loadUserData", () => {
  it("returns empty data when localStorage is empty", () => {
    const data = loadUserData();
    expect(data).toEqual(EMPTY_USER_DATA);
  });

  it("returns saved data from localStorage", () => {
    const saved: UserData = {
      ...EMPTY_USER_DATA,
      progress: { "thread-pools": "done" },
    };
    localStorage.setItem("knowledge-storage", JSON.stringify(saved));
    expect(loadUserData()).toEqual(saved);
  });
});

describe("saveUserData", () => {
  it("persists data to localStorage", () => {
    const data: UserData = {
      ...EMPTY_USER_DATA,
      progress: { ddd: "in_progress" },
    };
    saveUserData(data);
    const raw = localStorage.getItem("knowledge-storage");
    expect(JSON.parse(raw!)).toEqual(data);
  });
});

describe("setProgress", () => {
  it("updates progress for a topic", () => {
    const result = setProgress(EMPTY_USER_DATA, "ddd", "in_progress");
    expect(result.progress["ddd"]).toBe("in_progress");
  });
});

describe("addNote", () => {
  it("adds a note to a topic", () => {
    const result = addNote(EMPTY_USER_DATA, "ddd", "My note text");
    expect(result.notes["ddd"]).toHaveLength(1);
    expect(result.notes["ddd"][0].text).toBe("My note text");
    expect(result.notes["ddd"][0].id).toBeDefined();
  });
});

describe("updateNote", () => {
  it("updates an existing note", () => {
    const withNote = addNote(EMPTY_USER_DATA, "ddd", "Original");
    const noteId = withNote.notes["ddd"][0].id;
    const result = updateNote(withNote, "ddd", noteId, "Updated");
    expect(result.notes["ddd"][0].text).toBe("Updated");
  });
});

describe("deleteNote", () => {
  it("removes a note by id", () => {
    const withNote = addNote(EMPTY_USER_DATA, "ddd", "To delete");
    const noteId = withNote.notes["ddd"][0].id;
    const result = deleteNote(withNote, "ddd", noteId);
    expect(result.notes["ddd"]).toHaveLength(0);
  });
});

describe("addMaterial", () => {
  it("adds a material to a topic", () => {
    const result = addMaterial(EMPTY_USER_DATA, "ddd", {
      title: "DDD Book",
      url: "https://example.com",
      excerpt: "Key takeaway",
    });
    expect(result.materials["ddd"]).toHaveLength(1);
    expect(result.materials["ddd"][0].title).toBe("DDD Book");
  });
});

describe("deleteMaterial", () => {
  it("removes a material by id", () => {
    const withMat = addMaterial(EMPTY_USER_DATA, "ddd", {
      title: "Book",
      excerpt: "Notes",
    });
    const matId = withMat.materials["ddd"][0].id;
    const result = deleteMaterial(withMat, "ddd", matId);
    expect(result.materials["ddd"]).toHaveLength(0);
  });
});

describe("exportData / importData", () => {
  it("export returns JSON string, import restores it", () => {
    const data: UserData = {
      ...EMPTY_USER_DATA,
      progress: { ddd: "done" },
    };
    const json = exportData(data);
    expect(typeof json).toBe("string");

    const restored = importData(json);
    expect(restored).toEqual(data);
  });

  it("importData throws on invalid JSON", () => {
    expect(() => importData("not json")).toThrow();
  });

  it("importData throws on wrong schema", () => {
    expect(() => importData(JSON.stringify({ foo: "bar" }))).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/utils/storage.test.ts
```

Expected: FAIL — module `../../utils/storage` not found.

- [ ] **Step 3: Implement storage utilities**

Create `src/utils/storage.ts`:

```typescript
import type { UserData, Status, Note, Material } from "../types";

const STORAGE_KEY = "knowledge-storage";

export const EMPTY_USER_DATA: UserData = {
  version: 1,
  progress: {},
  notes: {},
  materials: {},
};

export function loadUserData(): UserData {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...EMPTY_USER_DATA };
  try {
    return JSON.parse(raw) as UserData;
  } catch {
    return { ...EMPTY_USER_DATA };
  }
}

export function saveUserData(data: UserData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function setProgress(
  data: UserData,
  topicId: string,
  status: Status
): UserData {
  return {
    ...data,
    progress: { ...data.progress, [topicId]: status },
  };
}

export function addNote(
  data: UserData,
  topicId: string,
  text: string
): UserData {
  const now = new Date().toISOString();
  const note: Note = {
    id: crypto.randomUUID(),
    text,
    createdAt: now,
    updatedAt: now,
  };
  const existing = data.notes[topicId] ?? [];
  return {
    ...data,
    notes: { ...data.notes, [topicId]: [...existing, note] },
  };
}

export function updateNote(
  data: UserData,
  topicId: string,
  noteId: string,
  text: string
): UserData {
  const notes = (data.notes[topicId] ?? []).map((n) =>
    n.id === noteId ? { ...n, text, updatedAt: new Date().toISOString() } : n
  );
  return { ...data, notes: { ...data.notes, [topicId]: notes } };
}

export function deleteNote(
  data: UserData,
  topicId: string,
  noteId: string
): UserData {
  const notes = (data.notes[topicId] ?? []).filter((n) => n.id !== noteId);
  return { ...data, notes: { ...data.notes, [topicId]: notes } };
}

export function addMaterial(
  data: UserData,
  topicId: string,
  input: { title: string; url?: string; excerpt: string }
): UserData {
  const material: Material = {
    id: crypto.randomUUID(),
    ...input,
    createdAt: new Date().toISOString(),
  };
  const existing = data.materials[topicId] ?? [];
  return {
    ...data,
    materials: { ...data.materials, [topicId]: [...existing, material] },
  };
}

export function deleteMaterial(
  data: UserData,
  topicId: string,
  materialId: string
): UserData {
  const materials = (data.materials[topicId] ?? []).filter(
    (m) => m.id !== materialId
  );
  return { ...data, materials: { ...data.materials, [topicId]: materials } };
}

export function exportData(data: UserData): string {
  return JSON.stringify(data, null, 2);
}

export function importData(json: string): UserData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Invalid JSON");
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("version" in parsed) ||
    !("progress" in parsed) ||
    !("notes" in parsed) ||
    !("materials" in parsed)
  ) {
    throw new Error("Invalid data schema");
  }
  return parsed as UserData;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/utils/storage.test.ts
```

Expected: all 11 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/storage.ts src/__tests__/utils/storage.test.ts
git commit -m "feat: add localStorage storage utilities with TDD"
```

---

## Task 4: Progress Calculation (TDD)

**Files:**
- Create: `src/utils/progress.ts`, `src/__tests__/utils/progress.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/utils/progress.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { calcProgress, calcDirectionProgress } from "../../utils/progress";
import type { RoadmapNode, UserData } from "../../types";
import { EMPTY_USER_DATA } from "../../utils/storage";

const testTree: RoadmapNode[] = [
  {
    id: "backend",
    title: "Backend",
    children: [
      {
        id: "java",
        title: "Java",
        children: [
          { id: "threads", title: "Threads" },
          { id: "streams", title: "Streams" },
        ],
      },
      { id: "spring", title: "Spring" },
    ],
  },
];

describe("calcProgress", () => {
  it("returns 0 for empty progress", () => {
    const result = calcProgress(testTree[0], EMPTY_USER_DATA.progress);
    expect(result).toEqual({ total: 3, done: 0, percentage: 0 });
  });

  it("counts only leaf nodes as total", () => {
    const result = calcProgress(testTree[0], EMPTY_USER_DATA.progress);
    // leaves: threads, streams, spring = 3
    expect(result.total).toBe(3);
  });

  it("counts done leaf nodes", () => {
    const progress = { threads: "done" as const, spring: "done" as const };
    const result = calcProgress(testTree[0], progress);
    expect(result).toEqual({ total: 3, done: 2, percentage: 67 });
  });

  it("handles node with no children as single leaf", () => {
    const leaf: RoadmapNode = { id: "solo", title: "Solo" };
    const progress = { solo: "done" as const };
    expect(calcProgress(leaf, progress)).toEqual({
      total: 1,
      done: 1,
      percentage: 100,
    });
  });
});

describe("calcDirectionProgress", () => {
  it("returns progress for all directions", () => {
    const progress = { threads: "done" as const };
    const result = calcDirectionProgress(testTree, progress);
    expect(result).toEqual([
      { id: "backend", title: "Backend", total: 3, done: 1, percentage: 33 },
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/utils/progress.test.ts
```

Expected: FAIL — module `../../utils/progress` not found.

- [ ] **Step 3: Implement progress utilities**

Create `src/utils/progress.ts`:

```typescript
import type { RoadmapNode, Status } from "../types";

export interface ProgressInfo {
  total: number;
  done: number;
  percentage: number;
}

export interface DirectionProgress extends ProgressInfo {
  id: string;
  title: string;
}

function collectLeaves(node: RoadmapNode): string[] {
  if (!node.children || node.children.length === 0) {
    return [node.id];
  }
  return node.children.flatMap(collectLeaves);
}

export function calcProgress(
  node: RoadmapNode,
  progress: Record<string, Status>
): ProgressInfo {
  const leaves = collectLeaves(node);
  const total = leaves.length;
  const done = leaves.filter((id) => progress[id] === "done").length;
  const percentage = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, percentage };
}

export function calcDirectionProgress(
  directions: RoadmapNode[],
  progress: Record<string, Status>
): DirectionProgress[] {
  return directions.map((dir) => ({
    id: dir.id,
    title: dir.title,
    ...calcProgress(dir, progress),
  }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/utils/progress.test.ts
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/progress.ts src/__tests__/utils/progress.test.ts
git commit -m "feat: add progress calculation utilities with TDD"
```

---

## Task 5: useUserData Hook

**Files:**
- Create: `src/hooks/useUserData.ts`

- [ ] **Step 1: Implement the hook**

Create `src/hooks/useUserData.ts`:

```typescript
import { useState, useCallback } from "react";
import type { UserData, Status } from "../types";
import {
  loadUserData,
  saveUserData,
  setProgress as setProgressFn,
  addNote as addNoteFn,
  updateNote as updateNoteFn,
  deleteNote as deleteNoteFn,
  addMaterial as addMaterialFn,
  deleteMaterial as deleteMaterialFn,
  exportData,
  importData,
} from "../utils/storage";

export function useUserData() {
  const [data, setData] = useState<UserData>(loadUserData);

  const update = useCallback((fn: (prev: UserData) => UserData) => {
    setData((prev) => {
      const next = fn(prev);
      saveUserData(next);
      return next;
    });
  }, []);

  const setProgress = useCallback(
    (topicId: string, status: Status) => {
      update((prev) => setProgressFn(prev, topicId, status));
    },
    [update]
  );

  const addNote = useCallback(
    (topicId: string, text: string) => {
      update((prev) => addNoteFn(prev, topicId, text));
    },
    [update]
  );

  const updateNote = useCallback(
    (topicId: string, noteId: string, text: string) => {
      update((prev) => updateNoteFn(prev, topicId, noteId, text));
    },
    [update]
  );

  const deleteNote = useCallback(
    (topicId: string, noteId: string) => {
      update((prev) => deleteNoteFn(prev, topicId, noteId));
    },
    [update]
  );

  const addMaterial = useCallback(
    (
      topicId: string,
      input: { title: string; url?: string; excerpt: string }
    ) => {
      update((prev) => addMaterialFn(prev, topicId, input));
    },
    [update]
  );

  const deleteMaterial = useCallback(
    (topicId: string, materialId: string) => {
      update((prev) => deleteMaterialFn(prev, topicId, materialId));
    },
    [update]
  );

  const handleExport = useCallback(() => {
    const json = exportData(data);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `knowledge-storage-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const handleImport = useCallback(
    (json: string) => {
      const imported = importData(json);
      update(() => imported);
    },
    [update]
  );

  return {
    data,
    setProgress,
    addNote,
    updateNote,
    deleteNote,
    addMaterial,
    deleteMaterial,
    handleExport,
    handleImport,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useUserData.ts
git commit -m "feat: add useUserData hook wrapping localStorage"
```

---

## Task 6: Reusable Components

**Files:**
- Create: `src/components/ProgressBar.tsx`, `src/components/StatusToggle.tsx`

- [ ] **Step 1: Create ProgressBar**

Create `src/components/ProgressBar.tsx`:

```tsx
interface ProgressBarProps {
  percentage: number;
  label?: string;
}

export function ProgressBar({ percentage, label }: ProgressBarProps) {
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{label}</span>
          <span>{percentage}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create StatusToggle**

Create `src/components/StatusToggle.tsx`:

```tsx
import type { Status } from "../types";

const STATUS_CONFIG: Record<Status, { label: string; color: string; next: Status }> = {
  not_started: { label: "Not Started", color: "bg-gray-200 text-gray-700", next: "in_progress" },
  in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-800", next: "done" },
  done: { label: "Done", color: "bg-green-100 text-green-800", next: "not_started" },
};

interface StatusToggleProps {
  status: Status;
  onChange: (status: Status) => void;
}

export function StatusToggle({ status, onChange }: StatusToggleProps) {
  const config = STATUS_CONFIG[status];
  return (
    <button
      onClick={() => onChange(config.next)}
      className={`px-3 py-1 rounded-full text-sm font-medium ${config.color} hover:opacity-80 transition-opacity`}
    >
      {config.label}
    </button>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ProgressBar.tsx src/components/StatusToggle.tsx
git commit -m "feat: add ProgressBar and StatusToggle components"
```

---

## Task 7: Dashboard Page

**Files:**
- Create: `src/pages/Dashboard.tsx`, `src/__tests__/pages/Dashboard.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/__tests__/pages/Dashboard.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Dashboard } from "../../pages/Dashboard";

beforeEach(() => {
  localStorage.clear();
});

describe("Dashboard", () => {
  it("renders all direction titles", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    expect(screen.getByText("Backend")).toBeInTheDocument();
    expect(screen.getByText(/Arch/)).toBeInTheDocument();
    expect(screen.getByText("DevOps")).toBeInTheDocument();
    expect(screen.getByText(/Data/)).toBeInTheDocument();
    expect(screen.getByText("English")).toBeInTheDocument();
  });

  it("renders progress bars", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    const progressBars = screen.getAllByText("0%");
    expect(progressBars.length).toBeGreaterThanOrEqual(5);
  });

  it("has export and import buttons", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    expect(screen.getByText("Export")).toBeInTheDocument();
    expect(screen.getByText("Import")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/pages/Dashboard.test.tsx
```

Expected: FAIL — module `../../pages/Dashboard` not found.

- [ ] **Step 3: Implement Dashboard**

Create `src/pages/Dashboard.tsx`:

```tsx
import { useRef } from "react";
import { Link } from "react-router-dom";
import { getRoadmap } from "../data/roadmap";
import { calcDirectionProgress } from "../utils/progress";
import { useUserData } from "../hooks/useUserData";
import { ProgressBar } from "../components/ProgressBar";

export function Dashboard() {
  const { data, handleExport, handleImport } = useUserData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const roadmap = getRoadmap();
  const dirProgress = calcDirectionProgress(roadmap, data.progress);

  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        handleImport(reader.result as string);
      } catch (err) {
        alert("Invalid backup file: " + (err as Error).message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const overallDone = dirProgress.reduce((s, d) => s + d.done, 0);
  const overallTotal = dirProgress.reduce((s, d) => s + d.total, 0);
  const overallPct = overallTotal === 0 ? 0 : Math.round((overallDone / overallTotal) * 100);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Learning Roadmap</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Export
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={onImportFile}
            className="hidden"
          />
        </div>
      </div>

      <div className="mb-8">
        <ProgressBar percentage={overallPct} label={`Overall: ${overallDone}/${overallTotal}`} />
      </div>

      <div className="space-y-4">
        {dirProgress.map((dir) => (
          <Link
            key={dir.id}
            to={`/roadmap/${dir.id}`}
            className="block p-4 bg-white rounded-lg shadow-sm border hover:border-blue-300 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">{dir.title}</h2>
              <span className="text-sm text-gray-500">
                {dir.done}/{dir.total}
              </span>
            </div>
            <ProgressBar percentage={dir.percentage} />
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/pages/Dashboard.test.tsx
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Dashboard.tsx src/__tests__/pages/Dashboard.test.tsx
git commit -m "feat: add Dashboard page with direction progress"
```

---

## Task 8: RoadmapView Page

**Files:**
- Create: `src/pages/RoadmapView.tsx`, `src/__tests__/pages/RoadmapView.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/__tests__/pages/RoadmapView.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RoadmapView } from "../../pages/RoadmapView";

beforeEach(() => {
  localStorage.clear();
});

function renderWithRoute(directionId: string) {
  return render(
    <MemoryRouter initialEntries={[`/roadmap/${directionId}`]}>
      <Routes>
        <Route path="/roadmap/:directionId" element={<RoadmapView />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("RoadmapView", () => {
  it("renders direction title", () => {
    renderWithRoute("backend");
    expect(screen.getByText("Backend")).toBeInTheDocument();
  });

  it("renders child topics", () => {
    renderWithRoute("backend");
    expect(screen.getByText("Java Concurrency")).toBeInTheDocument();
    expect(screen.getByText("Spring WebFlux")).toBeInTheDocument();
  });

  it("renders nested subtopics", () => {
    renderWithRoute("backend");
    expect(screen.getByText("Thread Pools & Executors")).toBeInTheDocument();
    expect(screen.getByText("CompletableFuture")).toBeInTheDocument();
  });

  it("shows back link to dashboard", () => {
    renderWithRoute("backend");
    expect(screen.getByText("Back")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/pages/RoadmapView.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement RoadmapView**

Create `src/pages/RoadmapView.tsx`:

```tsx
import { Link, useParams, useNavigate } from "react-router-dom";
import { findNode } from "../data/roadmap";
import { useUserData } from "../hooks/useUserData";
import { StatusToggle } from "../components/StatusToggle";
import type { RoadmapNode, Status } from "../types";

function TreeNode({
  node,
  depth,
  directionId,
  progress,
  onStatusChange,
  noteCount,
  materialCount,
}: {
  node: RoadmapNode;
  depth: number;
  directionId: string;
  progress: Record<string, Status>;
  onStatusChange: (id: string, status: Status) => void;
  noteCount: (id: string) => number;
  materialCount: (id: string) => number;
}) {
  const isLeaf = !node.children || node.children.length === 0;
  const status: Status = progress[node.id] ?? "not_started";
  const notes = noteCount(node.id);
  const materials = materialCount(node.id);

  return (
    <div style={{ paddingLeft: depth * 16 }}>
      <div className="flex items-center gap-2 py-2 border-b border-gray-100">
        {isLeaf ? (
          <Link
            to={`/roadmap/${directionId}/${node.id}`}
            className="flex-1 hover:text-blue-600 transition-colors"
          >
            {node.title}
          </Link>
        ) : (
          <span className="flex-1 font-medium text-gray-700">{node.title}</span>
        )}
        {(notes > 0 || materials > 0) && (
          <span className="text-xs text-gray-400">
            {notes > 0 && `${notes} notes`}
            {notes > 0 && materials > 0 && " · "}
            {materials > 0 && `${materials} materials`}
          </span>
        )}
        {isLeaf && (
          <StatusToggle status={status} onChange={(s) => onStatusChange(node.id, s)} />
        )}
      </div>
      {node.children?.map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          directionId={directionId}
          progress={progress}
          onStatusChange={onStatusChange}
          noteCount={noteCount}
          materialCount={materialCount}
        />
      ))}
    </div>
  );
}

export function RoadmapView() {
  const { directionId } = useParams<{ directionId: string }>();
  const navigate = useNavigate();
  const { data, setProgress } = useUserData();
  const direction = findNode(directionId!);

  if (!direction) {
    return <div className="p-4">Direction not found</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <button onClick={() => navigate("/")} className="text-blue-600 hover:underline mb-4 block">
        Back
      </button>
      <h1 className="text-2xl font-bold mb-4">{direction.title}</h1>
      <div className="bg-white rounded-lg shadow-sm border p-4">
        {direction.children?.map((child) => (
          <TreeNode
            key={child.id}
            node={child}
            depth={0}
            directionId={directionId!}
            progress={data.progress}
            onStatusChange={setProgress}
            noteCount={(id) => data.notes[id]?.length ?? 0}
            materialCount={(id) => data.materials[id]?.length ?? 0}
          />
        ))}
        {(!direction.children || direction.children.length === 0) && (
          <p className="text-gray-400 italic">No topics yet. Add them in data/roadmap.yaml</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/pages/RoadmapView.test.tsx
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/RoadmapView.tsx src/__tests__/pages/RoadmapView.test.tsx
git commit -m "feat: add RoadmapView page with hierarchical tree"
```

---

## Task 9: TopicDetail Page

**Files:**
- Create: `src/pages/TopicDetail.tsx`, `src/__tests__/pages/TopicDetail.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/__tests__/pages/TopicDetail.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TopicDetail } from "../../pages/TopicDetail";

beforeEach(() => {
  localStorage.clear();
});

function renderTopic(directionId: string, topicId: string) {
  return render(
    <MemoryRouter initialEntries={[`/roadmap/${directionId}/${topicId}`]}>
      <Routes>
        <Route
          path="/roadmap/:directionId/:topicId"
          element={<TopicDetail />}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("TopicDetail", () => {
  it("renders topic title", () => {
    renderTopic("backend", "thread-pools");
    expect(screen.getByText("Thread Pools & Executors")).toBeInTheDocument();
  });

  it("renders status toggle", () => {
    renderTopic("backend", "thread-pools");
    expect(screen.getByText("Not Started")).toBeInTheDocument();
  });

  it("renders notes section", () => {
    renderTopic("backend", "thread-pools");
    expect(screen.getByText("Notes")).toBeInTheDocument();
  });

  it("renders materials section", () => {
    renderTopic("backend", "thread-pools");
    expect(screen.getByText("Materials")).toBeInTheDocument();
  });

  it("can add a note", async () => {
    const user = userEvent.setup();
    renderTopic("backend", "thread-pools");

    await user.click(screen.getByText("Add Note"));
    const textarea = screen.getByPlaceholderText("Write your note...");
    await user.type(textarea, "My first note");
    await user.click(screen.getByText("Save"));

    expect(screen.getByText("My first note")).toBeInTheDocument();
  });

  it("can add a material", async () => {
    const user = userEvent.setup();
    renderTopic("backend", "thread-pools");

    await user.click(screen.getByText("Add Material"));
    await user.type(screen.getByPlaceholderText("Title"), "Java Docs");
    await user.type(screen.getByPlaceholderText("URL (optional)"), "https://docs.oracle.com");
    await user.type(screen.getByPlaceholderText("Key takeaway / excerpt"), "Thread pool sizing");
    await user.click(screen.getByText("Save"));

    expect(screen.getByText("Java Docs")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/pages/TopicDetail.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement TopicDetail**

Create `src/pages/TopicDetail.tsx`:

```tsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { findNode } from "../data/roadmap";
import { useUserData } from "../hooks/useUserData";
import { StatusToggle } from "../components/StatusToggle";
import type { Status } from "../types";

export function TopicDetail() {
  const { directionId, topicId } = useParams<{
    directionId: string;
    topicId: string;
  }>();
  const navigate = useNavigate();
  const {
    data,
    setProgress,
    addNote,
    updateNote,
    deleteNote,
    addMaterial,
    deleteMaterial,
  } = useUserData();

  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [matTitle, setMatTitle] = useState("");
  const [matUrl, setMatUrl] = useState("");
  const [matExcerpt, setMatExcerpt] = useState("");

  const node = findNode(topicId!);
  if (!node) return <div className="p-4">Topic not found</div>;

  const status: Status = data.progress[topicId!] ?? "not_started";
  const notes = data.notes[topicId!] ?? [];
  const materials = data.materials[topicId!] ?? [];

  const handleSaveNote = () => {
    if (!noteText.trim()) return;
    if (editingNoteId) {
      updateNote(topicId!, editingNoteId, noteText);
      setEditingNoteId(null);
    } else {
      addNote(topicId!, noteText);
    }
    setNoteText("");
    setShowNoteForm(false);
  };

  const handleEditNote = (id: string, text: string) => {
    setEditingNoteId(id);
    setNoteText(text);
    setShowNoteForm(true);
  };

  const handleSaveMaterial = () => {
    if (!matTitle.trim() || !matExcerpt.trim()) return;
    addMaterial(topicId!, {
      title: matTitle,
      url: matUrl || undefined,
      excerpt: matExcerpt,
    });
    setMatTitle("");
    setMatUrl("");
    setMatExcerpt("");
    setShowMaterialForm(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <button
        onClick={() => navigate(`/roadmap/${directionId}`)}
        className="text-blue-600 hover:underline mb-4 block"
      >
        Back
      </button>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">{node.title}</h1>
        <StatusToggle status={status} onChange={(s) => setProgress(topicId!, s)} />
      </div>

      {/* Notes Section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Notes</h2>
          <button
            onClick={() => {
              setShowNoteForm(true);
              setEditingNoteId(null);
              setNoteText("");
            }}
            className="text-sm text-blue-600 hover:underline"
          >
            Add Note
          </button>
        </div>

        {showNoteForm && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write your note..."
              className="w-full p-2 border rounded-lg mb-2 min-h-[100px] resize-y"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveNote}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowNoteForm(false);
                  setEditingNoteId(null);
                  setNoteText("");
                }}
                className="px-3 py-1.5 bg-gray-200 rounded-lg text-sm hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {notes.length === 0 && !showNoteForm && (
          <p className="text-gray-400 italic text-sm">No notes yet</p>
        )}

        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="p-3 bg-white border rounded-lg">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{note.text}</ReactMarkdown>
              </div>
              <div className="flex gap-2 mt-2 text-xs text-gray-400">
                <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                <button
                  onClick={() => handleEditNote(note.id, note.text)}
                  className="text-blue-500 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteNote(topicId!, note.id)}
                  className="text-red-500 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Materials Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Materials</h2>
          <button
            onClick={() => setShowMaterialForm(true)}
            className="text-sm text-blue-600 hover:underline"
          >
            Add Material
          </button>
        </div>

        {showMaterialForm && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border space-y-2">
            <input
              value={matTitle}
              onChange={(e) => setMatTitle(e.target.value)}
              placeholder="Title"
              className="w-full p-2 border rounded-lg"
            />
            <input
              value={matUrl}
              onChange={(e) => setMatUrl(e.target.value)}
              placeholder="URL (optional)"
              className="w-full p-2 border rounded-lg"
            />
            <textarea
              value={matExcerpt}
              onChange={(e) => setMatExcerpt(e.target.value)}
              placeholder="Key takeaway / excerpt"
              className="w-full p-2 border rounded-lg min-h-[80px] resize-y"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveMaterial}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => setShowMaterialForm(false)}
                className="px-3 py-1.5 bg-gray-200 rounded-lg text-sm hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {materials.length === 0 && !showMaterialForm && (
          <p className="text-gray-400 italic text-sm">No materials yet</p>
        )}

        <div className="space-y-3">
          {materials.map((mat) => (
            <div key={mat.id} className="p-3 bg-white border rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{mat.title}</h3>
                  {mat.url && (
                    <a
                      href={mat.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:underline"
                    >
                      {mat.url}
                    </a>
                  )}
                </div>
                <button
                  onClick={() => deleteMaterial(topicId!, mat.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Delete
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">{mat.excerpt}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/pages/TopicDetail.test.tsx
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/TopicDetail.tsx src/__tests__/pages/TopicDetail.test.tsx
git commit -m "feat: add TopicDetail page with notes and materials CRUD"
```

---

## Task 10: App Routing and Layout

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Wire up routing**

Replace `src/App.tsx`:

```tsx
import { HashRouter, Routes, Route } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { RoadmapView } from "./pages/RoadmapView";
import { TopicDetail } from "./pages/TopicDetail";

function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/roadmap/:directionId" element={<RoadmapView />} />
          <Route path="/roadmap/:directionId/:topicId" element={<TopicDetail />} />
        </Routes>
      </div>
    </HashRouter>
  );
}

export default App;
```

- [ ] **Step 2: Verify dev server works end-to-end**

```bash
npm run dev
```

Test manually:
1. Dashboard shows 5 directions with 0% progress
2. Click "Backend" → see hierarchical tree
3. Click "Thread Pools & Executors" → see TopicDetail
4. Toggle status, add a note, add a material
5. Navigate back — progress updates on Dashboard
6. Test on narrow viewport (mobile breakpoint)

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire up HashRouter with all routes"
```

---

## Task 11: CI/CD + StaticCrypt

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create GitHub Actions workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci
      - run: npm run build
      - run: npx staticrypt dist/index.html -p "${{ secrets.SITE_PASSWORD }}" -o dist/index.html --short

      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Verify local build works**

```bash
npm run build
```

Expected: `dist/` directory created with `index.html` and bundled assets.

- [ ] **Step 3: Test staticrypt locally**

```bash
npx staticrypt dist/index.html -p "test123" -o dist/index.html --short
```

Expected: `dist/index.html` replaced with encrypted version containing a password prompt.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat: add GitHub Actions workflow with staticrypt"
```

---

## Task 12: Cleanup and Final Verification

- [ ] **Step 1: Remove Vite boilerplate**

Delete any leftover scaffolding files:

```bash
rm -f src/App.css src/assets/react.svg public/vite.svg
```

- [ ] **Step 2: Update index.html title**

In `index.html`, change `<title>` to:

```html
<title>Learning Roadmap</title>
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 4: Run production build**

```bash
npm run build
```

Expected: clean build, no errors.

- [ ] **Step 5: Run type check**

```bash
npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: cleanup boilerplate, final verification"
```

---

## Deployment Checklist (manual, post-merge to main)

1. In GitHub repo settings → Pages → Source: GitHub Actions
2. In GitHub repo settings → Secrets → Add `SITE_PASSWORD` with your chosen password
3. Push to `main` → workflow runs → site available at `https://<username>.github.io/knowledge-storage/`
