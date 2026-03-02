import React, { useState } from "react";
import { Module, getDaysInactive, getInactivityLabel, getWeakSpots } from "../data/mock-data";
import {
  Clock, Target, AlertTriangle, CheckCircle2, Circle, BookOpen, Lightbulb, ClipboardList,
} from "lucide-react";

interface MetricsPanelProps {
  module: Module;
}

interface StudyBlock {
  activity: string;
  minutes: number;
  description: string;
  tag: "weak" | "developing" | "strong" | "break";
}

export function MetricsPanel({ module }: MetricsPanelProps) {
  const daysInactive = getDaysInactive(module.lastStudied);
  const weakSpots = getWeakSpots(module.subtopics);
  const completedCount = module.subtopics.filter((s) => s.completed).length;
  const [timeAvailable, setTimeAvailable] = useState("");
  const [studyPlan, setStudyPlan] = useState<StudyBlock[]>([]);
  const [planGenerated, setPlanGenerated] = useState(false);

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

  const tagColor = (tag: string) => {
    if (tag === "weak") return "#ef4444";
    if (tag === "developing") return "#f59e0b";
    if (tag === "break") return "#38bdf8";
    return "#10b981";
  };

  const tagLabel = (tag: string) => {
    if (tag === "weak") return "Needs work";
    if (tag === "developing") return "Developing";
    if (tag === "break") return "Break";
    return "Strong";
  };

  const generateStudyPlan = () => {
    const minutes = parseInt(timeAvailable);
    if (!minutes || minutes < 5) return;

    const sensorProfile = [
      {
        name: "Ultrasonic Sensor",
        tag: "weak" as const,
        insight: "You've made 11 mistakes here — mostly on distance calculation formulas. This needs the most attention. We will review the core concepts and work through the tricky parts step by step.",
        weight: 0.35,
      },
      {
        name: "IR Sensor & Temperature Sensor",
        tag: "developing" as const,
        insight: "You have a solid grasp on both IR and Temperature sensors. Spend only about 10 minutes here to recap the key points and make sure nothing slips.",
        weight: 0.20,
      },
      {
          name: "Quiz — Complementary & Kalman Filters",
          tag: "weak" as const,
          insight: "We noticed you scored lower on filter concepts — your mastery for Kalman Filter is at 38% and you got 9 questions wrong in your last session on this. This quiz will target exactly those gaps. No notes allowed.",
          weight: 0.25,
      },
      {
        name: "Quiz Recap & Clarification",
        tag: "developing" as const,
        insight: "Go through your quiz answers and clarify anything you got wrong. Reinforce the correct understanding before your next session.",
        weight: 0.20,
      },
    ];

    const totalWeight = sensorProfile.reduce((s, p) => s + p.weight, 0);

    const rawPlan: StudyBlock[] = sensorProfile.map((sensor) => ({
      activity: sensor.name,
      minutes: Math.max(5, Math.round((sensor.weight / totalWeight) * minutes)),
      description: sensor.insight,
      tag: sensor.tag,
    }));

    const totalAllocated = rawPlan.reduce((s, b) => s + b.minutes, 0);
    const diff = minutes - totalAllocated;
    if (rawPlan.length > 0) rawPlan[0].minutes += diff;

    // Insert 10 min break after every 2 blocks
    const finalPlan: StudyBlock[] = [];
    for (let i = 0; i < rawPlan.length; i++) {
      finalPlan.push(rawPlan[i]);
      if ((i + 1) % 2 === 0 && i !== rawPlan.length - 1) {
        finalPlan.push({
          activity: "Break",
          minutes: 10,
          description: "Step away from your screen, stretch, grab some water. Your brain needs this to consolidate what you just studied.",
          tag: "break",
        });
      }
    }

    setStudyPlan(finalPlan);
    setPlanGenerated(true);
  };

  // Track study block number separately (excluding breaks)
  let studyBlockCount = 0;

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
                onChange={(e) => { setTimeAvailable(e.target.value); setPlanGenerated(false); }}
                placeholder="e.g. 30"
                min="5"
                className="flex-1 bg-[var(--input-background)] rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                style={{ fontSize: "0.85rem" }}
              />
              <button
                onClick={generateStudyPlan}
                disabled={!timeAvailable || parseInt(timeAvailable) < 5}
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
                {studyPlan.map((block, i) => {
                  if (block.tag !== "break") studyBlockCount++;
                  const blockNum = studyBlockCount;
                  return (
                    <div
                      key={i}
                      className="rounded-xl px-3 py-2.5"
                      style={{
                        backgroundColor: block.tag === "break" ? "rgba(56,189,248,0.06)" : "rgba(255,255,255,0.04)",
                        border: block.tag === "break" ? "1px solid rgba(56,189,248,0.2)" : "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span style={{ fontSize: "0.78rem", fontWeight: 500 }} className="text-foreground">
                          {block.tag !== "break" ? `${blockNum}. ${block.activity}` : block.activity}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span
                            className="px-2 py-0.5 rounded-full"
                            style={{ fontSize: "0.6rem", backgroundColor: `${tagColor(block.tag)}20`, color: tagColor(block.tag) }}
                          >
                            {tagLabel(block.tag)}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded-full text-white"
                            style={{ fontSize: "0.65rem", backgroundColor: block.tag === "break" ? "#38bdf8" : module.color }}
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
                })}
                <p className="text-muted-foreground text-center pt-1" style={{ fontSize: "0.65rem" }}>
                  Total: {studyPlan.reduce((s, b) => s + b.minutes, 0)} mins
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