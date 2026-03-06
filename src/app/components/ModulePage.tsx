import { useParams, useNavigate, useLocation } from "react-router";
import { ChatPanel } from "./ChatPanel";
import { MetricsPanel } from "./MetricsPanel";
import { ArrowLeft, GraduationCap, PanelRightOpen, PanelRightClose } from "lucide-react";
import { useState } from "react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useModules } from "./ModulesContext";
import { motion } from "motion/react";
import { getWeakSpots } from "../data/mock-data";

export function ModulePage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { modules } = useModules();
  const [showMetrics, setShowMetrics] = useState(true);
  const shouldStartRecoveryQuiz = new URLSearchParams(location.search).get("action") === "quiz-recovery";

  const module = modules.find((m) => m.id === moduleId);

  if (!module) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <h2 className="mb-2">Module not found</h2>
          <button onClick={() => navigate("/")} className="text-primary underline cursor-pointer">
            Go back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const fromDashboard = Boolean(location.state && typeof location.state === "object" && "fromDashboard" in location.state);
  const dueCount = module.dueToday?.length || 0;
  const weakSpotCount = getWeakSpots(module.subtopics).length;
  const nextPlanBlock = (module.weeklyPlan || []).find((block) => !block.isCompleted);

  return (
    <motion.div
      className="relative flex h-screen max-h-screen flex-col overflow-hidden"
      style={{ backgroundImage: "var(--page-background)" }}
      initial={fromDashboard ? { opacity: 0, y: 26, scale: 0.985 } : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full opacity-16" style={{ background: "radial-gradient(circle, var(--texture-glow-a) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full opacity-12" style={{ background: "radial-gradient(circle, var(--texture-glow-b) 0%, transparent 70%)" }} />
        <div className="absolute inset-0 opacity-24" style={{ backgroundImage: "linear-gradient(to right, var(--texture-grid) 1px, transparent 1px), linear-gradient(to bottom, var(--texture-grid) 1px, transparent 1px)", backgroundSize: "96px 96px" }} />
      </div>

      <div className="relative z-10 shrink-0 border-b border-white/8 bg-black/8 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 md:px-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/6 transition-colors hover:bg-white/10 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </button>
            <div className="hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-foreground backdrop-blur-sm sm:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white">
                <GraduationCap className="h-4 w-4" />
              </div>
              <div>
                <p style={{ fontSize: "0.72rem", letterSpacing: "0.18em", textTransform: "uppercase" }}>Gradify</p>
                <p className="text-muted-foreground" style={{ fontSize: "0.78rem" }}>Module workspace</p>
              </div>
            </div>
              <div>
                <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl shadow-[0_14px_35px_rgba(0,0,0,0.12)]"
                  style={{ backgroundColor: module.bgColor }}
                >
                  <span style={{ fontSize: "1rem" }}>{module.icon}</span>
                </div>
                <div>
                  <h3 className="text-foreground">{module.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: module.color }} />
                    <span className="text-muted-foreground" style={{ fontSize: "0.72rem" }}>{module.statusLabel}</span>
                    <span className="text-muted-foreground/70" style={{ fontSize: "0.72rem" }}>Mastery {module.overallMastery}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <button
              onClick={() => setShowMetrics(!showMetrics)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/6 transition-colors hover:bg-white/10 cursor-pointer"
            >
              {showMetrics ? (
                <PanelRightClose className="w-4 h-4 text-muted-foreground" />
              ) : (
                <PanelRightOpen className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>

          <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-[1.1fr_0.9fr_0.95fr]">
            <div className="rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-3 backdrop-blur-sm">
              <p className="text-muted-foreground" style={{ fontSize: "0.64rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>Workspace</p>
              <p className="mt-1 text-foreground" style={{ fontSize: "0.88rem", lineHeight: "1.55" }}>
                Chat stays primary, with metrics available beside it instead of competing with it.
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-3 backdrop-blur-sm">
              <p className="text-muted-foreground" style={{ fontSize: "0.64rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>Attention</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-foreground" style={{ fontSize: "0.82rem" }}>
                <span>{dueCount} due</span>
                <span className="text-muted-foreground">/</span>
                <span>{weakSpotCount} weak spots</span>
              </div>
            </div>
            <div className="rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-3 backdrop-blur-sm">
              <p className="text-muted-foreground" style={{ fontSize: "0.64rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>Next block</p>
              <p className="mt-1 text-foreground" style={{ fontSize: "0.82rem", lineHeight: "1.55" }}>
                {nextPlanBlock ? `${nextPlanBlock.title} · ${nextPlanBlock.minutes} mins` : "No pending weekly plan block. Use the chat or plan panel to set one up."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 overflow-hidden px-4 pb-4 pt-4 md:px-5 md:pb-5">
        <div className={`grid min-h-0 w-full gap-4 ${showMetrics ? "xl:grid-cols-[minmax(0,1.58fr)_360px]" : "grid-cols-1"}`}>
          <motion.div
            className="min-h-0 overflow-hidden rounded-[1.9rem] border border-white/10 bg-black/8 shadow-[0_22px_64px_rgba(0,0,0,0.16)] backdrop-blur-xl"
            initial={fromDashboard ? { opacity: 0, x: -18 } : false}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <ChatPanel module={module} startRecoveryQuiz={shouldStartRecoveryQuiz} />
          </motion.div>

          {showMetrics && (
            <>
              <motion.div
                className="hidden min-h-0 overflow-hidden rounded-[1.9rem] border border-white/10 bg-black/8 shadow-[0_22px_64px_rgba(0,0,0,0.16)] backdrop-blur-xl xl:block"
                initial={fromDashboard ? { opacity: 0, x: 18 } : false}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.14, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <MetricsPanel module={module} />
              </motion.div>
              <div className="absolute inset-0 z-10 rounded-[1.9rem] border border-white/10 bg-[var(--card)] shadow-[0_22px_64px_rgba(0,0,0,0.16)] xl:hidden">
                <MetricsPanel module={module} />
              </div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
