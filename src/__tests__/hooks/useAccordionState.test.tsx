import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAccordionState } from "../../hooks/useAccordionState";

describe("useAccordionState", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("uses defaults when no persisted state", () => {
    const { result } = renderHook(() =>
      useAccordionState("topic-x", { overview: true, cheat: false })
    );
    expect(result.current.state).toEqual({ overview: true, cheat: false });
  });

  it("toggles and persists state", () => {
    const { result } = renderHook(() =>
      useAccordionState("topic-x", { overview: true, cheat: false })
    );
    act(() => result.current.toggle("cheat"));
    expect(result.current.state.cheat).toBe(true);
    const { result: result2 } = renderHook(() =>
      useAccordionState("topic-x", { overview: true, cheat: false })
    );
    expect(result2.current.state.cheat).toBe(true);
  });

  it("isolates state per topic id", () => {
    const { result: a } = renderHook(() =>
      useAccordionState("topic-a", { overview: true })
    );
    const { result: b } = renderHook(() =>
      useAccordionState("topic-b", { overview: true })
    );
    act(() => a.current.toggle("overview"));
    expect(a.current.state.overview).toBe(false);
    expect(b.current.state.overview).toBe(true);
  });
});
