import { useNavigate } from "react-router";
import { getInactivityLabel, Module } from "../data/mock-data";
import { getDaysInactive, getWeakSpots } from "../data/metrics";
import {
  BookOpen, TrendingUp, ChevronRight, GraduationCap, Clock,
  AlertTriangle, Brain, Target, BarChart3, Plus, Trash2, LogOut, Flame,
} from "lucide-react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { AddModuleModal } from "./AddModuleModal";
import { DeleteModuleModal } from "./DeleteModuleModal";
import { useModules } from "./ModulesContext";
import { useAuth } from "./AuthContext";
import { useState } from "react";

export function Dashboard() {
  const navigate = useNavigate();
  const { modules, addModule, deleteModule } = useModules();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "analytics">("overview");
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Module | null>(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const totalMastery = modules.length > 0
    ? Math.round(modules.reduce((sum, m) => sum + m.overallMastery, 0) / modules.length)
    : 0;
  const totalCompleted = modules.reduce((sum, m) => sum + m.subtopics.filter((s) => s.completed).length, 0);
  const totalSubtopics = modules.reduce((sum, m) => sum + m.subtopics.length, 0);
  const totalStreak = modules.reduce((sum, m) => sum + m.streak, 0);

  const statusConfig: Record<string, { dot: string }> = {
    "on-track": { dot: "#10b981" },
    "needs-review": { dot: "#f59e0b" },
    inactive: { dot: "#ef4444" },
  };

  return (
    <div className="min-h-full bg-[var(--background)]">
      {/* Hero header */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(255,117,65,0.12) 0%, rgba(179,82,215,0.12) 40%, rgba(97,41,204,0.12) 100%)",
        }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #FF7541 0%, transparent 70%)" }} />
          <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full opacity-15" style={{ background: "radial-gradient(circle, #B352D7 0%, transparent 70%)" }} />
        </div>
        <div className="max-w-7xl mx-auto px-6 md:px-10 pt-8 pb-6 relative">
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
                  Let's keep the momentum going
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

          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: TrendingUp, label: "Overall Mastery", value: `${totalMastery}%`, color: "#FF7541" },
              { icon: BookOpen, label: "Concepts Done", value: `${totalCompleted}/${totalSubtopics}`, color: "#B352D7" },
              { icon: Brain, label: "Active Modules", value: `${modules.length}`, color: "#6129CC" },
              { icon: Flame, label: "Combined Streak", value: `${totalStreak} day${totalStreak === 1 ? "" : "s"}`, color: "#f59e0b" },
            ].map((stat) => (
              <div key={stat.label} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                  <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{stat.label}</span>
                </div>
                <p style={{ fontSize: "1.5rem" }} className="text-foreground">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab navigation + Add button */}
      <div className="max-w-7xl mx-auto px-6 md:px-10">
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
                  const sc = statusConfig[mod.status] || statusConfig["on-track"];

                  return (
                    <div
                      key={mod.id}
                      className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 relative overflow-hidden group"
                    >
                      {/* Gradient accent */}
                      <div className="absolute top-0 left-0 right-0 h-1 opacity-60" style={{ background: `linear-gradient(90deg, ${mod.color}, transparent)` }} />

                      <div className="flex items-start justify-between mb-1">
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
                            <h3 className="group-hover:text-primary transition-colors">{mod.name}</h3>
                            {mod.subtitle && (
                              <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{mod.subtitle}</p>
                            )}
                          </div>
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(mod); }}
                            className="w-8 h-8 rounded-lg hover:bg-red-500/10 flex items-center justify-center transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                            title="Delete module"
                          >
                            <Trash2 className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
                          </button>
                          <button
                            onClick={() => navigate(`/module/${mod.id}`)}
                            className="w-8 h-8 rounded-lg hover:bg-[var(--accent)] flex items-center justify-center transition-all cursor-pointer"
                          >
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                          </button>
                        </div>
                      </div>

                      {/* Tags */}
                      {mod.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3 ml-14">
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

                      {/* Status + mastery */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sc.dot }} />
                        <span className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{mod.statusLabel}</span>
                      </div>

                      {/* Mastery bar */}
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

                      {/* Stats row */}
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
                        <span className="flex items-center gap-1 text-muted-foreground" style={{ fontSize: "0.7rem" }}>
                          <Flame className="w-3 h-3" />
                          Streak {mod.streak}
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
    </div>
  );
}
