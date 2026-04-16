import { describe, it, expect } from "vitest";
import { resolveProgressId, getProgressStatus, setProgressStatus } from "../../utils/progress";
import type { Status } from "../../types";

describe("resolveProgressId", () => {
  it("returns canonical id when alias provided", () => {
    const aliasMap = new Map([["old-id", "new-id"]]);
    expect(resolveProgressId("old-id", aliasMap)).toBe("new-id");
  });
  it("returns id unchanged when not an alias", () => {
    const aliasMap = new Map();
    expect(resolveProgressId("x", aliasMap)).toBe("x");
  });
});

describe("getProgressStatus / setProgressStatus with aliases", () => {
  it("getProgressStatus redirects alias to canonical", () => {
    const progress: Record<string, Status> = { canonical: "done" };
    const aliasMap = new Map([["alias", "canonical"]]);
    expect(getProgressStatus("alias", progress, aliasMap)).toBe("done");
  });
  it("setProgressStatus writes to canonical when given alias", () => {
    const progress: Record<string, Status> = {};
    const aliasMap = new Map([["alias", "canonical"]]);
    setProgressStatus("alias", "in_progress", progress, aliasMap);
    expect(progress).toEqual({ canonical: "in_progress" });
  });
  it("setProgressStatus preserves existing alias entries by migrating to canonical", () => {
    const progress: Record<string, Status> = { alias: "done" };
    const aliasMap = new Map([["alias", "canonical"]]);
    const status = getProgressStatus("alias", progress, aliasMap);
    setProgressStatus("alias", status as Status, progress, aliasMap);
    expect(progress.canonical).toBe("done");
  });
});
