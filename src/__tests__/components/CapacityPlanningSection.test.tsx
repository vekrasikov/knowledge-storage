import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CapacityPlanningSection } from "../../components/CapacityPlanningSection";
import type { CapacityPlanning } from "../../types";

describe("CapacityPlanningSection", () => {
  it("renders inputs, formulas, worked_example, numbers_to_memorize", () => {
    const cp: CapacityPlanning = {
      inputs: [{ name: "DAU", value: "1M", unit: "users" }],
      formulas: ["RPS = DAU / 86400"],
      worked_example: "1M / 86400 ≈ 11.6 RPS",
      numbers_to_memorize: ["1 day ≈ 86400s", "1 year ≈ 3.15e7s"],
    };
    render(<CapacityPlanningSection capacity={cp} />);
    expect(screen.getByText("DAU")).toBeInTheDocument();
    expect(screen.getByText("1M")).toBeInTheDocument();
    expect(screen.getByText("users")).toBeInTheDocument();
    expect(screen.getByText("RPS = DAU / 86400")).toBeInTheDocument();
    expect(screen.getByText(/11.6 RPS/)).toBeInTheDocument();
    expect(screen.getByText(/86400s/)).toBeInTheDocument();
  });

  it("renders empty state when capacity is undefined", () => {
    render(<CapacityPlanningSection capacity={undefined} />);
    expect(screen.getByText(/no capacity planning yet/i)).toBeInTheDocument();
  });
});
