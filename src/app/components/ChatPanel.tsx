import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { Module, ChatMessage, ChatAttachment, getDaysInactive, getWeakSpots } from "../data/mock-data";
import type { NextActionDecision } from "../data/next-action";
import { Send, Bot, User, Sparkles, Paperclip, FileText, X } from "lucide-react";
import { FileUploadModal } from "./FileUploadModal";
import { useAuth } from "./AuthContext";
import { useModules } from "./ModulesContext";

const MarkdownMessage = lazy(() => import("./MarkdownMessage"));

interface ChatPanelProps {
  module: Module;
  startRecoveryQuiz?: boolean;
}

type PersonaProfile = {
  explanationStyle: "step-by-step" | "conceptual" | "visual" | "exam-focused";
  pace: "slow" | "normal" | "fast";
  tone: "encouraging" | "direct";
  questionStyle: "short-answer" | "mcq" | "problem-solving" | "code";
};

type ErrorPatternType =
  | "concept_confusion"
  | "notation_confusion"
  | "calculation_error"
  | "syntax_issue"
  | "uncertain_reasoning";

type ErrorPattern = {
  type: ErrorPatternType;
  count: number;
};

type ChatApiResponse = {
  reply?: string;
  error?: string;
  adaptiveQuestion?: string;
};

type SendOptions = {
  uploadMode?: "quiz" | "teach" | "revise";
  forcedMessage?: string;
};

type PersistedChatMessage = Omit<ChatMessage, "timestamp"> & {
  timestamp: string;
};

const DEFAULT_PERSONA: PersonaProfile = {
  explanationStyle: "step-by-step",
  pace: "normal",
  tone: "encouraging",
  questionStyle: "problem-solving",
};

const tutorStoryImage = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 280'>
    <defs>
      <linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='#FF7541'/>
        <stop offset='100%' stop-color='#6129CC'/>
      </linearGradient>
    </defs>
    <rect width='1200' height='280' fill='url(#bg)'/>
    <circle cx='1040' cy='70' r='170' fill='white' opacity='0.14'/>
    <circle cx='180' cy='300' r='220' fill='white' opacity='0.12'/>
    <path d='M0 200 C 220 150, 340 250, 560 200 C 760 160, 960 250, 1200 190 L1200 280 L0 280 Z' fill='white' opacity='0.18'/>
  </svg>
`)}`;

function restoreChatMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const candidate = item as Partial<PersistedChatMessage>;
      if (!candidate.id || (candidate.role !== "ai" && candidate.role !== "student") || !candidate.content || !candidate.timestamp) {
        return null;
      }

      const parsedTimestamp = new Date(candidate.timestamp);
      if (Number.isNaN(parsedTimestamp.getTime())) {
        return null;
      }

      return {
        id: candidate.id,
        role: candidate.role,
        content: candidate.content,
        timestamp: parsedTimestamp,
        attachments: Array.isArray(candidate.attachments) ? candidate.attachments : undefined,
      } as ChatMessage;
    })
    .filter((message): message is ChatMessage => message !== null);
}

function serializeChatMessages(messages: ChatMessage[]): PersistedChatMessage[] {
  return messages.map((message) => ({
    ...message,
    timestamp: message.timestamp.toISOString(),
  }));
}

function detectErrorPatternsFromMessage(content: string): ErrorPatternType[] {
  const text = content.toLowerCase();
  const hits = new Set<ErrorPatternType>();

  if (/(don't understand|confused|not sure|what does|i don.t get)/.test(text)) {
    hits.add("concept_confusion");
  }
  if (/(symbol|notation|what is .* mean|epsilon|sigma|lambda|⊂|∈|∑|∫)/.test(text)) {
    hits.add("notation_confusion");
  }
  if (/(wrong answer|calculation|computed|minus|plus|sign error|arithmetic)/.test(text)) {
    hits.add("calculation_error");
  }
  if (/(error|compile|syntax|semicolon|bracket|parenthesis|verilog|code)/.test(text)) {
    hits.add("syntax_issue");
  }
  if (/(maybe|guess|i think|probably|not certain)/.test(text)) {
    hits.add("uncertain_reasoning");
  }

  return [...hits];
}

function errorPatternLabel(type: ErrorPatternType): string {
  switch (type) {
    case "concept_confusion":
      return "Concept confusion";
    case "notation_confusion":
      return "Notation confusion";
    case "calculation_error":
      return "Calculation errors";
    case "syntax_issue":
      return "Syntax issues";
    default:
      return "Uncertain reasoning";
  }
}

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

export function ChatPanel({ module, startRecoveryQuiz = false }: ChatPanelProps) {
  const { user } = useAuth();
  const { updateModuleProgress } = useModules();
  const [messages, setMessages] = useState<ChatMessage[]>(module.chatHistory);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showPersonaEditor, setShowPersonaEditor] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [personaProfile, setPersonaProfile] = useState<PersonaProfile>(DEFAULT_PERSONA);
  const [errorPatterns, setErrorPatterns] = useState<ErrorPattern[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recoveryQuizSentForModuleRef = useRef<string | null>(null);

  const personaStorageKey = `persona:${module.id}`;
  const errorStorageKey = `error-patterns:${module.id}`;
  const chatStorageKey = `chat-history:${user?.id ?? "guest"}:${module.id}`;
  const decisionOpenerStorageKey = `decision-opener-shown:${user?.id ?? "guest"}:${module.id}`;
  const recoveryQuizStorageKey = `recovery-quiz-sent:${user?.id ?? "guest"}:${module.id}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(chatStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const restored = restoreChatMessages(parsed);
        if (restored.length > 0) {
          setMessages(restored);
          return;
        }
      }
    } catch {
    }

    setMessages(module.chatHistory);
  }, [chatStorageKey, module.id]);

  useEffect(() => {
    try {
      localStorage.setItem(chatStorageKey, JSON.stringify(serializeChatMessages(messages)));
    } catch {
    }
  }, [messages, chatStorageKey]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(personaStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersonaProfile>;
        setPersonaProfile({ ...DEFAULT_PERSONA, ...parsed });
      } else {
        setPersonaProfile(DEFAULT_PERSONA);
      }
    } catch {
      setPersonaProfile(DEFAULT_PERSONA);
    }

    try {
      const raw = localStorage.getItem(errorStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as ErrorPattern[];
        setErrorPatterns(Array.isArray(parsed) ? parsed : []);
      } else {
        setErrorPatterns([]);
      }
    } catch {
      setErrorPatterns([]);
    }
  }, [personaStorageKey, errorStorageKey]);

  useEffect(() => {
    localStorage.setItem(personaStorageKey, JSON.stringify(personaProfile));
  }, [personaProfile, personaStorageKey]);

  useEffect(() => {
    localStorage.setItem(errorStorageKey, JSON.stringify(errorPatterns));
  }, [errorPatterns, errorStorageKey]);

  useEffect(() => {
    let cancelled = false;

    const loadNextAction = async () => {
      if (localStorage.getItem(decisionOpenerStorageKey) === "1") {
        return;
      }

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
        localStorage.setItem(decisionOpenerStorageKey, "1");
      } catch {
      }
    };

    loadNextAction();

    return () => {
      cancelled = true;
    };
  }, [module.id, decisionOpenerStorageKey]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async ({ uploadMode, forcedMessage }: SendOptions = {}) => {
    if (!input.trim() && pendingAttachments.length === 0 && !forcedMessage) return;

    const weakSpot = getWeakSpots(module.subtopics)[0];
    const currentSubtopic = module.subtopics.find((s) => !s.completed) || module.subtopics[module.subtopics.length - 1];
    const daysInactive = getDaysInactive(new Date(module.lastStudied));
    const attachmentsToSend = [...pendingAttachments];
    const isUploadAction = Boolean(uploadMode);
    const userContent =
      forcedMessage
        ? forcedMessage
        :
      uploadMode === "quiz"
        ? "Quiz me using only the uploaded files. Ask one question at a time and wait for my answer."
        : uploadMode === "teach"
          ? "Teach me from the uploaded files. Explain clearly in simple steps and include one short check question at the end."
          : uploadMode === "revise"
            ? "Help me revise from the uploaded files. Give me a concise revision summary with key points and common mistakes to avoid."
            : input.trim() || (attachmentsToSend.length > 0 ? `Uploaded ${attachmentsToSend.length} file(s)` : "");

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "student",
      content: userContent,
      timestamp: new Date(),
      attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
    };
    setMessages((prev) => [...prev, userMsg]);

    const nextMastery = Math.min(100, module.overallMastery + (isUploadAction ? 3 : 2));
    updateModuleProgress(module.id, {
      overallMastery: nextMastery,
      lastStudied: new Date(),
    });

    const detectedPatterns = detectErrorPatternsFromMessage(userMsg.content);
    const currentPatternMap = new Map<ErrorPatternType, number>();
    errorPatterns.forEach((item) => currentPatternMap.set(item.type, item.count));
    detectedPatterns.forEach((pattern) => {
      currentPatternMap.set(pattern, (currentPatternMap.get(pattern) || 0) + 1);
    });
    const nextErrorPatternsForRequest: ErrorPattern[] = [...currentPatternMap.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    if (detectedPatterns.length > 0) {
      setErrorPatterns(nextErrorPatternsForRequest);
    }

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
          personaProfile,
          errorPatterns: nextErrorPatternsForRequest,
          requestAdaptiveQuestion: !isUploadAction,
          quizFromUploads: uploadMode === "quiz",
          uploadMode,
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

      if (!isUploadAction && payload.adaptiveQuestion) {
        aiContent = `${aiContent}\n\n${payload.adaptiveQuestion}`;
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

  useEffect(() => {
    if (!startRecoveryQuiz) return;
    if (localStorage.getItem(recoveryQuizStorageKey) === "1") return;
    if (recoveryQuizSentForModuleRef.current === module.id) return;

    recoveryQuizSentForModuleRef.current = module.id;
    localStorage.setItem(recoveryQuizStorageKey, "1");
    void handleSend({
      forcedMessage: "I have not studied this module for 5 days. Give me a short recovery quiz based on my weak spots. Ask one question at a time.",
    });
  }, [startRecoveryQuiz, module.id, recoveryQuizStorageKey]);

  const handleStartQuizFromUploads = async () => {
    await handleSend({ uploadMode: "quiz" });
  };

  const handleTeachFromUploads = async () => {
    await handleSend({ uploadMode: "teach" });
  };

  const handleReviseFromUploads = async () => {
    await handleSend({ uploadMode: "revise" });
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

  const topErrorPatterns = errorPatterns.slice(0, 3);

  const removePendingAttachment = (id: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-[var(--background)]">
      <div className="px-5 pt-4 pb-3 border-b border-[var(--border)] bg-[var(--card)]">
        <div className="relative rounded-2xl overflow-hidden border border-[var(--border)] mb-3">
          <img src={tutorStoryImage} alt="AI tutor story banner" className="w-full h-20 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
          <div className="absolute inset-0 px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #FF7541, #B352D7)" }}
              >
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-white">AI Tutor</h3>
                <p className="text-white/80" style={{ fontSize: "0.7rem" }}>
                  Context-aware  ·  Adaptive pacing
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPersonaEditor((prev) => !prev)}
              className="text-white px-2 py-1 rounded-lg bg-black/25 border border-white/20"
              style={{ fontSize: "0.65rem" }}
            >
              Persona
            </button>
          </div>
        </div>
      </div>

      {showPersonaEditor && (
        <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--card)]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <label className="text-muted-foreground" style={{ fontSize: "0.65rem" }}>
              Explanation
              <select
                value={personaProfile.explanationStyle}
                onChange={(e) => setPersonaProfile((prev) => ({ ...prev, explanationStyle: e.target.value as PersonaProfile["explanationStyle"] }))}
                className="mt-1 w-full bg-[var(--input-background)] rounded-lg px-2 py-1 text-foreground"
              >
                <option value="step-by-step">Step-by-step</option>
                <option value="conceptual">Conceptual</option>
                <option value="visual">Visual intuition</option>
                <option value="exam-focused">Exam-focused</option>
              </select>
            </label>
            <label className="text-muted-foreground" style={{ fontSize: "0.65rem" }}>
              Pace
              <select
                value={personaProfile.pace}
                onChange={(e) => setPersonaProfile((prev) => ({ ...prev, pace: e.target.value as PersonaProfile["pace"] }))}
                className="mt-1 w-full bg-[var(--input-background)] rounded-lg px-2 py-1 text-foreground"
              >
                <option value="slow">Slow</option>
                <option value="normal">Normal</option>
                <option value="fast">Fast</option>
              </select>
            </label>
            <label className="text-muted-foreground" style={{ fontSize: "0.65rem" }}>
              Tone
              <select
                value={personaProfile.tone}
                onChange={(e) => setPersonaProfile((prev) => ({ ...prev, tone: e.target.value as PersonaProfile["tone"] }))}
                className="mt-1 w-full bg-[var(--input-background)] rounded-lg px-2 py-1 text-foreground"
              >
                <option value="encouraging">Encouraging</option>
                <option value="direct">Direct</option>
              </select>
            </label>
            <label className="text-muted-foreground" style={{ fontSize: "0.65rem" }}>
              Question style
              <select
                value={personaProfile.questionStyle}
                onChange={(e) => setPersonaProfile((prev) => ({ ...prev, questionStyle: e.target.value as PersonaProfile["questionStyle"] }))}
                className="mt-1 w-full bg-[var(--input-background)] rounded-lg px-2 py-1 text-foreground"
              >
                <option value="problem-solving">Problem solving</option>
                <option value="short-answer">Short answer</option>
                <option value="mcq">MCQ</option>
                <option value="code">Code</option>
              </select>
            </label>
          </div>
        </div>
      )}

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

        {topErrorPatterns.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {topErrorPatterns.map((pattern) => (
              <span
                key={pattern.type}
                className="px-2 py-1 rounded-lg bg-[var(--accent)] text-muted-foreground"
                style={{ fontSize: "0.65rem" }}
              >
                {errorPatternLabel(pattern.type)} · {pattern.count}
              </span>
            ))}
          </div>
        )}

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
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={handleStartQuizFromUploads}
              disabled={pendingAttachments.length === 0 || isTyping}
              className="px-3 py-1.5 rounded-lg text-white disabled:opacity-40 transition-all cursor-pointer"
              style={{ fontSize: "0.7rem", background: "linear-gradient(135deg, #FF7541, #B352D7)" }}
            >
              Quiz me from uploads
            </button>
            <button
              type="button"
              onClick={handleTeachFromUploads}
              disabled={pendingAttachments.length === 0 || isTyping}
              className="px-3 py-1.5 rounded-lg text-white disabled:opacity-40 transition-all cursor-pointer"
              style={{ fontSize: "0.7rem", background: "linear-gradient(135deg, #FF7541, #B352D7)" }}
            >
              Teach me from uploads
            </button>
            <button
              type="button"
              onClick={handleReviseFromUploads}
              disabled={pendingAttachments.length === 0 || isTyping}
              className="px-3 py-1.5 rounded-lg text-white disabled:opacity-40 transition-all cursor-pointer"
              style={{ fontSize: "0.7rem", background: "linear-gradient(135deg, #FF7541, #B352D7)" }}
            >
              Help me revise
            </button>
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
            onClick={() => {
              void handleSend();
            }}
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
