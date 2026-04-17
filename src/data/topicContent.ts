import { parseTopicContent } from "../utils/topicContentFrontmatter";
import type { TopicContent } from "../types";

// Raw markdown files eagerly imported from data/topics/
const rawFiles = import.meta.glob("/data/topics/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export function buildContentMap(
  files: Record<string, string>
): Map<string, TopicContent> {
  const map = new Map<string, TopicContent>();
  for (const [path, raw] of Object.entries(files)) {
    const filename = path.split("/").pop() ?? path;
    const content = parseTopicContent(raw, filename);
    map.set(content.id, content);
  }
  return map;
}

const contentMap = buildContentMap(rawFiles);

export function getTopicContent(
  id: string,
  map: Map<string, TopicContent> = contentMap,
  aliasMap: Map<string, string> = new Map()
): TopicContent | null {
  const canonical = aliasMap.get(id) ?? id;
  return map.get(canonical) ?? null;
}

export function getAllTopicContentIds(): string[] {
  return Array.from(contentMap.keys());
}
