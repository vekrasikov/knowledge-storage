import { parse as parseYaml } from "yaml";
import type {
  TopicContent,
  CheatSheet,
  CapacityPlanning,
  Visualization,
  CapacityInput,
} from "../types";

export class ValidationError extends Error {
  readonly filename: string;
  readonly field: string;
  constructor(filename: string, field: string, message: string) {
    super(`[${filename}] ${field}: ${message}`);
    this.name = "ValidationError";
    this.filename = filename;
    this.field = field;
  }
}

function asStringArray(v: unknown, filename: string, field: string): string[] | undefined {
  if (v === undefined) return undefined;
  if (!Array.isArray(v)) throw new ValidationError(filename, field, "must be an array");
  return v.map((x) => String(x));
}

function parseCheatSheet(raw: unknown, filename: string): CheatSheet | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== "object" || raw === null) {
    throw new ValidationError(filename, "cheat_sheet", "must be an object");
  }
  const r = raw as Record<string, unknown>;
  const cs: CheatSheet = {};
  cs.key_facts = asStringArray(r.key_facts, filename, "cheat_sheet.key_facts");
  cs.commands = asStringArray(r.commands, filename, "cheat_sheet.commands");
  cs.pitfalls = asStringArray(r.pitfalls, filename, "cheat_sheet.pitfalls");
  cs.interview_questions = asStringArray(
    r.interview_questions,
    filename,
    "cheat_sheet.interview_questions"
  );
  if (typeof r.extras_markdown === "string") cs.extras_markdown = r.extras_markdown;

  if (r.trade_offs !== undefined) {
    if (typeof r.trade_offs !== "object" || r.trade_offs === null) {
      throw new ValidationError(filename, "cheat_sheet.trade_offs", "must be an object");
    }
    const t = r.trade_offs as Record<string, unknown>;
    const headers = asStringArray(t.headers, filename, "cheat_sheet.trade_offs.headers") ?? [];
    const rawRows = t.rows;
    if (!Array.isArray(rawRows)) {
      throw new ValidationError(
        filename,
        "cheat_sheet.trade_offs.rows",
        "must be an array of arrays"
      );
    }
    const rows = rawRows.map((row, i) => {
      if (!Array.isArray(row)) {
        throw new ValidationError(
          filename,
          `cheat_sheet.trade_offs.rows[${i}]`,
          "must be an array"
        );
      }
      if (row.length !== headers.length) {
        throw new ValidationError(
          filename,
          `cheat_sheet.trade_offs.rows[${i}]`,
          `has ${row.length} cells but headers has ${headers.length}`
        );
      }
      return row.map((cell) => String(cell));
    });
    cs.trade_offs = { headers, rows };
  }
  return cs;
}

function parseCapacityPlanning(raw: unknown, filename: string): CapacityPlanning | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== "object" || raw === null) {
    throw new ValidationError(filename, "capacity_planning", "must be an object");
  }
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.inputs)) {
    throw new ValidationError(filename, "capacity_planning.inputs", "must be an array");
  }
  const inputs: CapacityInput[] = r.inputs.map((x, i) => {
    if (typeof x !== "object" || x === null) {
      throw new ValidationError(filename, `capacity_planning.inputs[${i}]`, "must be an object");
    }
    const o = x as Record<string, unknown>;
    return {
      name: String(o.name ?? ""),
      value: String(o.value ?? ""),
      unit: String(o.unit ?? ""),
    };
  });
  return {
    inputs,
    formulas: asStringArray(r.formulas, filename, "capacity_planning.formulas") ?? [],
    worked_example: typeof r.worked_example === "string" ? r.worked_example : "",
    numbers_to_memorize:
      asStringArray(r.numbers_to_memorize, filename, "capacity_planning.numbers_to_memorize") ?? [],
  };
}

function parseVisualization(raw: unknown, filename: string): Visualization | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== "object" || raw === null) {
    throw new ValidationError(filename, "visualization", "must be an object");
  }
  const r = raw as Record<string, unknown>;
  const type = r.type;
  if (type !== "mermaid" && type !== "image") {
    throw new ValidationError(filename, "visualization.type", 'must be "mermaid" or "image"');
  }
  const alt = typeof r.alt === "string" ? r.alt : undefined;
  if (!alt) throw new ValidationError(filename, "visualization.alt", "is required");

  if (type === "mermaid") {
    if (typeof r.content !== "string" || r.content.trim() === "") {
      throw new ValidationError(
        filename,
        "visualization.content",
        "required when type is mermaid"
      );
    }
    return { type, content: r.content, alt };
  }
  if (typeof r.src !== "string" || r.src.trim() === "") {
    throw new ValidationError(filename, "visualization.src", "required when type is image");
  }
  return { type, src: r.src, alt };
}

// Matches a leading YAML frontmatter block (between --- fences) followed by body.
// Handles files with or without body content, trims the body.
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function splitFrontmatter(raw: string): { frontmatter: string; body: string } {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) return { frontmatter: "", body: raw };
  return { frontmatter: match[1], body: match[2] ?? "" };
}

export function parseTopicContent(raw: string, filename: string): TopicContent {
  const { frontmatter, body } = splitFrontmatter(raw);
  let data: Record<string, unknown>;
  try {
    data = (parseYaml(frontmatter) as Record<string, unknown>) ?? {};
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err);
    throw new ValidationError(filename, "frontmatter", `invalid YAML: ${cause}`);
  }
  if (typeof data.id !== "string" || data.id.trim() === "") {
    throw new ValidationError(filename, "id", "missing id in frontmatter");
  }
  const trimmedBody = body.trim();
  return {
    id: data.id,
    overview: trimmedBody === "" ? undefined : trimmedBody,
    cheat_sheet: parseCheatSheet(data.cheat_sheet, filename),
    capacity_planning: parseCapacityPlanning(data.capacity_planning, filename),
    visualization: parseVisualization(data.visualization, filename),
  };
}
