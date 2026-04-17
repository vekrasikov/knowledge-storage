import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TopicAccordionSection } from "../../components/TopicAccordionSection";

describe("TopicAccordionSection", () => {
  it("renders title and children when expanded", () => {
    render(
      <TopicAccordionSection title="Overview" expanded={true} onToggle={() => {}}>
        <p>Body</p>
      </TopicAccordionSection>
    );
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("hides children when collapsed", () => {
    render(
      <TopicAccordionSection title="Overview" expanded={false} onToggle={() => {}}>
        <p>Body</p>
      </TopicAccordionSection>
    );
    expect(screen.queryByText("Body")).not.toBeInTheDocument();
  });

  it("fires onToggle when header clicked", () => {
    let called = 0;
    render(
      <TopicAccordionSection title="Overview" expanded={false} onToggle={() => called++}>
        <p>Body</p>
      </TopicAccordionSection>
    );
    fireEvent.click(screen.getByText("Overview"));
    expect(called).toBe(1);
  });
});
