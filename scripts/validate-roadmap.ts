import { loadRoadmapFromYaml, loadPathFromYaml, loadStudyPlanFromYaml } from "./load-roadmap-yaml";
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
} from "./roadmap-validator";

function main() {
  const roadmap = loadRoadmapFromYaml();
  const { path } = loadPathFromYaml();
  const studyPlan = loadStudyPlanFromYaml();

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
  ];

  if (errors.length > 0) {
    console.error("Roadmap validation failed:");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log("Roadmap validation passed.");
}

main();
