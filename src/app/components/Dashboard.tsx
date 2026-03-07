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
import { motion } from "motion/react";

const makeStoryImage = (colorA: string, colorB: string, accent: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 700'>
      <defs>
        <linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='${colorA}' stop-opacity='0.94'/>
          <stop offset='100%' stop-color='${colorB}' stop-opacity='0.98'/>
        </linearGradient>
        <linearGradient id='wave' x1='0' y1='0' x2='1' y2='0'>
          <stop offset='0%' stop-color='white' stop-opacity='0.08'/>
          <stop offset='100%' stop-color='${accent}' stop-opacity='0.26'/>
        </linearGradient>
      </defs>
      <rect width='1200' height='700' fill='url(#bg)'/>
      <circle cx='930' cy='140' r='250' fill='white' opacity='0.09'/>
      <circle cx='220' cy='610' r='300' fill='white' opacity='0.05'/>
      <path d='M0 512 C 160 430, 318 612, 518 518 C 720 420, 882 620, 1200 506 L1200 700 L0 700 Z' fill='white' opacity='0.12'/>
      <path d='M90 188 C 246 126, 348 302, 516 254 C 700 204, 792 110, 1034 160' stroke='url(#wave)' stroke-width='14' fill='none' stroke-linecap='round'/>
      <path d='M182 300 C 368 248, 422 418, 620 392 C 824 366, 898 246, 1100 290' stroke='white' stroke-opacity='0.16' stroke-width='8' fill='none' stroke-linecap='round'/>
      <g opacity='0.18'>
        <rect x='92' y='120' width='148' height='6' rx='3' fill='white'/>
        <rect x='92' y='142' width='104' height='6' rx='3' fill='white'/>
        <rect x='92' y='164' width='184' height='6' rx='3' fill='white'/>
      </g>
    </svg>
  `)}`;

const heroImage = makeStoryImage("#25134f", "#070d1b", "#ff7541");

const averageNumber = (values: number[]) => (values.length > 0 ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0);

export function Dashboard() {
  const navigate = useNavigate();
  const { modules, addModule, deleteModule, recordCoachNudge } = useModules();
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

  const openModule = (moduleId: string, action?: string) => {
    const params = action ? `?action=${action}` : "";
    navigate(`/module/${moduleId}${params}`, { state: { fromDashboard: true } });
  };

  const totalMastery = modules.length > 0
    ? Math.round(modules.reduce((sum, m) => sum + m.overallMastery, 0) / modules.length)
    : 0;
  const totalCompleted = modules.reduce((sum, m) => sum + m.subtopics.filter((s) => s.completed).length, 0);
  const totalSubtopics = modules.reduce((sum, m) => sum + m.subtopics.length, 0);
  const dueTodayItems = modules.flatMap((moduleItem) => moduleItem.dueToday || []);
  const focusModule = dueTodayItems.length > 0
    ? modules.find((moduleItem) => moduleItem.id === dueTodayItems[0].moduleId)
    : [...modules].sort((left, right) => right.overallMastery - left.overallMastery)[0];
  const weakestModule = [...modules]
    .map((moduleItem) => ({ moduleItem, weakCount: getWeakSpots(moduleItem.subtopics).length }))
    .sort((left, right) => right.weakCount - left.weakCount || left.moduleItem.overallMastery - right.moduleItem.overallMastery)[0]?.moduleItem;
  const completedPlanBlocks = modules.reduce(
    (sum, moduleItem) => sum + (moduleItem.weeklyPlan || []).filter((block) => block.isCompleted).length,
    0,
  );
  const aggregateSignals = {
    retrieval: averageNumber(modules.map((moduleItem) => moduleItem.masteryBreakdown?.retrieval ?? moduleItem.overallMastery)),
    recency: averageNumber(modules.map((moduleItem) => moduleItem.masteryBreakdown?.recency ?? Math.max(24, 100 - getDaysInactive(moduleItem.lastStudied) * 12))),
    consistency: averageNumber(modules.map((moduleItem) => moduleItem.masteryBreakdown?.consistency ?? Math.max(35, moduleItem.overallMastery))),
    stability: averageNumber(modules.map((moduleItem) => moduleItem.masteryBreakdown?.stability ?? Math.max(28, 100 - getDaysInactive(moduleItem.lastStudied) * 10))),
  };
  const focusSignals = [
    {
      label: "Retrieval",
      value: focusModule?.masteryBreakdown?.retrieval ?? aggregateSignals.retrieval,
      color: "#FF7541",
      note: "Can you pull it back without notes?",
    },
    {
      label: "Recency",
      value: focusModule?.masteryBreakdown?.recency ?? aggregateSignals.recency,
      color: "#38bdf8",
      note: "How fresh is the latest evidence?",
    },
    {
      label: "Consistency",
      value: focusModule?.masteryBreakdown?.consistency ?? aggregateSignals.consistency,
      color: "#10b981",
      note: "How often do mistakes repeat?",
    },
    {
      label: "Stability",
      value: focusModule?.masteryBreakdown?.stability ?? aggregateSignals.stability,
      color: "#DE6AE4",
      note: "Does learning hold across sessions?",
    },
  ];
  const averageUrgency = averageNumber(
    dueTodayItems.map((item) => item.urgencyScore ?? (item.priority === "high" ? 84 : item.priority === "medium" ? 60 : 36)),
  );

  const statusConfig: Record<string, { dot: string }> = {
    "on-track": { dot: "#10b981" },
    "needs-review": { dot: "#f59e0b" },
    inactive: { dot: "#ef4444" },
  };

  useEffect(() => {
    if (inactivityPromptInitialized || modules.length === 0) return;

    const now = Date.now();

    const target = [...modules]
      .filter((moduleItem) => {
        if (getDaysInactive(moduleItem.lastStudied) < 5) return false;
        const lastNudgeAt = moduleItem.accountability?.lastNudgeAt;
        if (!lastNudgeAt) return true;
        return now - new Date(lastNudgeAt).getTime() >= 18 * 60 * 60 * 1000;
      })
      .sort((left, right) => getDaysInactive(right.lastStudied) - getDaysInactive(left.lastStudied))[0];

    if (target) {
      setInactivityPromptModule(target);
      void recordCoachNudge(target.id);
    }

    setInactivityPromptInitialized(true);
  }, [modules, inactivityPromptInitialized, recordCoachNudge]);

  const handleTakeQuizNow = () => {
    if (!inactivityPromptModule) return;
    openModule(inactivityPromptModule.id, "quiz-recovery");
    setInactivityPromptModule(null);
  };

  const handleComeBackLater = () => {
    setInactivityPromptModule(null);
  };

  return (
    <div className="min-h-full" style={{ backgroundImage: "var(--page-background)" }}>
      <section className="relative overflow-hidden border-b border-white/8">
        <motion.img
          src={heroImage}
          alt="Gradify study atmosphere"
          className="absolute inset-0 h-full w-full object-cover opacity-45"
          initial={{ scale: 1.06, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(120deg, rgba(8,12,26,0.92) 0%, rgba(8,12,26,0.76) 44%, rgba(8,12,26,0.48) 100%)" }} />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: "linear-gradient(to right, var(--texture-grid) 1px, transparent 1px), linear-gradient(to bottom, var(--texture-grid) 1px, transparent 1px)",
            backgroundSize: "120px 120px",
            maskImage: "linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,0,0,0.3))",
          }}
        />
        <div className="relative z-10 flex flex-col">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 pt-6 md:px-10">
            <div className="flex items-center gap-3 text-white">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/8 backdrop-blur-sm shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-white/70" style={{ fontSize: "0.72rem", letterSpacing: "0.2em", textTransform: "uppercase" }}>
                  Gradify
                </p>
                <p className="text-white/92" style={{ fontSize: "0.86rem" }}>
                  {user?.username ? `${user.username}'s evidence-backed dashboard` : "Evidence-backed study coach"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeSwitcher />
              <button
                onClick={handleLogout}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/6 text-white/78 backdrop-blur-sm transition-all hover:bg-white/10 cursor-pointer"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-7xl flex-1 items-center px-6 pb-12 pt-10 md:px-10 md:pb-16">
            <motion.div
              className="grid w-full gap-6 lg:grid-cols-[1.15fr_0.85fr]"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="rounded-[2rem] border border-white/12 bg-white/6 p-6 text-white shadow-[0_24px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl md:p-8">
                <div className="mb-3 text-white/72" style={{ fontSize: "0.76rem", letterSpacing: "0.18em", textTransform: "uppercase" }}>
                  Today
                </div>
                <h1 className="max-w-2xl text-white" style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", lineHeight: "1.04", fontWeight: 700 }}>
                  {user?.username ? `Welcome back, ${user.username}.` : "Welcome back."}
                </h1>
                <p className="mt-3 max-w-2xl text-white/74" style={{ fontSize: "0.98rem", lineHeight: "1.75" }}>
                  {dueTodayItems.length > 0
                    ? `${dueTodayItems.length} reviews are waiting. Start with ${dueTodayItems[0].subtopicName} or jump into your focus module.`
                    : "Nothing urgent is due right now. Use this session to push a weak area forward or add a new module."}
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      label: "Due now",
                      display: `${dueTodayItems.length}`,
                      pct: totalSubtopics > 0 ? Math.min((dueTodayItems.length / totalSubtopics) * 100, 100) : 0,
                      color: "#FF7541",
                    },
                    {
                      label: "Overall mastery",
                      display: `${totalMastery}%`,
                      pct: totalMastery,
                      color: "#10b981",
                    },
                    {
                      label: "Modules",
                      display: `${modules.length}`,
                      pct: totalSubtopics > 0 ? (totalCompleted / totalSubtopics) * 100 : 0,
                      color: "#B352D7",
                      sub: `${totalCompleted}/${totalSubtopics} covered`,
                    },
                  ].map((item) => {
                    const r = 28;
                    const circ = 2 * Math.PI * r;
                    return (
                      <div key={item.label} className="rounded-2xl border border-white/10 bg-black/16 px-4 py-4 flex items-center gap-4">
                        <svg viewBox="0 0 72 72" className="w-16 h-16 shrink-0" style={{ transform: "rotate(-90deg)" }}>
                          <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
                          <circle
                            cx="36" cy="36" r={r} fill="none"
                            stroke={item.color} strokeWidth="5" strokeLinecap="round"
                            strokeDasharray={`${(item.pct / 100) * circ} ${circ}`}
                            style={{ transition: "stroke-dasharray 0.8s ease" }}
                          />
                        </svg>
                        <div>
                          <p className="text-white/58" style={{ fontSize: "0.66rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                            {item.label}
                          </p>
                          <p className="mt-1 text-white" style={{ fontSize: "1.7rem", lineHeight: "1.1" }}>{item.display}</p>
                          {item.sub && (
                            <p className="mt-0.5 text-white/50" style={{ fontSize: "0.6rem" }}>{item.sub}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <motion.div
                  className="mt-8 flex flex-wrap gap-3"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                  <button
                    onClick={() => focusModule ? openModule(focusModule.id) : setShowAddModal(true)}
                    className="rounded-2xl px-5 py-3 text-white cursor-pointer"
                    style={{ background: "linear-gradient(135deg, #FF7541, #DE6AE4)", fontSize: "0.9rem" }}
                  >
                    {focusModule
                      ? dueTodayItems.length > 0
                        ? `Review ${dueTodayItems[0].subtopicName}`
                        : `Resume ${focusModule.name}`
                      : "Add your first module"}
                  </button>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="rounded-2xl border border-white/14 bg-white/6 px-5 py-3 text-white/90 backdrop-blur-sm transition-all hover:bg-white/10 cursor-pointer"
                    style={{ fontSize: "0.9rem" }}
                  >
                    Add module
                  </button>
                </motion.div>
              </div>

              <motion.div
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="rounded-[1.8rem] border border-white/10 bg-black/20 p-5 text-white backdrop-blur-xl">
                  <p className="text-white/66" style={{ fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                    Focus module
                  </p>
                  <div className="mt-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-white">{focusModule?.name || "No module yet"}</h3>
                      <p className="mt-1 text-white/72" style={{ fontSize: "0.78rem", lineHeight: "1.6" }}>
                        {dueTodayItems.length > 0
                          ? `Top due review: ${dueTodayItems[0].subtopicName}`
                          : focusModule
                            ? (focusModule.nextActions?.[0] || "Keep building a review rhythm with one clear next action.")
                            : "Add a module to unlock your review queue and learning analytics."}
                      </p>
                    </div>
                    {focusModule && (
                      <button
                        onClick={() => openModule(focusModule.id)}
                        className="rounded-xl border border-white/12 bg-white/8 px-3 py-2 text-white/90 transition-colors hover:bg-white/12 cursor-pointer"
                        style={{ fontSize: "0.72rem" }}
                      >
                        Open
                      </button>
                    )}
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/8 bg-white/6 px-4 py-3">
                      <p className="text-white/56" style={{ fontSize: "0.64rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>Signal mix</p>
                      <div className="mt-3 flex items-end gap-2">
                        {focusSignals.map((signal) => (
                          <div key={signal.label} className="flex-1">
                            <div className="mx-auto flex h-20 w-7 items-end overflow-hidden rounded-full bg-white/8">
                              <div className="w-full rounded-full" style={{ height: `${signal.value}%`, background: `linear-gradient(180deg, ${signal.color}, ${signal.color}aa)` }} />
                            </div>
                            <p className="mt-2 text-center text-white/64" style={{ fontSize: "0.58rem" }}>{signal.label.slice(0, 4)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/6 px-4 py-3">
                      <p className="text-white/56" style={{ fontSize: "0.64rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>Intervention board</p>
                      <div className="mt-3 space-y-3">
                        <div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-white/82" style={{ fontSize: "0.72rem" }}>Queue pressure</span>
                            <span className="text-white" style={{ fontSize: "0.76rem" }}>{averageUrgency}%</span>
                          </div>
                          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/8">
                            <div className="h-full rounded-full" style={{ width: `${averageUrgency}%`, background: "linear-gradient(90deg, #FF7541, #DE6AE4)" }} />
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/8 bg-black/18 px-3 py-3">
                          <p className="text-white/60" style={{ fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>Weak spots</p>
                          <p className="mt-1 text-white" style={{ fontSize: "1.15rem", lineHeight: "1.1" }}>{weakestModule ? getWeakSpots(weakestModule.subtopics).length : 0}</p>
                          <p className="mt-1 text-white/70" style={{ fontSize: "0.66rem", lineHeight: "1.45" }}>
                            {weakestModule ? `${weakestModule.name} needs the most attention right now.` : "Add a module to start tracking weak areas."}
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/8 bg-black/18 px-3 py-3">
                          <p className="text-white/60" style={{ fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>Plan blocks completed</p>
                          <p className="mt-1 text-white" style={{ fontSize: "1.15rem", lineHeight: "1.1" }}>{completedPlanBlocks}</p>
                          <p className="mt-1 text-white/70" style={{ fontSize: "0.66rem", lineHeight: "1.45" }}>
                            Weekly plan completion is now persistent across refreshes.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-16 space-y-14">
        <motion.section
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="mb-2">Learning Pulse</h2>
          <p className="max-w-2xl text-muted-foreground" style={{ fontSize: "0.86rem", lineHeight: "1.6" }}>
            A single read on where your study system stands today: momentum, completion, and whether your plan is being executed.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-4 border-y border-white/8 py-5 md:grid-cols-4">
            {[
              { icon: TrendingUp, label: "Overall mastery", value: `${totalMastery}%`, color: "#FF7541" },
              { icon: BookOpen, label: "Concept coverage", value: `${totalCompleted}/${totalSubtopics || 0}`, color: "#B352D7" },
              { icon: Brain, label: "Active modules", value: `${modules.length}`, color: "#38bdf8" },
              { icon: Target, label: "Plan blocks done", value: `${completedPlanBlocks}`, color: "#10b981" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-start gap-3 md:border-l md:border-white/8 md:pl-5 first:border-l-0 first:pl-0">
                <stat.icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: stat.color }} />
                <div>
                  <p className="text-muted-foreground" style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.14em" }}>{stat.label}</p>
                  <p className="mt-1 text-foreground" style={{ fontSize: "1.8rem", lineHeight: "1.05" }}>{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          className="grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_0.85fr]"
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3>Intervention Board</h3>
                <p className="text-muted-foreground" style={{ fontSize: "0.72rem" }}>
                  Retrieval science works best when the system reacts to urgency, stability, and weak-signal drift.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-[var(--accent)] text-muted-foreground" style={{ fontSize: "0.7rem" }}>
                {averageUrgency}% avg urgency
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {focusSignals.map((signal) => (
                <div key={signal.label} className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-foreground" style={{ fontSize: "0.8rem" }}>{signal.label}</span>
                    <span style={{ fontSize: "0.74rem", color: signal.color }}>{signal.value}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--accent)]">
                    <div className="h-full rounded-full" style={{ width: `${signal.value}%`, background: `linear-gradient(90deg, ${signal.color}, ${signal.color}bb)` }} />
                  </div>
                  <p className="mt-2 text-muted-foreground" style={{ fontSize: "0.68rem", lineHeight: "1.45" }}>{signal.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4" style={{ color: "#DE6AE4" }} />
              <h3>Coach Notes</h3>
            </div>
            <div className="space-y-2.5">
              {[weakestModule, ...modules.filter((moduleItem) => moduleItem.id !== weakestModule?.id)].filter(Boolean).slice(0, 3).map((moduleItem) => (
                <div key={moduleItem.id} className="rounded-xl bg-[var(--background)] border border-[var(--border)] px-4 py-3">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="text-foreground" style={{ fontSize: "0.8rem" }}>{moduleItem.name}</span>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: "0.68rem", color: moduleItem.color }}>{moduleItem.overallMastery}%</span>
                      {moduleItem.lastCheckInAt && (
                        <span className="px-2 py-0.5 rounded-lg bg-[var(--accent)] text-muted-foreground" style={{ fontSize: "0.6rem" }}>
                          Checked in
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-muted-foreground" style={{ fontSize: "0.68rem", lineHeight: "1.45" }}>
                    {(moduleItem.nextActions && moduleItem.nextActions[0]) || "Complete one diagnostic step to unlock next actions."}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <div className="flex items-center justify-between mt-2 mb-1">
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
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white transition-all cursor-pointer hover:opacity-90"
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
                    <motion.div
                      key={mod.id}
                      className="bg-[var(--card)] border border-[var(--border)] rounded-2xl relative overflow-hidden group shadow-[0_18px_45px_rgba(0,0,0,0.08)]"
                      initial={{ opacity: 0, y: 22 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="relative h-28 overflow-hidden">
                        <img
                          src={makeStoryImage(mod.color, "#18275C", "#DE6AE4")}
                          alt={`${mod.name} visual banner`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/20 to-transparent" />
                        <div className="absolute inset-0 p-4 flex items-start justify-between">
                          <button
                            onClick={() => openModule(mod.id)}
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
                              onClick={() => openModule(mod.id)}
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
                    </motion.div>
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
                  <motion.div
                    className="bg-[var(--card)] border border-[var(--border)] rounded-[1.8rem] p-5 overflow-hidden relative"
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="absolute inset-0 opacity-70 pointer-events-none" style={{ background: "radial-gradient(circle at top right, var(--texture-glow-a) 0%, transparent 44%)" }} />
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
                  </motion.div>

                  <motion.div
                    className="bg-[var(--card)] border border-[var(--border)] rounded-[1.8rem] p-5 overflow-hidden relative"
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{ delay: 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="absolute inset-0 opacity-60 pointer-events-none" style={{ background: "radial-gradient(circle at bottom left, var(--texture-glow-b) 0%, transparent 48%)" }} />
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
                  </motion.div>
                </div>

                <motion.div
                  className="bg-[var(--card)] border border-[var(--border)] rounded-[1.8rem] p-5 overflow-hidden relative"
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, var(--texture-grid) 1px, transparent 1px), linear-gradient(to bottom, var(--texture-grid) 1px, transparent 1px)", backgroundSize: "72px 72px" }} />
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
                </motion.div>
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