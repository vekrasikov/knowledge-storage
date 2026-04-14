import type { Status } from "../types";

const STATUS_CONFIG: Record<Status, { label: string; color: string; next: Status }> = {
  not_started: { label: "Not Started", color: "bg-slate-100 text-slate-600 border border-slate-200", next: "in_progress" },
  in_progress: { label: "In Progress", color: "bg-amber-50 text-amber-700 border border-amber-200", next: "done" },
  done: { label: "Done", color: "bg-emerald-50 text-emerald-700 border border-emerald-200", next: "not_started" },
};

interface StatusToggleProps {
  status: Status;
  onChange: (status: Status) => void;
}

export function StatusToggle({ status, onChange }: StatusToggleProps) {
  const config = STATUS_CONFIG[status];
  return (
    <button
      onClick={() => onChange(config.next)}
      className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.color} hover:opacity-80 transition-opacity whitespace-nowrap`}
    >
      {config.label}
    </button>
  );
}
