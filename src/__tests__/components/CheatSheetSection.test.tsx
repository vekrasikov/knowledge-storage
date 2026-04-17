import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CheatSheetSection } from "../../components/CheatSheetSection";
import type { CheatSheet } from "../../types";

describe("CheatSheetSection", () => {
  it("renders key_facts, commands, trade_offs, pitfalls, interview_questions, and extras", () => {
    const cs: CheatSheet = {
      key_facts: ["fact 1", "fact 2"],
      commands: ["cmd --flag"],
      trade_offs: {
        headers: ["Aspect", "A", "B"],
        rows: [
          ["Speed", "fast", "slow"],
          ["Memory", "low", "high"],
        ],
      },
      pitfalls: ["watch out for X"],
      interview_questions: ["why Y?"],
      extras_markdown: "### Extras\n\nDetail.",
    };
    render(<CheatSheetSection cheatSheet={cs} />);
    expect(screen.getByText("fact 1")).toBeInTheDocument();
    expect(screen.getByText("cmd --flag")).toBeInTheDocument();
    expect(screen.getByText("Aspect")).toBeInTheDocument();
    expect(screen.getByText("Memory")).toBeInTheDocument();
    expect(screen.getByText("watch out for X")).toBeInTheDocument();
    expect(screen.getByText("why Y?")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Extras" })).toBeInTheDocument();
  });

  it("skips missing sub-sections gracefully", () => {
    render(<CheatSheetSection cheatSheet={{ key_facts: ["only fact"] }} />);
    expect(screen.getByText("only fact")).toBeInTheDocument();
    expect(screen.queryByText(/trade-offs/i)).not.toBeInTheDocument();
  });

  it("renders empty-state when cheatSheet is undefined", () => {
    render(<CheatSheetSection cheatSheet={undefined} />);
    expect(screen.getByText(/no cheat sheet yet/i)).toBeInTheDocument();
  });
});
