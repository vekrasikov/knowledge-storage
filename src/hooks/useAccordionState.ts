import { useCallback, useEffect, useState } from "react";

function storageKey(topicId: string): string {
  return `topic-accordion-${topicId}`;
}

export function useAccordionState<T extends Record<string, boolean>>(
  topicId: string,
  defaults: T
) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey(topicId));
      if (raw === null) return defaults;
      const parsed = JSON.parse(raw) as Partial<T>;
      return { ...defaults, ...parsed };
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(topicId), JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }, [topicId, state]);

  const toggle = useCallback((key: keyof T) => {
    setState((s) => ({ ...s, [key]: !s[key] } as T));
  }, []);

  return { state, toggle };
}
