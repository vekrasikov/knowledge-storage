import { describe, it, expect } from "vitest";
import { getPath } from "../../data/path";

describe("getPath", () => {
  it("returns path with 9 phases", () => {
    const p = getPath();
    expect(p.id).toBe("senior-backend-polyglot");
    expect(p.phases).toHaveLength(9);
    expect(p.phases[0].id).toBe("phase-1-programming");
    expect(p.phases[8].id).toBe("phase-9-specialization");
  });

  it("includes required recurring tracks", () => {
    const p = getPath();
    const ids = p.recurring.map((r) => r.topicId);
    expect(ids).toContain("leetcode-practice");
    expect(ids).toContain("clozemaster-practice");
    expect(ids).toContain("shadowing");
  });
});
