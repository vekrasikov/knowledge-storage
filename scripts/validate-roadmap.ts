import { getRoadmap } from "../src/data/roadmap";
import { checkUniqueIds } from "./roadmap-validator";

function main() {
  const roadmap = getRoadmap();
  const errors = [...checkUniqueIds(roadmap)];

  if (errors.length > 0) {
    console.error("Roadmap validation failed:");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log("Roadmap validation passed.");
}

main();
