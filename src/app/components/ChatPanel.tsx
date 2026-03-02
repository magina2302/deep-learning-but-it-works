import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { Module, ChatMessage, ChatAttachment, getDaysInactive, getWeakSpots } from "../data/mock-data";
import type { NextActionDecision } from "../data/next-action";
import { Send, Bot, User, Sparkles, Paperclip, FileText, X } from "lucide-react";
import { FileUploadModal } from "./FileUploadModal";

const MarkdownMessage = lazy(() => import("./MarkdownMessage"));

interface ChatPanelProps {
  module: Module;
}

type ChatApiResponse = {
  reply?: string;
  error?: string;
};

function getDecisionOpening(module: Module, decision: NextActionDecision): string {
  const currentSubtopic = module.subtopics.find((s) => !s.completed) || module.subtopics[0];
  const focusName = currentSubtopic?.name ?? module.name;

  switch (decision.action) {
    case "restart":
      return `You've been away for a while, so we'll restart from the fundamentals of ${focusName} before moving ahead.`;
    case "full_recap":
      return `Before continuing, let's do a full recap of ${focusName} with a quick comprehension check.`;
    case "quick_recap":
      return `Welcome back — let's begin with a quick recap quiz on ${focusName}.`;
    case "plateau_mode":
      return `I can see this concept has been difficult, so I'm switching to a different explanation style for ${focusName}.`;
    case "loop_back_weak_spot":
      return `Before new content, we'll loop back to your weak spot and strengthen it with a targeted exercise.`;
    case "harder_problems":
      return `You're showing high mastery, so I'll move faster and give you a harder integrated problem on ${focusName}.`;
    case "more_practice":
      return `We'll slow down and add more guided practice on ${focusName} to build confidence.`;
    default:
      return `You're on track — let's continue with ${focusName}.`;
  }
}

export function ChatPanel({ module }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(module.chatHistory);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(module.chatHistory);
  }, [module.id]);

  useEffect(() => {
    let cancelled = false;

    const loadNextAction = async () => {
      const daysInactive = getDaysInactive(new Date(module.lastStudied));
      const weakSpot = getWeakSpots(module.subtopics)[0];
      const currentSubtopic = module.subtopics.find((s) => !s.completed) || module.subtopics[module.subtopics.length - 1];

      const query = new URLSearchParams({
        daysInactive: String(daysInactive),
        overallMastery: String(module.overallMastery),
        failedAttempts: String(currentSubtopic?.attempts ?? 0),
      });

      if (weakSpot) {
        query.set("weakSpotSubtopicId", weakSpot.id);
        query.set("weakSpotMastery", String(weakSpot.mastery));
        query.set("weakSpotMistakeCount", String(weakSpot.mistakeCount));
      }

      try {
        const response = await fetch(`/topic/${encodeURIComponent(module.id)}/next?${query.toString()}`);
        if (!response.ok) return;

        const payload = (await response.json()) as { decision?: NextActionDecision };
        if (!payload.decision || cancelled) return;

        const opener: ChatMessage = {
          id: `decision-${module.id}-${Date.now()}`,
          role: "ai",
          content: getDecisionOpening(module, payload.decision),
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, opener]);
      } catch {
      }
    };

    loadNextAction();

    return () => {
      cancelled = true;
    };
  }, [module.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() && pendingAttachments.length === 0) return;

    const weakSpot = getWeakSpots(module.subtopics)[0];
    const currentSubtopic = module.subtopics.find((s) => !s.completed) || module.subtopics[module.subtopics.length - 1];
    const daysInactive = getDaysInactive(new Date(module.lastStudied));
    const attachmentsToSend = [...pendingAttachments];

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "student",
      content: input.trim() || (attachmentsToSend.length > 0 ? `Uploaded ${attachmentsToSend.length} file(s)` : ""),
      timestamp: new Date(),
      attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setPendingAttachments([]);
    setIsTyping(true);

    try {
      const history = messages
        .filter((m) => m.role === "student" || m.role === "ai")
        .slice(-10)
        .map((m) => ({
          role: m.role === "student" ? "user" : "assistant",
          content: m.content,
        }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topicId: module.id,
          topicName: module.name,
          overallMastery: module.overallMastery,
          daysInactive,
          failedAttempts: currentSubtopic?.attempts ?? 0,
          weakSpotSubtopicId: weakSpot?.id,
          weakSpotMastery: weakSpot?.mastery,
          weakSpotMistakeCount: weakSpot?.mistakeCount,
          weakSpotName: weakSpot?.name,
          currentSubtopicName: currentSubtopic?.name,
          history,
          userMessage: userMsg.content,
          uploadedFiles: attachmentsToSend.map((attachment) => ({
            name: attachment.name,
            size: attachment.size,
            category: attachment.category,
            mimeType: attachment.mimeType,
            content: attachment.content,
          })),
        }),
      });

      const payload = (await response.json()) as ChatApiResponse;

      let aiContent = payload.reply;
      if (!response.ok || !aiContent) {
        aiContent = payload.error
          ? `I couldn't reach the AI service: ${payload.error}`
          : "I couldn't reach the AI service right now. Please try again in a moment.";
      }

      if (userMsg.attachments && userMsg.attachments.length > 0) {
        const cats = [...new Set(userMsg.attachments.map((a) => a.category))].join(", ");
        aiContent = `I received your ${cats} materials. ${aiContent}`;
      }

      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "ai",
        content: aiContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "ai",
        content: "I couldn't reach the AI service right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = (attachments: ChatAttachment[]) => {
    setPendingAttachments((prev) => [...prev, ...attachments]);
  };

  const removePendingAttachment = (id: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-[var(--background)]">
      {/* Chat header */}
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-3 bg-[var(--card)]">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #FF7541, #B352D7)" }}
        >
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3>AI Tutor</h3>
          <p className="text-muted-foreground" style={{ fontSize: "0.7rem" }}>
            Context-aware  ·  Adaptive pacing
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
        <div
          className="rounded-xl px-4 py-2.5 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(255,117,65,0.08), rgba(179,82,215,0.08))",
            border: "1px solid rgba(255,117,65,0.1)",
          }}
        >
          <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
            The AI tutor controls the learning flow. Upload files to provide context.
          </p>
        </div>

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "student" ? "flex-row-reverse" : ""}`}>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={
                msg.role === "ai"
                  ? { background: "linear-gradient(135deg, #FF7541, #B352D7)" }
                  : { background: `linear-gradient(135deg, ${module.color}, ${module.color}cc)` }
              }
            >
              {msg.role === "ai" ? (
                <Bot className="w-4 h-4 text-white" />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </div>
            <div className={`max-w-[80%] ${msg.role === "student" ? "text-right" : ""}`}>
              <div
                className={`rounded-2xl px-4 py-3 ${
                  msg.role === "ai" ? "bg-[var(--card)] text-foreground border border-[var(--border)]" : "text-white"
                }`}
                style={
                  msg.role === "student"
                    ? { background: `linear-gradient(135deg, ${module.color}, ${module.color}cc)` }
                    : {}
                }
              >
                {msg.role === "ai" ? (
                  <Suspense fallback={<p style={{ fontSize: "0.875rem", lineHeight: "1.6", textAlign: "left" }}>{msg.content}</p>}>
                    <MarkdownMessage content={msg.content} />
                  </Suspense>
                ) : (
                  <p style={{ fontSize: "0.875rem", lineHeight: "1.6", textAlign: "left" }}>{msg.content}</p>
                )}
              </div>
              {/* Attachments */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className={`flex flex-wrap gap-1.5 mt-1.5 ${msg.role === "student" ? "justify-end" : ""}`}>
                  {msg.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg px-2.5 py-1.5"
                    >
                      <FileText className="w-3 h-3 text-muted-foreground" />
                      <span className="text-foreground truncate max-w-[120px]" style={{ fontSize: "0.65rem" }}>{att.name}</span>
                      <span
                        className="px-1 py-0.5 rounded text-white shrink-0"
                        style={{ fontSize: "0.5rem", background: "linear-gradient(135deg, #FF7541, #B352D7)" }}
                      >
                        {att.category}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #FF7541, #B352D7)" }}
            >
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: "#FF7541", animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: "#B352D7", animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: "#DE6AE4", animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pending attachments preview */}
      {pendingAttachments.length > 0 && (
        <div className="px-5 py-2 border-t border-[var(--border)] bg-[var(--card)]">
          <div className="flex flex-wrap gap-1.5">
            {pendingAttachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-1.5 bg-[var(--accent)] rounded-lg px-2.5 py-1.5"
              >
                <FileText className="w-3 h-3 text-muted-foreground" />
                <span className="text-foreground truncate max-w-[100px]" style={{ fontSize: "0.7rem" }}>{att.name}</span>
                <span
                  className="px-1 py-0.5 rounded text-white"
                  style={{ fontSize: "0.5rem", background: "linear-gradient(135deg, #FF7541, #B352D7)" }}
                >
                  {att.category}
                </span>
                <button
                  onClick={() => removePendingAttachment(att.id)}
                  className="w-4 h-4 rounded-sm hover:bg-[var(--muted)] flex items-center justify-center cursor-pointer"
                >
                  <X className="w-2.5 h-2.5 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-5 py-4 border-t border-[var(--border)] bg-[var(--card)]">
        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowUpload(true)}
            className="w-10 h-10 rounded-xl bg-[var(--accent)] hover:bg-[var(--muted)] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            title="Upload file"
          >
            <Paperclip className="w-4 h-4 text-muted-foreground" />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer..."
            rows={1}
            className="flex-1 resize-none bg-[var(--input-background)] rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            style={{ fontSize: "0.875rem", minHeight: "44px", maxHeight: "120px" }}
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && pendingAttachments.length === 0) || isTyping}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-30 transition-all shrink-0 cursor-pointer"
            style={{ background: "linear-gradient(135deg, #FF7541, #B352D7)" }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Upload Modal */}
      <FileUploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onUpload={handleFileUpload}
      />
    </div>
  );
}
