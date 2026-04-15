import rawData from "../../data/study-plan.yaml";
import type { StudyPlan, StudyWeek, StudyPhase } from "../types";

const plan: StudyPlan = rawData as StudyPlan;

export function getStudyPlan(): StudyPlan {
  return plan;
}

export function getPhaseForWeek(weekNumber: number): StudyPhase | undefined {
  return plan.phases.find((p) => p.weeks.includes(weekNumber));
}

export function getAllStudyTopicIds(): string[] {
  const ids = new Set<string>();
  plan.weeks.forEach((w) => w.days.forEach((d) => ids.add(d.topicId)));
  Object.values(plan.recurring).forEach((r) => ids.add(r.topicId));
  return Array.from(ids);
}

export function getWeekProgress(
  week: StudyWeek,
  progress: Record<string, string>
): { done: number; inProgress: number; total: number; percentage: number } {
  const total = week.days.length;
  const done = week.days.filter((d) => progress[d.topicId] === "done").length;
  const inProgress = week.days.filter(
    (d) => progress[d.topicId] === "in_progress"
  ).length;
  const percentage = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, inProgress, total, percentage };
}
