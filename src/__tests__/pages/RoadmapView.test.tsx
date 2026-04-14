import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RoadmapView } from "../../pages/RoadmapView";

beforeEach(() => {
  localStorage.clear();
});

function renderWithRoute(directionId: string) {
  return render(
    <MemoryRouter initialEntries={[`/roadmap/${directionId}`]}>
      <Routes>
        <Route path="/roadmap/:directionId" element={<RoadmapView />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("RoadmapView", () => {
  it("renders direction title", () => {
    renderWithRoute("backend");
    expect(screen.getByText("Backend (Java/Kotlin)")).toBeInTheDocument();
  });

  it("renders child topics", () => {
    renderWithRoute("backend");
    expect(screen.getByText("Modern Java (21-25)")).toBeInTheDocument();
    expect(screen.getByText("JVM Internals")).toBeInTheDocument();
  });

  it("renders nested subtopics", () => {
    renderWithRoute("backend");
    expect(screen.getByText("Virtual Threads & Structured Concurrency")).toBeInTheDocument();
  });

  it("shows back link", () => {
    renderWithRoute("backend");
    expect(screen.getByText("← Back")).toBeInTheDocument();
  });
});
