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
