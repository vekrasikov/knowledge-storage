import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OverviewSection } from "../../components/OverviewSection";

describe("OverviewSection", () => {
  it("renders markdown headings and paragraphs", () => {
    render(<OverviewSection markdown={"# Title\n\nBody text."} />);
    expect(screen.getByRole("heading", { level: 1, name: "Title" })).toBeInTheDocument();
    expect(screen.getByText("Body text.")).toBeInTheDocument();
  });

  it("renders an empty state when markdown is empty", () => {
    render(<OverviewSection markdown={undefined} />);
    expect(screen.getByText(/no overview yet/i)).toBeInTheDocument();
  });
});
