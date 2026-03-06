import { useNavigate } from "react-router";
import { getDaysInactive, getInactivityLabel, getWeakSpots, Module } from "../data/mock-data";
import {
  BookOpen, TrendingUp, ChevronRight, GraduationCap, Clock,
  AlertTriangle, Brain, Target, BarChart3, Plus, Trash2, LogOut,
} from "lucide-react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { AddModuleModal } from "./AddModuleModal";
import { DeleteModuleModal } from "./DeleteModuleModal";
import { useModules } from "./ModulesContext";
import { useAuth } from "./AuthContext";
import { useEffect, useState } from "react";

const makeStoryImage = (title: string, colorA: string, colorB: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 700'>
      <defs>
        <linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='${colorA}' stop-opacity='0.85'/>
          <stop offset='100%' stop-color='${colorB}' stop-opacity='0.95'/>
        </linearGradient>
      </defs>
      <rect width='1200' height='700' fill='url(#bg)'/>
      <circle cx='960' cy='140' r='240' fill='white' opacity='0.10'/>
      <circle cx='260' cy='640' r='320' fill='white' opacity='0.08'/>
      <path d='M0 520 C 180 440, 340 610, 520 520 C 700 430, 860 620, 1200 500 L1200 700 L0 700 Z' fill='white' opacity='0.16'/>
      <text x='72' y='120' font-family='Inter, Arial, sans-serif' font-size='58' font-weight='700' fill='white'>${title}</text>
      <text x='72' y='178' font-family='Inter, Arial, sans-serif' font-size='28' font-weight='400' fill='white' opacity='0.9'>Small sessions. Compounding mastery.</text>
    </svg>
  `)}`;

const heroImage = makeStoryImage("Build Depth Daily", "#FF7541", "#6129CC");

export function Dashboard() {
  const navigate = useNavigate();
  const { modules, addModule, deleteModule } = useModules();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "analytics">("overview");
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Module | null>(null);
  const [inactivityPromptModule, setInactivityPromptModule] = useState<Module | null>(null);
  const [inactivityPromptInitialized, setInactivityPromptInitialized] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const totalMastery = modules.length > 0
    ? Math.round(modules.reduce((sum, m) => sum + m.overallMastery, 0) / modules.length)
    : 0;
  const totalCompleted = modules.reduce((sum, m) => sum + m.subtopics.filter((s) => s.completed).length, 0);
  const totalSubtopics = modules.reduce((sum, m) => sum + m.subtopics.length, 0);
  const dueTodayItems = modules.flatMap((moduleItem) => moduleItem.dueToday || []);

  const statusConfig: Record<string, { dot: string }> = {
    "on-track": { dot: "#10b981" },
    "needs-review": { dot: "#f59e0b" },
    inactive: { dot: "#ef4444" },
  };

  useEffect(() => {
    if (inactivityPromptInitialized || modules.length === 0) return;

    const target = [...modules]
      .filter((moduleItem) => getDaysInactive(moduleItem.lastStudied) >= 5)
      .sort((left, right) => getDaysInactive(right.lastStudied) - getDaysInactive(left.lastStudied))[0];

    if (target) {
      setInactivityPromptModule(target);
    }

    setInactivityPromptInitialized(true);
  }, [modules, inactivityPromptInitialized]);

  const handleTakeQuizNow = () => {
    if (!inactivityPromptModule) return;
    navigate(`/module/${inactivityPromptModule.id}?action=quiz-recovery`);
    setInactivityPromptModule(null);
  };

  const handleComeBackLater = () => {
    setInactivityPromptModule(null);
  };

  const storyChapters = [
    {
      title: "Observe",
      description: "Scan your current trajectory and focus modules that need intention.",
      metric: `${modules.length} active modules`,
      image: makeStoryImage("Observe", "#FF7541", "#DE6AE4"),
    },
    {
      title: "Practice",
      description: "Move concepts into memory with short, consistent, contextual drills.",
      metric: `${totalCompleted}/${totalSubtopics || 0} concepts completed`,
      image: makeStoryImage("Practice", "#DE6AE4", "#6129CC"),
    },
    {
      title: "Reflect",
      description: "Use weak-spot signals to choose your next best action, every day.",
      metric: `${totalMastery}% current mastery`,
      image: makeStoryImage("Reflect", "#18275C", "#B352D7"),
    },
  ];

  return (
    <div className="min-h-full bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 md:py-10">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
            <div className="p-6 md:p-8 lg:p-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #FF7541, #B352D7)" }}
                  >
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1>Welcome back, {user?.username || "Learner"}</h1>
                    <p className="text-muted-foreground" style={{ fontSize: "0.875rem" }}>
                      Your learning narrative continues today
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ThemeSwitcher />
                  <button
                    onClick={handleLogout}
                    className="w-9 h-9 rounded-xl bg-[var(--accent)] hover:bg-[var(--muted)] flex items-center justify-center transition-all cursor-pointer"
                    title="Log out"
                  >
                    <LogOut className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              <p className="text-muted-foreground mb-6 max-w-xl" style={{ fontSize: "0.9rem", lineHeight: "1.6" }}>
                Think in chapters, not cramming: revisit weak spots, stack small wins, and let momentum do the heavy lifting.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: TrendingUp, label: "Overall Mastery", value: `${totalMastery}%`, color: "#FF7541" },
                  { icon: BookOpen, label: "Concepts Done", value: `${totalCompleted}/${totalSubtopics}`, color: "#B352D7" },
                  { icon: Brain, label: "Active Modules", value: `${modules.length}`, color: "#6129CC" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-[var(--background)] border border-[var(--border)] rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                      <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{stat.label}</span>
                    </div>
                    <p style={{ fontSize: "1.5rem" }} className="text-foreground">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative min-h-[260px] lg:min-h-full">
              <img src={heroImage} alt="Learning momentum story" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5">
                <div className="rounded-2xl bg-black/25 backdrop-blur-sm border border-white/20 p-4">
                  <p className="text-white" style={{ fontSize: "0.82rem", lineHeight: "1.5" }}>
                    "Discipline is design. Repeat what works, and the work compounds."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="mb-6">
          <h2 className="mb-1">Today&apos;s Story Arc</h2>
          <p className="text-muted-foreground" style={{ fontSize: "0.82rem" }}>
            A clean cycle to keep your learning cadence intentional.
          </p>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            {storyChapters.map((chapter) => (
              <div key={chapter.title} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
                <img src={chapter.image} alt={`${chapter.title} chapter illustration`} className="w-full h-24 object-cover" />
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3>{chapter.title}</h3>
                    <span className="text-muted-foreground" style={{ fontSize: "0.68rem" }}>{chapter.metric}</span>
                  </div>
                  <p className="text-muted-foreground" style={{ fontSize: "0.75rem", lineHeight: "1.5" }}>
                    {chapter.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-5">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3>Due Today Review Queue</h3>
                <p className="text-muted-foreground" style={{ fontSize: "0.72rem" }}>
                  Evidence-backed mastery only moves when reviews are completed.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-[var(--accent)] text-muted-foreground" style={{ fontSize: "0.7rem" }}>
                {dueTodayItems.length} due
              </span>
            </div>
            {dueTodayItems.length === 0 ? (
              <p className="text-muted-foreground" style={{ fontSize: "0.8rem", lineHeight: "1.5" }}>
                Nothing is due right now. Use this session to upload new material or strengthen a weak concept.
              </p>
            ) : (
              <div className="space-y-2.5">
                {dueTodayItems.slice(0, 4).map((item) => (
                  <button
                    key={`${item.moduleId}-${item.subtopicId}`}
                    onClick={() => navigate(`/module/${item.moduleId}`)}
                    className="w-full text-left rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 hover:border-[var(--muted-foreground)] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className="text-foreground" style={{ fontSize: "0.82rem" }}>{item.subtopicName}</span>
                      <span
                        className="px-2 py-0.5 rounded-full"
                        style={{
                          fontSize: "0.6rem",
                          backgroundColor: item.priority === "high" ? "rgba(239,68,68,0.12)" : item.priority === "medium" ? "rgba(245,158,11,0.12)" : "rgba(16,185,129,0.12)",
                          color: item.priority === "high" ? "#ef4444" : item.priority === "medium" ? "#f59e0b" : "#10b981",
                        }}
                      >
                        {item.priority}
                      </span>
                    </div>
                    <p className="text-muted-foreground" style={{ fontSize: "0.7rem", lineHeight: "1.45" }}>
                      {item.moduleName} · {item.reason}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4" style={{ color: "#DE6AE4" }} />
              <h3>Coach Notes</h3>
            </div>
            <div className="space-y-2.5">
              {modules.slice(0, 3).map((moduleItem) => (
                <div key={moduleItem.id} className="rounded-xl bg-[var(--background)] border border-[var(--border)] px-4 py-3">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="text-foreground" style={{ fontSize: "0.8rem" }}>{moduleItem.name}</span>
                    <span style={{ fontSize: "0.68rem", color: moduleItem.color }}>{moduleItem.overallMastery}%</span>
                  </div>
                  <p className="text-muted-foreground" style={{ fontSize: "0.68rem", lineHeight: "1.45" }}>
                    {(moduleItem.nextActions && moduleItem.nextActions[0]) || "Complete one diagnostic step to unlock next actions."}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 mb-6">
          <div className="flex gap-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-1.5 w-fit">
            {(["overview", "analytics"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-xl transition-all cursor-pointer capitalize ${
                  activeTab === tab ? "text-white" : "text-muted-foreground hover:text-foreground"
                }`}
                style={activeTab === tab ? { background: "linear-gradient(135deg, #FF7541, #B352D7)" } : {}}
              >
                <span style={{ fontSize: "0.85rem" }}>{tab}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white transition-all cursor-pointer hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #FF7541, #B352D7)", fontSize: "0.85rem" }}
          >
            <Plus className="w-4 h-4" />
            Add Module
          </button>
        </div>

        {/* === OVERVIEW TAB === */}
        {activeTab === "overview" && (
          <div className="pb-10">
            {modules.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-[var(--accent)]">
                  <BookOpen className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2">No modules yet</h3>
                <p className="text-muted-foreground mb-4" style={{ fontSize: "0.85rem" }}>
                  Add your first module to start tracking your progress
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-5 py-2.5 rounded-xl text-white cursor-pointer"
                  style={{ background: "linear-gradient(135deg, #FF7541, #B352D7)", fontSize: "0.85rem" }}
                >
                  Add Module
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {modules.map((mod) => {
                  const daysInactive = getDaysInactive(mod.lastStudied);
                  const completedCount = mod.subtopics.filter((s) => s.completed).length;
                  const weakSpots = getWeakSpots(mod.subtopics);
                  const sc = statusConfig[mod.status];

                  return (
                    <div
                      key={mod.id}
                      className="bg-[var(--card)] border border-[var(--border)] rounded-2xl relative overflow-hidden group"
                    >
                      <div className="relative h-28 overflow-hidden">
                        <img
                          src={makeStoryImage(mod.name, mod.color, "#18275C")}
                          alt={`${mod.name} visual banner`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/20 to-transparent" />
                        <div className="absolute inset-0 p-4 flex items-start justify-between">
                          <button
                            onClick={() => navigate(`/module/${mod.id}`)}
                            className="flex items-center gap-3 cursor-pointer text-left"
                          >
                            <div
                              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                              style={{ backgroundColor: mod.bgColor }}
                            >
                              <span style={{ fontSize: "1.25rem" }}>{mod.icon}</span>
                            </div>
                            <div>
                              <h3 className="text-white">{mod.name}</h3>
                              {mod.subtitle && (
                                <p className="text-white/80" style={{ fontSize: "0.7rem" }}>{mod.subtitle}</p>
                              )}
                            </div>
                          </button>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget(mod); }}
                              className="w-8 h-8 rounded-lg bg-black/20 hover:bg-red-500/20 flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                              title="Delete module"
                            >
                              <Trash2 className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
                            </button>
                            <button
                              onClick={() => navigate(`/module/${mod.id}`)}
                              className="w-8 h-8 rounded-lg bg-black/20 hover:bg-black/35 flex items-center justify-center transition-all cursor-pointer"
                            >
                              <ChevronRight className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="p-5">

                        {mod.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {mod.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded-md bg-[var(--accent)] text-muted-foreground"
                                style={{ fontSize: "0.6rem" }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sc.dot }} />
                          <span className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{mod.statusLabel}</span>
                        </div>

                        <div className="mb-3">
                          <div className="flex justify-between mb-1">
                            <span className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>Mastery</span>
                            <span style={{ fontSize: "0.7rem", color: mod.color }}>{mod.overallMastery}%</span>
                          </div>
                          <div className="w-full h-2 bg-[var(--accent)] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${mod.overallMastery}%`, background: `linear-gradient(90deg, ${mod.color}, ${mod.color}dd)` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          {mod.subtopics.length > 0 && (
                            <span className="flex items-center gap-1 text-muted-foreground" style={{ fontSize: "0.7rem" }}>
                              <BookOpen className="w-3 h-3" />
                              {completedCount}/{mod.subtopics.length}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-muted-foreground" style={{ fontSize: "0.7rem" }}>
                            <Clock className="w-3 h-3" />
                            {getInactivityLabel(daysInactive)}
                          </span>
                        </div>

                        {weakSpots.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-[var(--border)]">
                            <span style={{ fontSize: "0.7rem", color: "#f59e0b" }}>
                              Weak: {weakSpots.map((w) => w.name).join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* === ANALYTICS TAB === */}
        {activeTab === "analytics" && (
          <div className="space-y-6 pb-10">
            {modules.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground" style={{ fontSize: "0.85rem" }}>
                  Add modules to see analytics
                </p>
              </div>
            ) : (
              <>
                {/* Mastery per topic */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-5">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      <h3>Mastery per Topic</h3>
                    </div>
                    <div className="space-y-4">
                      {modules.map((mod) => (
                        <div key={mod.id}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span style={{ fontSize: "1rem" }}>{mod.icon}</span>
                              <span style={{ fontSize: "0.85rem" }} className="text-foreground">{mod.name}</span>
                            </div>
                            <span style={{ fontSize: "0.85rem", color: mod.color }}>{mod.overallMastery}%</span>
                          </div>
                          <div className="w-full h-3 bg-[var(--accent)] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${mod.overallMastery}%`, background: `linear-gradient(90deg, ${mod.color}, ${mod.color}bb)` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Error Type Breakdown */}
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-5">
                      <AlertTriangle className="w-4 h-4" style={{ color: "#FF7541" }} />
                      <h3>Error Breakdown</h3>
                    </div>
                    <div className="space-y-5">
                      {modules.filter((m) => m.errorBreakdown.length > 0).map((mod) => {
                        const totalErrors = mod.errorBreakdown.reduce((s, e) => s + e.count, 0);
                        return (
                          <div key={mod.id}>
                            <div className="flex items-center gap-2 mb-2">
                              <span style={{ fontSize: "0.9rem" }}>{mod.icon}</span>
                              <span style={{ fontSize: "0.8rem" }} className="text-foreground">{mod.name}</span>
                            </div>
                            <div className="flex h-3 rounded-full overflow-hidden mb-2">
                              {mod.errorBreakdown.map((err, i) => (
                                <div
                                  key={i}
                                  className="transition-all duration-500"
                                  style={{ width: `${(err.count / totalErrors) * 100}%`, backgroundColor: err.color }}
                                />
                              ))}
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                              {mod.errorBreakdown.map((err, i) => (
                                <span key={i} className="flex items-center gap-1" style={{ fontSize: "0.65rem" }}>
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: err.color }} />
                                  <span className="text-muted-foreground">{err.type} ({err.count})</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Estimated time to mastery */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-5">
                    <Target className="w-4 h-4" style={{ color: "#DE6AE4" }} />
                    <h3>Estimated Time to Mastery</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {modules.map((mod) => (
                      <div key={mod.id} className="text-center">
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-2"
                          style={{ backgroundColor: mod.bgColor }}
                        >
                          <span style={{ fontSize: "1.3rem" }}>{mod.icon}</span>
                        </div>
                        <p style={{ fontSize: "0.85rem" }} className="text-foreground">
                          {mod.estimatedTimeToMastery >= 60
                            ? `${Math.floor(mod.estimatedTimeToMastery / 60)}h ${mod.estimatedTimeToMastery % 60}m`
                            : `${mod.estimatedTimeToMastery}m`}
                        </p>
                        <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{mod.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <AddModuleModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addModule}
      />
      <DeleteModuleModal
        open={deleteTarget !== null}
        module={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteModule(deleteTarget.id); setDeleteTarget(null); }}
      />

      {inactivityPromptModule && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <h3 className="mb-2">Inactivity Reminder</h3>
            <p className="text-muted-foreground mb-4" style={{ fontSize: "0.85rem", lineHeight: "1.45" }}>
              You have not studied <span className="text-foreground">{inactivityPromptModule.name}</span> for {getDaysInactive(inactivityPromptModule.lastStudied)} days.
              Do you want to take a quick recovery quiz now, or move on and come back later?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleComeBackLater}
                className="px-3 py-2 rounded-xl bg-[var(--accent)] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                style={{ fontSize: "0.8rem" }}
              >
                Come back later
              </button>
              <button
                type="button"
                onClick={handleTakeQuizNow}
                className="px-3 py-2 rounded-xl text-white cursor-pointer"
                style={{ fontSize: "0.8rem", background: "linear-gradient(135deg, #FF7541, #B352D7)" }}
              >
                Take quiz now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}