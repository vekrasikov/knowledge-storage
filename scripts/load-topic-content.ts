import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseTopicContent } from "../src/utils/topicContentFrontmatter";
import type { TopicContent } from "../src/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOPICS_DIR = join(__dirname, "..", "data", "topics");

export interface LoadedTopicFile {
  filename: string;
  content: TopicContent;
}

export function loadAllTopicContent(): LoadedTopicFile[] {
  let entries: string[];
  try {
    entries = readdirSync(TOPICS_DIR);
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read data/topics/: ${cause}`);
  }
  const mdFiles = entries.filter((f) => f.endsWith(".md"));
  const out: LoadedTopicFile[] = [];
  for (const filename of mdFiles) {
    const path = join(TOPICS_DIR, filename);
    let raw: string;
    try {
      raw = readFileSync(path, "utf-8");
    } catch (err) {
      const cause = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to read ${filename}: ${cause}`);
    }
    const content = parseTopicContent(raw, filename);
    out.push({ filename, content });
  }
  return out;
}

export function getTopicContentIdsFromDisk(): string[] {
  return loadAllTopicContent().map((f) => f.content.id);
}
