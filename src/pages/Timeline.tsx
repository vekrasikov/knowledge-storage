import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getStudyPlan, getPhaseForWeek, getWeekProgress } from "../data/studyPlan";
import { findNode } from "../data/roadmap";
import { useUserData } from "../hooks/useUserData";
import { TopicPanel } from "../components/TopicPanel";
import type { Status, StudyDay, DayKey } from "../types";

const DAY_LABELS: Record<DayKey, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
};

const PHASE_COLORS: Record<string, string> = {
  blue: "bg-blue-50 border-blue-200 text-blue-700",
  purple: "bg-purple-50 border-purple-200 text-purple-700",
  cyan: "bg-cyan-50 border-cyan-200 text-cyan-700",
  orange: "bg-orange-50 border-orange-200 text-orange-700",
  yellow: "bg-yellow-50 border-yellow-200 text-yellow-700",
  pink: "bg-pink-50 border-pink-200 text-pink-700",
};

const STATUS_DOT: Record<Status, string> = {
  not_started: "bg-slate-300",
  in_progress: "bg-amber-400",
  done: "bg-emerald-500",
};

export function Timeline() {
  const navigate = useNavigate();
  const { data } = useUserData();
  const plan = getStudyPlan();

  // Find the "current week" = first week that has any non-done topic
  const currentWeek = useMemo(() => {
    for (const w of plan.weeks) {
      const undone = w.days.some(
        (d) => (data.progress[d.topicId] ?? "not_started") !== "done"
      );
      if (undone) return w.week;
    }
    return plan.weeks.length;
  }, [data.progress, plan.weeks]);

  const [expandedWeek, setExpandedWeek] = useState<number>(currentWeek);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const overallTotal = plan.weeks.reduce((s, w) => s + w.days.length, 0);
  const overallDone = plan.weeks.reduce(
    (s, w) =>
      s +
      w.days.filter((d) => data.progress[d.topicId] === "done").length,
    0
  );
  const overallPct =
    overallTotal === 0 ? 0 : Math.round((overallDone / overallTotal) * 100);

  const handleTopicClick = (day: StudyDay) => {
    setSelectedTopic(day.topicId);
  };

  const renderDay = (day: StudyDay) => {
    const node = findNode(day.topicId);
    const status: Status = data.progress[day.topicId] ?? "not_started";
    const recurring = plan.recurring[day.day];

    return (
      <div
        key={day.day}
        className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
      >
        <div className="flex-shrink-0 w-10 text-xs font-semibold text-slate-400 uppercase mt-0.5">
          {DAY_LABELS[day.day]}
        </div>
        <div className="flex-1 min-w-0">
          <button
            onClick={() => handleTopicClick(day)}
            className="text-left w-full"
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${STATUS_DOT[status]} flex-shrink-0`}
              />
              <span className="text-sm font-medium text-slate-800 truncate hover:text-blue-600 transition-colors">
                {node?.title ?? day.topicId}
              </span>
              <span className="text-xs text-slate-400 flex-shrink-0">
                {day.minutes}m
              </span>
            </div>
            {recurring && (
              <div className="text-xs text-slate-400 mt-0.5 ml-4">
                + {recurring.label} ({recurring.minutes}m)
              </div>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto p-4 pb-24">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/")}
          className="text-blue-600 hover:underline mb-3 text-sm"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-slate-900">Study Timeline</h1>
        <p className="text-slate-500 mt-1">
          24 weeks · {plan.config.dailyMinutes} min/day · 5 days/week
        </p>
        <div className="mt-4 bg-white rounded-xl border p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">
              Overall progress
            </span>
            <span className="text-sm text-slate-500">
              {overallDone} / {overallTotal} ({overallPct}%)
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Weeks */}
      <div className="space-y-3">
        {plan.weeks.map((week) => {
          const phase = getPhaseForWeek(week.week);
          const progress = getWeekProgress(week, data.progress);
          const isExpanded = expandedWeek === week.week;
          const isCurrent = week.week === currentWeek;
          const phaseColorClass = phase
            ? PHASE_COLORS[phase.color] ?? PHASE_COLORS.blue
            : PHASE_COLORS.blue;

          return (
            <div
              key={week.week}
              className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                isCurrent ? "ring-2 ring-blue-300" : ""
              }`}
            >
              <button
                onClick={() =>
                  setExpandedWeek(isExpanded ? -1 : week.week)
                }
                className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex-shrink-0 w-14 h-14 bg-slate-50 rounded-lg flex flex-col items-center justify-center border">
                  <span className="text-xs text-slate-400 uppercase">Week</span>
                  <span className="text-lg font-bold text-slate-700">
                    {week.week}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h2 className="text-base font-semibold text-slate-800">
                      {week.title}
                    </h2>
                    {isCurrent && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {phase && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${phaseColorClass}`}
                      >
                        {phase.title}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {progress.done}/{progress.total} topics
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                  <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-400">
                    {isExpanded ? "▼" : "▶"}
                  </span>
                </div>
              </button>
              {isExpanded && (
                <div className="border-t border-slate-100 px-2 pb-2">
                  {week.days.map(renderDay)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedTopic && (
        <TopicPanel
          topicId={selectedTopic}
          directionId=""
          onClose={() => setSelectedTopic(null)}
        />
      )}
    </div>
  );
}
