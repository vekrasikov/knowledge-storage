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
  migrateAliasProgress,
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

describe("migrateAliasProgress", () => {
  it("returns data unchanged when aliasMap empty", () => {
    const data: UserData = {
      version: 1,
      progress: { a: "done" },
      notes: {},
      materials: {},
    };
    expect(migrateAliasProgress(data, new Map())).toEqual(data);
  });

  it("rewrites alias key to canonical", () => {
    const data: UserData = {
      version: 1,
      progress: { pandas: "done" },
      notes: {},
      materials: {},
    };
    const aliasMap = new Map([["pandas", "py-pandas"]]);
    const out = migrateAliasProgress(data, aliasMap);
    expect(out.progress).toEqual({ "py-pandas": "done" });
  });

  it("canonical wins when both alias and canonical have entries", () => {
    const data: UserData = {
      version: 1,
      progress: { pandas: "in_progress", "py-pandas": "done" },
      notes: {},
      materials: {},
    };
    const aliasMap = new Map([["pandas", "py-pandas"]]);
    const out = migrateAliasProgress(data, aliasMap);
    expect(out.progress).toEqual({ "py-pandas": "done" });
  });

  it("keeps non-alias keys as-is", () => {
    const data: UserData = {
      version: 1,
      progress: { "virtual-threads": "done" },
      notes: {},
      materials: {},
    };
    const aliasMap = new Map([["pandas", "py-pandas"]]);
    expect(migrateAliasProgress(data, aliasMap).progress).toEqual({
      "virtual-threads": "done",
    });
  });
});
