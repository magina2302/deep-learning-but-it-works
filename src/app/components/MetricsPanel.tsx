import { Module, getDaysInactive, getInactivityLabel, getWeakSpots } from "../data/mock-data";
import {
  Clock, Target, AlertTriangle, CheckCircle2, Circle, BookOpen, Lightbulb, ClipboardList,
} from "lucide-react";
import { useEffect, useState } from "react";
import { recommendStudyPlan, StudyPlanItem } from "../data/study-plan";
import { createModuleSummary } from "../data/learning-core";
import { useModules } from "./ModulesContext";

interface MetricsPanelProps {
  module: Module;
}

export function MetricsPanel({ module }: MetricsPanelProps) {
  const { setWeeklyPlanBlockCompletion, markModuleCheckIn } = useModules();
  const [timeAvailable, setTimeAvailable] = useState("90");
  const [studyPlan, setStudyPlan] = useState<StudyPlanItem[]>([]);
  const [planGenerated, setPlanGenerated] = useState(false);

  const daysInactive = getDaysInactive(module.lastStudied);
  const weakSpots = getWeakSpots(module.subtopics);
  const completedCount = module.subtopics.filter((s) => s.completed).length;
  const masteryBreakdown = module.masteryBreakdown;
  const weeklyPlan = module.weeklyPlan || [];
  const nextActions = module.nextActions || [];
  const mistakeHistory = module.mistakeHistory || [];

  useEffect(() => {
    setStudyPlan([]);
    setPlanGenerated(false);
    setTimeAvailable("90");
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

  const tagColor = (status: StudyPlanItem["status"]) => {
    if (status === "needs-work") return "#ef4444";
    if (status === "developing") return "#f59e0b";
    if (status === "break") return "#38bdf8";
    return "#10b981";
  };

  const tagLabel = (status: StudyPlanItem["status"]) => {
    if (status === "needs-work") return "Needs work";
    if (status === "developing") return "Developing";
    if (status === "break") return "Break";
    return "Strong";
  };

  const generateStudyPlan = () => {
    const minutes = parseInt(timeAvailable, 10);
    if (!minutes || minutes < 30) return;

    setStudyPlan(recommendStudyPlan(module, minutes));
    setPlanGenerated(true);
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

        {masteryBreakdown && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4" style={{ color: module.color }} />
              <h4>Why your mastery is {masteryBreakdown.overall}%</h4>
            </div>
            <div className="rounded-xl p-4 border border-[var(--border)] bg-[var(--accent)] space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Retrieval", value: masteryBreakdown.retrieval },
                  { label: "Consistency", value: masteryBreakdown.consistency },
                  { label: "Recency", value: masteryBreakdown.recency },
                  { label: "Completion", value: masteryBreakdown.completion },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-[var(--card)] px-3 py-2">
                    <p className="text-muted-foreground" style={{ fontSize: "0.62rem" }}>{item.label}</p>
                    <p className="text-foreground" style={{ fontSize: "0.85rem" }}>{item.value}%</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {masteryBreakdown.explanation.map((line) => (
                  <p key={line} className="text-muted-foreground" style={{ fontSize: "0.72rem", lineHeight: "1.45" }}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {module.diagnostic && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4" style={{ color: "#38bdf8" }} />
              <h4>Goal & Deadline Coach</h4>
            </div>
            <div className="rounded-xl p-4 border border-[var(--border)] bg-[var(--accent)] space-y-2">
              <p className="text-foreground" style={{ fontSize: "0.78rem", lineHeight: "1.45" }}>{module.diagnostic.goal}</p>
              <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>
                Weekly budget: {module.diagnostic.weeklyStudyMinutes} mins
                {module.diagnostic.deadline ? ` · Deadline: ${new Date(module.diagnostic.deadline).toLocaleDateString()}` : ""}
              </p>
              {module.diagnostic.knownWeakAreas.length > 0 && (
                <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>
                  Weak areas flagged at onboarding: {module.diagnostic.knownWeakAreas.join(", ")}
                </p>
              )}
            </div>
          </div>
        )}

        {weeklyPlan.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList className="w-4 h-4" style={{ color: "#DE6AE4" }} />
              <h4>Weekly Plan</h4>
            </div>
            <div className="space-y-2">
              {weeklyPlan.map((block) => (
                <div key={block.id} className="rounded-xl border border-[var(--border)] bg-[var(--accent)] px-3 py-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div>
                      <span className="text-foreground" style={{ fontSize: "0.78rem", textDecoration: block.isCompleted ? "line-through" : "none", opacity: block.isCompleted ? 0.7 : 1 }}>{block.title}</span>
                      {block.scheduledFor && (
                        <p className="text-muted-foreground" style={{ fontSize: "0.62rem" }}>
                          Scheduled for {new Date(block.scheduledFor).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-white" style={{ fontSize: "0.6rem", backgroundColor: block.isCompleted ? "#10b981" : module.color }}>{block.minutes} mins</span>
                      <button
                        type="button"
                        onClick={() => void setWeeklyPlanBlockCompletion(module.id, block.id, !(block.isCompleted ?? false))}
                        className="px-2 py-1 rounded-lg bg-[var(--card)] border border-[var(--border)] text-foreground cursor-pointer"
                        style={{ fontSize: "0.62rem" }}
                      >
                        {block.isCompleted ? "Undo" : "Done"}
                      </button>
                    </div>
                  </div>
                  <p className="text-muted-foreground" style={{ fontSize: "0.68rem", lineHeight: "1.45" }}>{block.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4" style={{ color: module.color }} />
            <h4>Habit Loop</h4>
          </div>
          <div className="rounded-xl p-4 border border-[var(--border)] bg-[var(--accent)] flex items-center justify-between gap-3">
            <div>
              <p className="text-foreground" style={{ fontSize: "0.78rem" }}>
                {module.lastCheckInAt
                  ? `Last check-in: ${new Date(module.lastCheckInAt).toLocaleString()}`
                  : "No check-in yet for this module."}
              </p>
              <p className="text-muted-foreground" style={{ fontSize: "0.68rem", lineHeight: "1.45" }}>
                Quick check-ins keep the coach state fresh even on short study days.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void markModuleCheckIn(module.id)}
              className="px-3 py-2 rounded-xl text-white cursor-pointer"
              style={{ fontSize: "0.72rem", background: `linear-gradient(135deg, ${module.color}, #B352D7)` }}
            >
              Check in
            </button>
          </div>
        </div>

        {nextActions.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4" style={{ color: module.color }} />
              <h4>Next Actions</h4>
            </div>
            <div className="rounded-xl p-4 border border-[var(--border)] bg-[var(--accent)] space-y-2">
              {nextActions.map((action) => (
                <p key={action} className="text-muted-foreground" style={{ fontSize: "0.72rem", lineHeight: "1.45" }}>
                  - {action}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Study Plan Generator */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4" style={{ color: module.color }} />
            <h4>Study Plan</h4>
          </div>
          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              background: `linear-gradient(135deg, ${module.bgColor}, rgba(97,41,204,0.05))`,
              border: `1px solid ${module.borderColor}`,
            }}
          >
            <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
              How many minutes do you have to study?
            </p>

            <div className="flex gap-2">
              <input
                type="number"
                value={timeAvailable}
                onChange={(event) => {
                  setTimeAvailable(event.target.value);
                  setPlanGenerated(false);
                }}
                placeholder="e.g. 90"
                min="30"
                max="180"
                className="flex-1 bg-[var(--input-background)] rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                style={{ fontSize: "0.85rem" }}
              />
              <button
                type="button"
                onClick={generateStudyPlan}
                disabled={!timeAvailable || parseInt(timeAvailable, 10) < 30}
                className="px-4 py-2 rounded-xl text-white transition-all disabled:opacity-40 cursor-pointer"
                style={{ background: `linear-gradient(135deg, ${module.color}, #B352D7)`, fontSize: "0.8rem" }}
              >
                Generate
              </button>
            </div>

            {planGenerated && studyPlan.length > 0 && (
              <div className="space-y-2 mt-1">
                <p style={{ fontSize: "0.7rem", color: module.color }}>
                  Your {timeAvailable}-minute plan:
                </p>
                {(() => {
                  let studyBlockCount = 0;
                  return studyPlan.map((block) => {
                    if (block.status !== "break") studyBlockCount += 1;
                    const blockNumber = studyBlockCount;
                    return (
                      <div
                        key={block.id}
                        className="rounded-xl px-3 py-2.5"
                        style={{
                          backgroundColor: block.status === "break" ? "rgba(56,189,248,0.06)" : "rgba(255,255,255,0.04)",
                          border: block.status === "break" ? "1px solid rgba(56,189,248,0.2)" : "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span style={{ fontSize: "0.78rem", fontWeight: 500 }} className="text-foreground">
                            {block.status !== "break" ? `${blockNumber}. ${block.title}` : block.title}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <span
                              className="px-2 py-0.5 rounded-full"
                              style={{ fontSize: "0.6rem", backgroundColor: `${tagColor(block.status)}20`, color: tagColor(block.status) }}
                            >
                              {tagLabel(block.status)}
                            </span>
                            <span
                              className="px-2 py-0.5 rounded-full text-white"
                              style={{ fontSize: "0.65rem", backgroundColor: block.status === "break" ? "#38bdf8" : module.color }}
                            >
                              {block.minutes} mins
                            </span>
                          </div>
                        </div>
                        <p className="text-muted-foreground" style={{ fontSize: "0.68rem", lineHeight: "1.5" }}>
                          {block.description}
                        </p>
                      </div>
                    );
                  });
                })()}

                <p className="text-muted-foreground text-center pt-1" style={{ fontSize: "0.65rem" }}>
                  Total: {studyPlan.reduce((sum, item) => sum + item.minutes, 0)} mins
                </p>
              </div>
            )}
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

        {mistakeHistory.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4" style={{ color: "#ef4444" }} />
              <h4>Mistake Review History</h4>
            </div>
            <div className="space-y-2">
              {mistakeHistory.slice(0, 5).map((mistake) => (
                <div key={mistake.id} className="rounded-xl px-3 py-3" style={{ backgroundColor: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)" }}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-foreground" style={{ fontSize: "0.75rem" }}>{mistake.subtopicName}</span>
                    <span style={{ fontSize: "0.62rem", color: mistake.severity === "high" ? "#ef4444" : "#f59e0b" }}>{mistake.severity}</span>
                  </div>
                  <p className="text-muted-foreground" style={{ fontSize: "0.68rem", lineHeight: "1.45" }}>{mistake.trigger}</p>
                  <p className="text-foreground mt-1" style={{ fontSize: "0.66rem", lineHeight: "1.45" }}>Next step: {mistake.nextStep}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(createModuleSummary(module)).catch(() => {})}
            className="w-full py-3 rounded-xl text-white transition-all cursor-pointer"
            style={{ background: `linear-gradient(135deg, ${module.color}, #B352D7)`, fontSize: "0.8rem" }}
          >
            Copy Teacher / Study Partner Summary
          </button>
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
