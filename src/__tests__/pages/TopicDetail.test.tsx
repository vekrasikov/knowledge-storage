import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TopicDetail } from "../../pages/TopicDetail";

beforeEach(() => {
  localStorage.clear();
});

function renderTopic(directionId: string, topicId: string) {
  return render(
    <MemoryRouter initialEntries={[`/roadmap/${directionId}/${topicId}`]}>
      <Routes>
        <Route
          path="/roadmap/:directionId/:topicId"
          element={<TopicDetail />}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("TopicDetail", () => {
  it("renders topic title", () => {
    renderTopic("backend", "virtual-threads");
    expect(screen.getByText("Virtual Threads & Structured Concurrency")).toBeInTheDocument();
  });

  it("renders status toggle", () => {
    renderTopic("backend", "virtual-threads");
    expect(screen.getByText("Not Started")).toBeInTheDocument();
  });

  it("renders notes and materials sections", () => {
    renderTopic("backend", "virtual-threads");
    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(screen.getByText("Materials")).toBeInTheDocument();
  });

  it("can add a note", async () => {
    const user = userEvent.setup();
    renderTopic("backend", "virtual-threads");

    await user.click(screen.getByText("Add Note"));
    const textarea = screen.getByPlaceholderText("Write your note...");
    await user.type(textarea, "My first note");
    await user.click(screen.getByText("Save"));

    expect(screen.getByText("My first note")).toBeInTheDocument();
  });

  it("can add a material", async () => {
    const user = userEvent.setup();
    renderTopic("backend", "virtual-threads");

    await user.click(screen.getByText("Add Material"));
    await user.type(screen.getByPlaceholderText("Title"), "Java Docs");
    await user.type(screen.getByPlaceholderText("URL (optional)"), "https://docs.oracle.com");
    await user.type(screen.getByPlaceholderText("Key takeaway / excerpt"), "Thread pool sizing");
    await user.click(screen.getByText("Save"));

    expect(screen.getByText("Java Docs")).toBeInTheDocument();
  });
});
