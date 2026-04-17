import { describe, it, expect } from "vitest";
import {
  getTopicContent,
  buildContentMap,
} from "../../data/topicContent";
import type { TopicContent } from "../../types";

describe("buildContentMap", () => {
  it("returns empty map when no files", () => {
    const map = buildContentMap({});
    expect(map.size).toBe(0);
  });

  it("parses raw markdown entries into map keyed by id", () => {
    const files = {
      "/data/topics/a.md": `---
id: topic-a
---

# A body`,
      "/data/topics/b.md": `---
id: topic-b
---

# B body`,
    };
    const map = buildContentMap(files);
    expect(map.size).toBe(2);
    expect(map.get("topic-a")?.overview).toContain("A body");
    expect(map.get("topic-b")?.overview).toContain("B body");
  });

  it("throws on parse error in any file", () => {
    const files = {
      "/data/topics/bad.md": `---\n---\n`,
    };
    expect(() => buildContentMap(files)).toThrow();
  });
});

describe("getTopicContent (with alias resolution)", () => {
  const contentMap = new Map<string, TopicContent>([
    ["canonical", { id: "canonical", overview: "real" }],
  ]);

  it("returns content for canonical id", () => {
    const aliasMap = new Map<string, string>();
    expect(getTopicContent("canonical", contentMap, aliasMap)?.overview).toBe("real");
  });

  it("redirects alias to canonical content", () => {
    const aliasMap = new Map<string, string>([["alias", "canonical"]]);
    expect(getTopicContent("alias", contentMap, aliasMap)?.overview).toBe("real");
  });

  it("returns null for unknown id", () => {
    expect(getTopicContent("missing", contentMap, new Map())).toBeNull();
  });
});
