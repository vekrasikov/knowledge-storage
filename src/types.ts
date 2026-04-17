export type Status = "not_started" | "in_progress" | "done";

export type RoadmapNodeType = "topic" | "reference" | "recurring";

export interface RoadmapNode {
  id: string;
  title: string;
  summary?: string;
  resources?: string[];
  children?: RoadmapNode[];
  prerequisites?: string[];
  phase?: string;
  phaseOrder?: number;
  aliasOf?: string;
  type?: RoadmapNodeType;
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

export interface PathPhase {
  id: string;
  title: string;
  summary?: string;
}

export interface PathRecurring {
  topicId: string;
  cadence: string;
}

export interface Path {
  id: string;
  title: string;
  phases: PathPhase[];
  recurring: PathRecurring[];
}

export interface PathFile {
  path: Path;
}

export interface CheatSheet {
  key_facts?: string[];
  commands?: string[];
  trade_offs?: { headers: string[]; rows: string[][] };
  pitfalls?: string[];
  interview_questions?: string[];
  extras_markdown?: string;
}

export interface CapacityInput {
  name: string;
  value: string;
  unit: string;
}

export interface CapacityPlanning {
  inputs: CapacityInput[];
  formulas: string[];
  worked_example: string;
  numbers_to_memorize: string[];
}

export interface Visualization {
  type: "mermaid" | "image";
  content?: string;
  src?: string;
  alt: string;
}

export interface TopicContent {
  id: string;
  overview?: string;
  cheat_sheet?: CheatSheet;
  capacity_planning?: CapacityPlanning;
  visualization?: Visualization;
}
