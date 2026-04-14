import type { Status } from "../types";

const STATUS_CONFIG: Record<Status, { label: string; color: string; next: Status }> = {
  not_started: { label: "Not Started", color: "bg-gray-200 text-gray-700", next: "in_progress" },
  in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-800", next: "done" },
  done: { label: "Done", color: "bg-green-100 text-green-800", next: "not_started" },
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
      className={`px-3 py-1 rounded-full text-sm font-medium ${config.color} hover:opacity-80 transition-opacity`}
    >
      {config.label}
    </button>
  );
}
