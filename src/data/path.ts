import pathYaml from "../../data/path.yaml";
import type { Path, PathFile } from "../types";

const file = pathYaml as PathFile;

export function getPath(): Path {
  return file.path;
}

export function getPhaseById(id: string) {
  return file.path.phases.find((p) => p.id === id);
}

export function getRecurringTopicIds(): string[] {
  return file.path.recurring.map((r) => r.topicId);
}
