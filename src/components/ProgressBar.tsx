interface ProgressBarProps {
  percentage: number;
  label?: string;
  variant?: "default" | "stacked";
  done?: number;
  inProgress?: number;
  total?: number;
}

export function ProgressBar({ percentage, label, variant = "default", done = 0, inProgress = 0, total = 0 }: ProgressBarProps) {
  if (variant === "stacked" && total > 0) {
    const donePct = Math.round((done / total) * 100);
    const ipPct = Math.round((inProgress / total) * 100);
    return (
      <div className="w-full">
        {label && (
          <div className="flex justify-between text-sm text-slate-500 mb-1">
            <span>{label}</span>
          </div>
        )}
        <div className="w-full bg-slate-100 rounded-full h-2 flex overflow-hidden">
          {donePct > 0 && (
            <div className="bg-emerald-500 h-2 transition-all duration-300" style={{ width: `${donePct}%` }} />
          )}
          {ipPct > 0 && (
            <div className="bg-amber-400 h-2 transition-all duration-300" style={{ width: `${ipPct}%` }} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-sm text-slate-500 mb-1">
          <span>{label}</span>
          <span>{percentage}%</span>
        </div>
      )}
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
