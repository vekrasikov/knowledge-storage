import type { ReactNode } from "react";

interface Props {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function TopicAccordionSection({ title, expanded, onToggle, children }: Props) {
  return (
    <section className="border-t border-gray-200 dark:border-gray-700">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between py-3 text-left text-lg font-semibold hover:opacity-80"
      >
        <span>{title}</span>
        <span aria-hidden className="text-sm">
          {expanded ? "▾" : "▸"}
        </span>
      </button>
      {expanded && <div className="pb-4">{children}</div>}
    </section>
  );
}
