import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import type { RoadmapNode } from "../src/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data", "roadmap");

const FILES = [
  "01-backend.yaml",
  "02-arch.yaml",
  "03-devops.yaml",
  "04-data-analysis.yaml",
  "05-python.yaml",
  "06-ai-agents.yaml",
  "07-english.yaml",
  "08-ai-dev-tools.yaml",
];

function loadOne(filename: string): RoadmapNode[] {
  const path = join(DATA_DIR, filename);
  let content: string;
  try {
    content = readFileSync(path, "utf-8");
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read ${filename}: ${cause}`);
  }
  try {
    return parse(content) as RoadmapNode[];
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse ${filename}: ${cause}`);
  }
}

export function loadRoadmapFromYaml(): RoadmapNode[] {
  const result: RoadmapNode[] = [];
  for (const filename of FILES) {
    result.push(...loadOne(filename));
  }
  return result;
}
