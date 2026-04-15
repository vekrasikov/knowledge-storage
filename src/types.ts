export type Status = "not_started" | "in_progress" | "done";

export interface RoadmapNode {
  id: string;
  title: string;
  summary?: string;
  resources?: string[];
  children?: RoadmapNode[];
}

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri";

export interface StudyDay {
  day: DayKey;
  topicId: string;
  minutes: number;
}

export interface StudyWeek {
  week: number;
  title: string;
  days: StudyDay[];
}

export interface StudyPhase {
  id: string;
  title: string;
  weeks: number[];
  color: string;
}

export interface RecurringPractice {
  topicId: string;
  minutes: number;
  label: string;
}

export interface StudyPlan {
  config: {
    dailyMinutes: number;
    studyDays: DayKey[];
  };
  recurring: Record<DayKey, RecurringPractice>;
  phases: StudyPhase[];
  weeks: StudyWeek[];
}

export interface Note {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  id: string;
  title: string;
  url?: string;
  excerpt: string;
  createdAt: string;
}

export interface UserData {
  version: number;
  progress: Record<string, Status>;
  notes: Record<string, Note[]>;
  materials: Record<string, Material[]>;
}
