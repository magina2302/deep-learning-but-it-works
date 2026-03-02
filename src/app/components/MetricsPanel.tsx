import { Module, getDaysInactive, getInactivityLabel, getWeakSpots } from "../data/mock-data";
import {
  Clock, Target, AlertTriangle, CheckCircle2, Circle, BookOpen, Lightbulb,
} from "lucide-react";
import { useEffect, useState } from "react";
import { recommendStudyPlan, StudyPlanItem } from "../data/study-plan";

interface MetricsPanelProps {
  module: Module;
}

export function MetricsPanel({ module }: MetricsPanelProps) {
  const [planMinutes, setPlanMinutes] = useState(90);
  const [studyPlan, setStudyPlan] = useState<StudyPlanItem[]>(() => recommendStudyPlan(module, 90));

  const daysInactive = getDaysInactive(module.lastStudied);
  const weakSpots = getWeakSpots(module.subtopics);
  const completedCount = module.subtopics.filter((s) => s.completed).length;

  useEffect(() => {
    setStudyPlan(recommendStudyPlan(module, planMinutes));
  }, [module.id]);

  const getMasteryColor = (mastery: number) => {
    if (mastery >= 80) return "#10b981";
    if (mastery >= 50) return "#f59e0b";
    if (mastery > 0) return "#ef4444";
    return "var(--muted-foreground)";
  };

  const getMasteryLabel = (mastery: number) => {
    if (mastery >= 80) return "Strong";
    if (mastery >= 50) return "Developing";
    if (mastery > 0) return "Needs work";
    return "Not started";
  };

  const getPlanStatusMeta = (status: StudyPlanItem["status"]) => {
    if (status === "needs-work") {
      return {
        label: "Needs work",
        pillBg: "rgba(239,68,68,0.16)",
        pillColor: "#f87171",
      };
    }

    if (status === "developing") {
      return {
        label: "Developing",
        pillBg: "rgba(245,158,11,0.18)",
        pillColor: "#fbbf24",
      };
    }

    if (status === "strong") {
      return {
        label: "Strong",
        pillBg: "rgba(16,185,129,0.18)",
        pillColor: "#34d399",
      };
    }

    return {
      label: "Break",
      pillBg: "rgba(56,189,248,0.18)",
      pillColor: "#38bdf8",
    };
  };

  const handleGeneratePlan = () => {
    setStudyPlan(recommendStudyPlan(module, planMinutes));
  };

  return (
    <div className="h-full overflow-y-auto bg-[var(--card)] border-l border-[var(--border)]">
      <div className="p-5 space-y-5">
        {/* Today's Focus */}
        <div
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${module.bgColor}, rgba(255,117,65,0.05))`,
            border: `1px solid ${module.borderColor}`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4" style={{ color: module.color }} />
            <span style={{ fontSize: "0.75rem", color: module.color }}>Today's Focus</span>
          </div>
          <p style={{ fontSize: "0.85rem" }} className="text-foreground">{module.todaysFocus}</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[var(--accent)] rounded-xl p-3 text-center">
            <Clock className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
            <p style={{ fontSize: "0.7rem" }} className="text-foreground">{getInactivityLabel(daysInactive)}</p>
          </div>
          <div className="bg-[var(--accent)] rounded-xl p-3 text-center">
            <BookOpen className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
            <p style={{ fontSize: "0.7rem" }} className="text-foreground">{completedCount}/{module.subtopics.length} concepts</p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>Overall Progress</span>
            <span style={{ fontSize: "0.75rem", color: module.color }}>{module.overallMastery}%</span>
          </div>
          <div className="w-full h-2.5 bg-[var(--accent)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${module.overallMastery}%`,
                background: `linear-gradient(90deg, ${module.color}, ${module.color}bb)`,
              }}
            />
          </div>
        </div>

        {/* Study Plan Recommendation */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h4>Recommended Study Plan</h4>
            <span className="text-muted-foreground" style={{ fontSize: "0.68rem" }}>Unique to this module</span>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <input
              type="number"
              min={30}
              max={180}
              step={5}
              value={planMinutes}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (Number.isNaN(next)) return;
                setPlanMinutes(Math.max(30, Math.min(180, next)));
              }}
              className="w-20 h-9 rounded-xl px-3 bg-[var(--input-background)] text-foreground border border-[var(--border)] focus:outline-none"
              style={{ fontSize: "0.8rem" }}
            />
            <button
              type="button"
              onClick={handleGeneratePlan}
              className="h-9 px-3 rounded-xl text-white cursor-pointer"
              style={{
                fontSize: "0.78rem",
                background: "linear-gradient(135deg, #FF7541, #B352D7)",
              }}
            >
              Generate
            </button>
          </div>

          <div className="space-y-2.5">
            {studyPlan.map((item, index) => {
              const meta = getPlanStatusMeta(item.status);
              return (
                <div
                  key={item.id}
                  className="rounded-2xl p-3.5"
                  style={{
                    background: item.status === "break"
                      ? "linear-gradient(135deg, rgba(56,189,248,0.08), rgba(97,41,204,0.05))"
                      : "linear-gradient(135deg, rgba(179,82,215,0.08), rgba(97,41,204,0.05))",
                    border: item.status === "break"
                      ? "1px solid rgba(56,189,248,0.25)"
                      : "1px solid rgba(179,82,215,0.2)",
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-foreground" style={{ fontSize: "0.98rem" }}>
                      {index + 1}. {item.title}
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="px-2 py-0.5 rounded-full"
                        style={{ fontSize: "0.62rem", backgroundColor: meta.pillBg, color: meta.pillColor }}
                      >
                        {meta.label}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-white"
                        style={{ fontSize: "0.62rem", background: "linear-gradient(135deg, #FF7541, #B352D7)" }}
                      >
                        {item.minutes} mins
                      </span>
                    </div>
                  </div>
                  <p className="text-muted-foreground" style={{ fontSize: "0.76rem", lineHeight: "1.45" }}>
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Learning Summary */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4" style={{ color: "#DE6AE4" }} />
            <h4>What you've learnt so far</h4>
          </div>
          <div
            className="rounded-xl p-3.5 space-y-2"
            style={{
              background: "linear-gradient(135deg, rgba(222,106,228,0.06), rgba(97,41,204,0.06))",
              border: "1px solid rgba(222,106,228,0.12)",
            }}
          >
            {module.learningSummary.map((item, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-muted-foreground shrink-0 mt-0.5" style={{ fontSize: "0.6rem" }}>&#x2022;</span>
                <p className="text-foreground" style={{ fontSize: "0.78rem", lineHeight: "1.5" }}>{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Subtopic Mastery Breakdown */}
        {module.subtopics.length > 0 && (
          <div>
            <h4 className="mb-3">Subtopic Mastery</h4>
            <div className="space-y-2">
              {module.subtopics.map((sub) => (
                <div key={sub.id} className="bg-[var(--accent)] rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {sub.completed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                      <span style={{ fontSize: "0.78rem" }} className="text-foreground">{sub.name}</span>
                    </div>
                    <span style={{ fontSize: "0.65rem", color: getMasteryColor(sub.mastery) }}>
                      {getMasteryLabel(sub.mastery)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${sub.mastery}%`, backgroundColor: getMasteryColor(sub.mastery) }}
                      />
                    </div>
                    <span className="text-muted-foreground" style={{ fontSize: "0.65rem", minWidth: "24px", textAlign: "right" }}>
                      {sub.mastery}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Breakdown */}
        {module.errorBreakdown.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4" style={{ color: "#FF7541" }} />
              <h4>Error Breakdown</h4>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden mb-2">
              {module.errorBreakdown.map((err, i) => {
                const total = module.errorBreakdown.reduce((s, e) => s + e.count, 0);
                return (
                  <div
                    key={i}
                    style={{ width: `${(err.count / total) * 100}%`, backgroundColor: err.color }}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {module.errorBreakdown.map((err, i) => (
                <span key={i} className="flex items-center gap-1" style={{ fontSize: "0.65rem" }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: err.color }} />
                  <span className="text-muted-foreground">{err.type} ({err.count})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Weak Spots */}
        {weakSpots.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4" style={{ color: "#f59e0b" }} />
              <h4>Weak Spots</h4>
            </div>
            <div className="space-y-1.5">
              {weakSpots.map((spot) => (
                <div
                  key={spot.id}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5"
                  style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.12)" }}
                >
                  <div>
                    <p style={{ fontSize: "0.78rem" }} className="text-foreground">{spot.name}</p>
                    <p className="text-muted-foreground" style={{ fontSize: "0.65rem" }}>
                      {spot.mistakeCount} mistakes · {spot.mastery}%
                    </p>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded-full"
                    style={{ fontSize: "0.6rem", backgroundColor: "rgba(245,158,11,0.15)", color: "#f59e0b" }}
                  >
                    Needs work
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
