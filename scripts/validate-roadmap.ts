import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadRoadmapFromYaml,
  loadPathFromYaml,
  loadStudyPlanFromYaml,
} from "./load-roadmap-yaml";
import { loadAllTopicContent } from "./load-topic-content";
import {
  checkUniqueIds,
  checkAliasTargets,
  checkPrereqExistence,
  checkPrereqCycles,
  checkPhaseOrderUniqueness,
  checkPhaseReferencesValid,
  checkPhaseCoverage,
  checkEveryLeafHasPhaseOrType,
  checkRecurringTopicIds,
  checkStudyPlanTopicIds,
  checkTopicContentIds,
  checkVisualizationImageExists,
} from "./roadmap-validator";

const __dirname = dirname(fileURLToPath(import.meta.url));

function listPublicFiles(): Set<string> {
  const publicDir = join(__dirname, "..", "public");
  const out = new Set<string>();
  function walk(dir: string, rel: string) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const nextRel = rel + "/" + e.name;
      if (e.isDirectory()) walk(join(dir, e.name), nextRel);
      else out.add(nextRel);
    }
  }
  walk(publicDir, "");
  return out;
}

function main() {
  const roadmap = loadRoadmapFromYaml();
  const { path } = loadPathFromYaml();
  const studyPlan = loadStudyPlanFromYaml();
  const topicFiles = loadAllTopicContent();
  const topicContentIds = topicFiles.map((f) => f.content.id);
  const publicFiles = listPublicFiles();

  // Include english-* phases as valid (cross-cutting, not listed in path.phases)
  const validPhases = new Set<string>([
    ...path.phases.map((p) => p.id),
    "english-phase1-activation",
    "english-phase2-immersion",
    "english-phase3-polish",
  ]);

  const studyPlanIds = studyPlan.weeks.flatMap((w) => w.days.map((d) => d.topicId));

  const errors = [
    ...checkUniqueIds(roadmap),
    ...checkAliasTargets(roadmap),
    ...checkPrereqExistence(roadmap),
    ...checkPrereqCycles(roadmap),
    ...checkPhaseOrderUniqueness(roadmap),
    ...checkPhaseReferencesValid(roadmap, validPhases),
    ...checkPhaseCoverage(roadmap, path.phases.map((p) => p.id)),
    ...checkEveryLeafHasPhaseOrType(roadmap),
    ...checkRecurringTopicIds(roadmap, path.recurring.map((r) => r.topicId)),
    ...checkStudyPlanTopicIds(roadmap, studyPlanIds),
    ...checkTopicContentIds(roadmap, topicContentIds),
    ...checkVisualizationImageExists(topicFiles, publicFiles),
  ];

  if (errors.length > 0) {
    console.error("Roadmap validation failed:");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log("Roadmap validation passed.");
}

main();
