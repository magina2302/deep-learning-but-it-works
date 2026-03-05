import { useParams, useNavigate, useLocation } from "react-router";
import { ChatPanel } from "./ChatPanel";
import { MetricsPanel } from "./MetricsPanel";
import { ArrowLeft, PanelRightOpen, PanelRightClose } from "lucide-react";
import { useState } from "react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useModules } from "./ModulesContext";

const makeModuleStoryImage = (title: string, colorA: string, colorB: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 340'>
      <defs>
        <linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='${colorA}'/>
          <stop offset='100%' stop-color='${colorB}'/>
        </linearGradient>
      </defs>
      <rect width='1200' height='340' fill='url(#bg)'/>
      <circle cx='1050' cy='60' r='160' fill='white' opacity='0.16'/>
      <circle cx='180' cy='320' r='210' fill='white' opacity='0.12'/>
      <path d='M0 250 C 200 200, 320 300, 540 240 C 760 185, 940 300, 1200 220 L1200 340 L0 340 Z' fill='white' opacity='0.18'/>
      <text x='58' y='92' font-family='Inter, Arial, sans-serif' font-size='54' font-weight='700' fill='white'>${title}</text>
      <text x='58' y='138' font-family='Inter, Arial, sans-serif' font-size='24' fill='white' opacity='0.92'>Deep work mode · one concept at a time</text>
    </svg>
  `)}`;

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

  return (
    <div className="h-screen max-h-screen flex flex-col overflow-hidden bg-[var(--background)]">
      <div className="shrink-0 border-b border-[var(--border)] bg-[var(--card)]">
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="w-8 h-8 rounded-lg hover:bg-[var(--accent)] flex items-center justify-center transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-foreground" />
            </button>
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: module.bgColor }}
            >
              <span style={{ fontSize: "1rem" }}>{module.icon}</span>
            </div>
            <div>
              <h3 className="text-foreground">{module.name}</h3>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: module.color }} />
                <span className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>{module.statusLabel}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <button
              onClick={() => setShowMetrics(!showMetrics)}
              className="w-9 h-9 rounded-xl bg-[var(--accent)] hover:bg-[var(--muted)] flex items-center justify-center transition-colors cursor-pointer"
            >
              {showMetrics ? (
                <PanelRightClose className="w-4 h-4 text-muted-foreground" />
              ) : (
                <PanelRightOpen className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>

        <div className="px-5 pb-3">
          <div className="relative rounded-2xl overflow-hidden border border-[var(--border)] h-24 md:h-28">
            <img
              src={makeModuleStoryImage(module.name, module.color, "#18275C")}
              alt={`${module.name} story banner`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
            <div className="absolute inset-0 p-4 flex items-end justify-between">
              <p className="text-white max-w-xl" style={{ fontSize: "0.74rem", lineHeight: "1.45" }}>
                Stay with one problem long enough for pattern recognition to click. That&apos;s where mastery compounds.
              </p>
              <span className="px-2.5 py-1 rounded-lg bg-black/30 border border-white/20 text-white" style={{ fontSize: "0.64rem" }}>
                Mastery {module.overallMastery}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        <div className={`flex-1 min-w-0 ${showMetrics ? "" : "w-full"}`}>
          <ChatPanel module={module} startRecoveryQuiz={shouldStartRecoveryQuiz} />
        </div>

        {showMetrics && (
          <>
            <div className="hidden md:block w-[380px] shrink-0">
              <MetricsPanel module={module} />
            </div>
            <div className="md:hidden absolute inset-0 z-10 bg-[var(--card)]">
              <MetricsPanel module={module} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
