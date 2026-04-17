import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { VisualizationSection } from "../../components/VisualizationSection";
import type { Visualization } from "../../types";

vi.mock("../../components/MermaidDiagram", () => ({
  MermaidDiagram: ({ content, alt }: { content: string; alt: string }) => (
    <div data-testid="mermaid" aria-label={alt}>
      {content}
    </div>
  ),
}));

describe("VisualizationSection", () => {
  it("renders MermaidDiagram for type=mermaid", () => {
    const v: Visualization = {
      type: "mermaid",
      content: "graph LR\n A --> B",
      alt: "A to B",
    };
    render(<VisualizationSection visualization={v} />);
    expect(screen.getByTestId("mermaid")).toBeInTheDocument();
    expect(screen.getByTestId("mermaid")).toHaveAttribute("aria-label", "A to B");
  });

  it("renders <img> for type=image", () => {
    const v: Visualization = {
      type: "image",
      src: "/visualizations/x.svg",
      alt: "X diagram",
    };
    render(<VisualizationSection visualization={v} />);
    const img = screen.getByAltText("X diagram") as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toContain("/visualizations/x.svg");
  });

  it("renders empty state when visualization is undefined", () => {
    render(<VisualizationSection visualization={undefined} />);
    expect(screen.getByText(/no visualization yet/i)).toBeInTheDocument();
  });
});
