export type Status = "not_started" | "in_progress" | "done";

export interface RoadmapNode {
  id: string;
  title: string;
  children?: RoadmapNode[];
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
