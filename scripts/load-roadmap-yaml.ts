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

export function loadRoadmapFromYaml(): RoadmapNode[] {
  const result: RoadmapNode[] = [];
  for (const filename of FILES) {
    const path = join(DATA_DIR, filename);
    const content = readFileSync(path, "utf-8");
    const parsed = parse(content) as RoadmapNode[];
    result.push(...parsed);
  }
  return result;
}
