import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Dashboard } from "../../pages/Dashboard";

beforeEach(() => {
  localStorage.clear();
});

describe("Dashboard", () => {
  it("renders all direction titles", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    expect(screen.getByText(/Backend/)).toBeInTheDocument();
    expect(screen.getByText(/Arch/)).toBeInTheDocument();
    expect(screen.getByText(/DevOps/)).toBeInTheDocument();
    expect(screen.getByText(/Data/)).toBeInTheDocument();
    expect(screen.getByText(/English/)).toBeInTheDocument();
    expect(screen.getByText(/AI Agents/)).toBeInTheDocument();
  });

  it("has export and import buttons", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    expect(screen.getByText("Export")).toBeInTheDocument();
    expect(screen.getByText("Import")).toBeInTheDocument();
  });
});
