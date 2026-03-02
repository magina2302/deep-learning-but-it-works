import { useParams, useNavigate } from "react-router";
import { ChatPanel } from "./ChatPanel";
import { MetricsPanel } from "./MetricsPanel";
import { ArrowLeft, PanelRightOpen, PanelRightClose } from "lucide-react";
import { useState } from "react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useModules } from "./ModulesContext";

export function ModulePage() {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { modules } = useModules();
  const [showMetrics, setShowMetrics] = useState(true);

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
    <div className="h-full flex flex-col bg-[var(--background)]">
      {/* Top bar */}
      <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--card)] flex items-center justify-between">
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

      {/* Content */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className={`flex-1 min-w-0 ${showMetrics ? "" : "w-full"}`}>
          <ChatPanel module={module} />
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
