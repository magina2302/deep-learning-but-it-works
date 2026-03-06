import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { Bot, CheckCircle2, ClipboardPaste, FileText, Mic, Paperclip, Send, Sparkles, User, Volume2, X } from "lucide-react";
import type { Module, ChatAttachment, ChatMessage } from "../data/mock-data";
import type { CitationRef, ReviewOutcome } from "../data/learning-core";
import { getDaysInactive, getWeakSpots } from "../data/mock-data";
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
  confidence?: "high" | "medium" | "low";
  confidenceReason?: string;
  citations?: CitationRef[];
};

type SendOptions = {
  uploadMode?: "quiz" | "teach" | "revise";
  forcedMessage?: string;
};

type SessionMode = "coach" | "oral-quiz" | "roleplay" | "interview";

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
        meta: candidate.meta,
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

  if (/(don't understand|confused|not sure|what does|i don.t get)/.test(text)) hits.add("concept_confusion");
  if (/(symbol|notation|what is .* mean|epsilon|sigma|lambda|⊂|∈|∑|∫)/.test(text)) hits.add("notation_confusion");
  if (/(wrong answer|calculation|computed|minus|plus|sign error|arithmetic)/.test(text)) hits.add("calculation_error");
  if (/(error|compile|syntax|semicolon|bracket|parenthesis|verilog|code)/.test(text)) hits.add("syntax_issue");
  if (/(maybe|guess|i think|probably|not certain)/.test(text)) hits.add("uncertain_reasoning");

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

async function blobToDataUrl(blob: Blob): Promise<string | undefined> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : undefined);
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(blob);
  });
}

async function analyzeAttachments(moduleName: string, attachments: ChatAttachment[]): Promise<Record<string, string[]>> {
  try {
    const response = await fetch("/api/materials/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        moduleName,
        attachments: attachments.map((attachment) => ({
          id: attachment.id,
          name: attachment.name,
          mimeType: attachment.mimeType,
          content: attachment.content,
          dataUrl: attachment.dataUrl,
          category: attachment.category,
        })),
      }),
    });

    if (!response.ok) return {};
    const payload = (await response.json()) as { extractedSubtopics?: Record<string, string[]> };
    return payload.extractedSubtopics || {};
  } catch {
    return {};
  }
}

function formatConfidenceBadge(label?: "high" | "medium" | "low") {
  if (label === "high") return { text: "High confidence", color: "#10b981", bg: "rgba(16,185,129,0.12)" };
  if (label === "low") return { text: "Low confidence", color: "#ef4444", bg: "rgba(239,68,68,0.12)" };
  return { text: "Medium confidence", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" };
}

export function ChatPanel({ module, startRecoveryQuiz = false }: ChatPanelProps) {
  const { user } = useAuth();
  const { updateModuleProgress, ingestStudyMaterials, recordReviewOutcome } = useModules();
  const [messages, setMessages] = useState<ChatMessage[]>(module.chatHistory);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showPersonaEditor, setShowPersonaEditor] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [personaProfile, setPersonaProfile] = useState<PersonaProfile>(DEFAULT_PERSONA);
  const [errorPatterns, setErrorPatterns] = useState<ErrorPattern[]>([]);
  const [clipboardHint, setClipboardHint] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sessionMode, setSessionMode] = useState<SessionMode>("coach");
  const scrollRef = useRef<HTMLDivElement>(null);
  const recoveryQuizSentForModuleRef = useRef<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const personaStorageKey = `persona:${module.id}`;
  const errorStorageKey = `error-patterns:${module.id}`;
  const chatStorageKey = `chat-history:${user?.id ?? "guest"}:${module.id}`;
  const decisionOpenerStorageKey = `decision-opener-shown:${user?.id ?? "guest"}:${module.id}`;
  const recoveryQuizStorageKey = `recovery-quiz-sent:${user?.id ?? "guest"}:${module.id}`;
  const dueToday = module.dueToday || [];
  const topDueReview = dueToday[0];
  const topErrorPatterns = errorPatterns.slice(0, 3);
  const streakDays = module.accountability?.streakDays || 0;

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
  }, [chatStorageKey, module.id, module.chatHistory]);

  useEffect(() => {
    try {
      localStorage.setItem(chatStorageKey, JSON.stringify(serializeChatMessages(messages)));
    } catch {
    }
  }, [messages, chatStorageKey]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(personaStorageKey);
      setPersonaProfile(raw ? { ...DEFAULT_PERSONA, ...(JSON.parse(raw) as Partial<PersonaProfile>) } : DEFAULT_PERSONA);
    } catch {
      setPersonaProfile(DEFAULT_PERSONA);
    }

    try {
      const raw = localStorage.getItem(errorStorageKey);
      setErrorPatterns(raw ? ((JSON.parse(raw) as ErrorPattern[]) || []) : []);
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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, pendingAttachments.length]);

  useEffect(() => {
    let cancelled = false;

    const loadNextAction = async () => {
      if (localStorage.getItem(decisionOpenerStorageKey) === "1") {
        return;
      }

      const daysInactive = getDaysInactive(new Date(module.lastStudied));
      const weakSpot = getWeakSpots(module.subtopics)[0];
      const currentSubtopic = module.subtopics.find((subtopic) => !subtopic.completed) || module.subtopics[module.subtopics.length - 1];
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

        const payload = (await response.json()) as { decision?: { action: string; reason: string } };
        if (!payload.decision || cancelled) return;

        const opener: ChatMessage = {
          id: `decision-${module.id}-${Date.now()}`,
          role: "ai",
          content: `Next best move: **${payload.decision.action.replace(/_/g, " ")}**. ${payload.decision.reason}`,
          timestamp: new Date(),
        };

        setMessages((previous) => [...previous, opener]);
        localStorage.setItem(decisionOpenerStorageKey, "1");
      } catch {
      }
    };

    void loadNextAction();
    return () => {
      cancelled = true;
    };
  }, [decisionOpenerStorageKey, module.id, module.lastStudied, module.overallMastery, module.subtopics]);

  useEffect(() => {
    if (!startRecoveryQuiz) return;
    if (localStorage.getItem(recoveryQuizStorageKey) === "1") return;
    if (recoveryQuizSentForModuleRef.current === module.id) return;

    recoveryQuizSentForModuleRef.current = module.id;
    localStorage.setItem(recoveryQuizStorageKey, "1");
    void handleSend({
      forcedMessage: "I have not studied this module for 5 days. Give me a short recovery quiz based on my weak spots. Ask one question at a time.",
    });
  }, [module.id, recoveryQuizStorageKey, startRecoveryQuiz]);

  const speakMessage = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text.replace(/```[\s\S]*?```/g, "").replace(/[#>*_`]/g, " "));
    utterance.rate = personaProfile.pace === "slow" ? 0.9 : personaProfile.pace === "fast" ? 1.08 : 1;
    utterance.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const startVoiceInput = () => {
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setClipboardHint("Voice input is not available in this browser.");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0]?.transcript || "")
        .join("");
      setInput(transcript.trim());
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
      setClipboardHint("Voice input failed. You can still type or paste material.");
    };
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const handleSend = async ({ uploadMode, forcedMessage }: SendOptions = {}) => {
    if (!input.trim() && pendingAttachments.length === 0 && !forcedMessage) return;

    const weakSpot = getWeakSpots(module.subtopics)[0];
    const currentSubtopic = module.subtopics.find((subtopic) => !subtopic.completed) || module.subtopics[module.subtopics.length - 1];
    const daysInactive = getDaysInactive(new Date(module.lastStudied));
    const attachmentsToSend = [...pendingAttachments];
    const isUploadAction = Boolean(uploadMode);
    const userContent =
      forcedMessage
        ? forcedMessage
        : uploadMode === "quiz"
          ? "Quiz me using only the uploaded files. Ask one question at a time and wait for my answer."
          : uploadMode === "teach"
            ? "Teach me from the uploaded files. Explain clearly in simple steps and include one short check question at the end."
            : uploadMode === "revise"
              ? "Help me revise from the uploaded files. Give me a concise revision summary with key points and common mistakes to avoid."
                : sessionMode === "oral-quiz"
                  ? `Run an oral quiz on ${module.name}. Ask one short question at a time and wait for my answer.`
                  : sessionMode === "roleplay"
                    ? `Start a roleplay that helps me practice ${module.name} in a realistic scenario.`
                    : sessionMode === "interview"
                      ? `Interview me like an examiner on ${module.name}. Ask probing questions and wait for my response.`
                      : input.trim() || (attachmentsToSend.length > 0 ? `Uploaded ${attachmentsToSend.length} file(s)` : "");

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "student",
      content: userContent,
      timestamp: new Date(),
      attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
    };
    setMessages((previous) => [...previous, userMsg]);
    updateModuleProgress(module.id, { lastStudied: new Date() });

    const detectedPatterns = detectErrorPatternsFromMessage(userMsg.content);
    const currentPatternMap = new Map<ErrorPatternType, number>();
    errorPatterns.forEach((item) => currentPatternMap.set(item.type, item.count));
    detectedPatterns.forEach((pattern) => currentPatternMap.set(pattern, (currentPatternMap.get(pattern) || 0) + 1));
    const nextErrorPatternsForRequest: ErrorPattern[] = [...currentPatternMap.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5);

    if (detectedPatterns.length > 0) {
      setErrorPatterns(nextErrorPatternsForRequest);
    }

    setInput("");
    setPendingAttachments([]);
    setIsTyping(true);

    try {
      const history = messages
        .filter((message) => message.role === "student" || message.role === "ai")
        .slice(-10)
        .map((message) => ({
          role: message.role === "student" ? "user" : "assistant",
          content: message.content,
        }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          sessionMode,
          uploadedFiles: attachmentsToSend.map((attachment) => ({
            id: attachment.id,
            name: attachment.name,
            size: attachment.size,
            category: attachment.category,
            mimeType: attachment.mimeType,
            content: attachment.content,
            dataUrl: attachment.dataUrl,
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

      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "ai",
        content: aiContent,
        timestamp: new Date(),
        meta: {
          confidence: payload.confidence,
          confidenceReason: payload.confidenceReason,
          citations: payload.citations,
          mode: uploadMode || (voiceEnabled ? "voice" : "chat"),
        },
      };
      setMessages((previous) => [...previous, aiMsg]);
      if (voiceEnabled) {
        speakMessage(aiContent);
      }
    } catch {
      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "ai",
        content: "I couldn't reach the AI service right now. Please try again in a moment.",
        timestamp: new Date(),
        meta: {
          confidence: "low",
          confidenceReason: "No response was returned from the API.",
          citations: [],
          mode: "chat",
        },
      };
      setMessages((previous) => [...previous, aiMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileUpload = async (attachments: ChatAttachment[]) => {
    setPendingAttachments((previous) => [...previous, ...attachments]);
    const extractedSubtopics = await analyzeAttachments(module.name, attachments);
    ingestStudyMaterials(module.id, attachments, extractedSubtopics);

    const createdTopics = Object.values(extractedSubtopics).flat().slice(0, 6);
    if (createdTopics.length > 0) {
      setMessages((previous) => [
        ...previous,
        {
          id: `material-${Date.now()}`,
          role: "ai",
          content: `I parsed your new material and extracted these study subtopics: ${createdTopics.join(", ")}. They are now part of your review system.`,
          timestamp: new Date(),
          meta: {
            confidence: "high",
            confidenceReason: "These subtopics came directly from the uploaded material analysis pipeline.",
            citations: attachments.slice(0, 2).map((attachment) => ({ sourceName: attachment.name })),
            mode: "material-analysis",
          },
        },
      ]);
    }
  };

  const handleClipboardPaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboard = event.clipboardData;
    if (!clipboard) return;

    const nextAttachments: ChatAttachment[] = [];
    const items = Array.from(clipboard.items || []);

    for (const item of items) {
      if (item.kind === "file") {
        const blob = item.getAsFile();
        if (!blob) continue;
        const dataUrl = await blobToDataUrl(blob);
        nextAttachments.push({
          id: `paste-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: blob.name || `pasted-image-${nextAttachments.length + 1}.png`,
          size: `${Math.round(blob.size / 1024)} KB`,
          category: "Lecture",
          mimeType: blob.type || undefined,
          dataUrl,
        });
      }
    }

    const pastedText = clipboard.getData("text/plain");
    if (pastedText && pastedText.trim().length >= 120) {
      nextAttachments.push({
        id: `paste-text-${Date.now()}`,
        name: "Pasted notes.txt",
        size: `${pastedText.trim().length} chars`,
        category: "Lecture",
        mimeType: "text/plain",
        content: pastedText.trim(),
      });
    }

    if (nextAttachments.length === 0) {
      return;
    }

    event.preventDefault();
    setClipboardHint(`Added ${nextAttachments.length} item${nextAttachments.length === 1 ? "" : "s"} from your clipboard to the study materials queue.`);
    await handleFileUpload(nextAttachments);
  };

  const removePendingAttachment = (id: string) => {
    setPendingAttachments((previous) => previous.filter((attachment) => attachment.id !== id));
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const submitReviewOutcome = (outcome: ReviewOutcome) => {
    if (!topDueReview) return;

    const note = outcome === "mastered"
      ? "Completed from the due-today queue"
      : outcome === "struggled"
        ? "Needed another guided pass in the due-today queue"
        : "Missed during the due-today queue review";

    recordReviewOutcome(module.id, topDueReview.subtopicId, outcome, note);
    setMessages((previous) => [
      ...previous,
      {
        id: `review-${Date.now()}`,
        role: "ai",
        content: outcome === "mastered"
          ? `Nice work. I marked **${topDueReview.subtopicName}** as mastered for today's review and rescheduled it further out.`
          : outcome === "struggled"
            ? `Logged **${topDueReview.subtopicName}** as struggled. It will come back tomorrow and stays in your weak-spot history.`
            : `Logged **${topDueReview.subtopicName}** as missed. It now has a higher priority in your due-today queue and mistake review history.`,
        timestamp: new Date(),
        meta: {
          confidence: "high",
          confidenceReason: "This status comes directly from your explicit review outcome.",
          citations: [{ sourceName: topDueReview.moduleName }],
          mode: "review",
        },
      },
    ]);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--background)]">
      <div className="px-5 pt-4 pb-3 border-b border-[var(--border)] bg-[var(--card)]">
        <div className="relative rounded-2xl overflow-hidden border border-[var(--border)] mb-3">
          <img src={tutorStoryImage} alt="AI tutor story banner" className="w-full h-20 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
          <div className="absolute inset-0 px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FF7541, #B352D7)" }}>
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-white">AI Tutor</h3>
                <p className="text-white/80" style={{ fontSize: "0.7rem" }}>
                  Evidence-backed coaching · citations · review control
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded-lg bg-black/25 border border-white/20 text-white" style={{ fontSize: "0.65rem" }}>
                Streak {streakDays}d
              </span>
              <button
                type="button"
                onClick={() => setVoiceEnabled((previous) => !previous)}
                className="text-white px-2 py-1 rounded-lg bg-black/25 border border-white/20"
                style={{ fontSize: "0.65rem" }}
              >
                {voiceEnabled ? "Voice on" : "Voice off"}
              </button>
              <button
                type="button"
                onClick={() => setShowPersonaEditor((previous) => !previous)}
                className="text-white px-2 py-1 rounded-lg bg-black/25 border border-white/20"
                style={{ fontSize: "0.65rem" }}
              >
                Persona
              </button>
            </div>
          </div>
        </div>

        {topDueReview && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-foreground" style={{ fontSize: "0.82rem" }}>
                  Due today: <span style={{ color: module.color }}>{topDueReview.subtopicName}</span>
                </p>
                <p className="text-muted-foreground" style={{ fontSize: "0.7rem", lineHeight: "1.45" }}>
                  {topDueReview.reason}. Log the outcome so mastery updates from evidence, not chat volume.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => submitReviewOutcome("mastered")} className="px-2.5 py-1.5 rounded-lg text-white cursor-pointer" style={{ fontSize: "0.68rem", backgroundColor: "#10b981" }}>Mastered</button>
                <button onClick={() => submitReviewOutcome("struggled")} className="px-2.5 py-1.5 rounded-lg text-white cursor-pointer" style={{ fontSize: "0.68rem", backgroundColor: "#f59e0b" }}>Struggled</button>
                <button onClick={() => submitReviewOutcome("missed")} className="px-2.5 py-1.5 rounded-lg text-white cursor-pointer" style={{ fontSize: "0.68rem", backgroundColor: "#ef4444" }}>Missed</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showPersonaEditor && (
        <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--card)]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <label className="text-muted-foreground" style={{ fontSize: "0.65rem" }}>
              Explanation
              <select value={personaProfile.explanationStyle} onChange={(event) => setPersonaProfile((previous) => ({ ...previous, explanationStyle: event.target.value as PersonaProfile["explanationStyle"] }))} className="mt-1 w-full bg-[var(--input-background)] rounded-lg px-2 py-1 text-foreground">
                <option value="step-by-step">Step-by-step</option>
                <option value="conceptual">Conceptual</option>
                <option value="visual">Visual intuition</option>
                <option value="exam-focused">Exam-focused</option>
              </select>
            </label>
            <label className="text-muted-foreground" style={{ fontSize: "0.65rem" }}>
              Pace
              <select value={personaProfile.pace} onChange={(event) => setPersonaProfile((previous) => ({ ...previous, pace: event.target.value as PersonaProfile["pace"] }))} className="mt-1 w-full bg-[var(--input-background)] rounded-lg px-2 py-1 text-foreground">
                <option value="slow">Slow</option>
                <option value="normal">Normal</option>
                <option value="fast">Fast</option>
              </select>
            </label>
            <label className="text-muted-foreground" style={{ fontSize: "0.65rem" }}>
              Tone
              <select value={personaProfile.tone} onChange={(event) => setPersonaProfile((previous) => ({ ...previous, tone: event.target.value as PersonaProfile["tone"] }))} className="mt-1 w-full bg-[var(--input-background)] rounded-lg px-2 py-1 text-foreground">
                <option value="encouraging">Encouraging</option>
                <option value="direct">Direct</option>
              </select>
            </label>
            <label className="text-muted-foreground" style={{ fontSize: "0.65rem" }}>
              Question style
              <select value={personaProfile.questionStyle} onChange={(event) => setPersonaProfile((previous) => ({ ...previous, questionStyle: event.target.value as PersonaProfile["questionStyle"] }))} className="mt-1 w-full bg-[var(--input-background)] rounded-lg px-2 py-1 text-foreground">
                <option value="problem-solving">Problem solving</option>
                <option value="short-answer">Short answer</option>
                <option value="mcq">MCQ</option>
                <option value="code">Code</option>
              </select>
            </label>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="rounded-xl px-4 py-2.5 text-center" style={{ background: "linear-gradient(135deg, rgba(255,117,65,0.08), rgba(179,82,215,0.08))", border: "1px solid rgba(255,117,65,0.1)" }}>
          <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
            Upload notes, paste long text, or paste screenshots directly here. New material feeds subtopic extraction and the due-today queue.
          </p>
        </div>

        {clipboardHint && (
          <div className="rounded-xl px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] flex items-center justify-between gap-3">
            <p className="text-muted-foreground" style={{ fontSize: "0.72rem" }}>{clipboardHint}</p>
            <button onClick={() => setClipboardHint(null)} className="w-6 h-6 rounded-md hover:bg-[var(--accent)] flex items-center justify-center cursor-pointer">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        )}

        {topErrorPatterns.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {topErrorPatterns.map((pattern) => (
              <span key={pattern.type} className="px-2 py-1 rounded-lg bg-[var(--accent)] text-muted-foreground" style={{ fontSize: "0.65rem" }}>
                {errorPatternLabel(pattern.type)} · {pattern.count}
              </span>
            ))}
          </div>
        )}

        {messages.map((message) => {
          const confidenceBadge = formatConfidenceBadge(message.meta?.confidence);
          return (
            <div key={message.id} className={`flex gap-3 ${message.role === "student" ? "flex-row-reverse" : ""}`}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={message.role === "ai" ? { background: "linear-gradient(135deg, #FF7541, #B352D7)" } : { background: `linear-gradient(135deg, ${module.color}, ${module.color}cc)` }}>
                {message.role === "ai" ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-white" />}
              </div>
              <div className={`max-w-[82%] ${message.role === "student" ? "text-right" : ""}`}>
                <div className={`rounded-2xl px-4 py-3 ${message.role === "ai" ? "bg-[var(--card)] text-foreground border border-[var(--border)]" : "text-white"}`} style={message.role === "student" ? { background: `linear-gradient(135deg, ${module.color}, ${module.color}cc)` } : {}}>
                  {message.role === "ai" ? (
                    <Suspense fallback={<p style={{ fontSize: "0.875rem", lineHeight: "1.6", textAlign: "left" }}>{message.content}</p>}>
                      <MarkdownMessage content={message.content} />
                    </Suspense>
                  ) : (
                    <p style={{ fontSize: "0.875rem", lineHeight: "1.6", textAlign: "left" }}>{message.content}</p>
                  )}
                </div>

                {message.meta && message.role === "ai" && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-1 rounded-lg" style={{ fontSize: "0.62rem", backgroundColor: confidenceBadge.bg, color: confidenceBadge.color }}>
                        {confidenceBadge.text}
                      </span>
                      {message.meta.mode && (
                        <span className="px-2 py-1 rounded-lg bg-[var(--accent)] text-muted-foreground" style={{ fontSize: "0.62rem" }}>
                          {message.meta.mode}
                        </span>
                      )}
                      {voiceEnabled && (
                        <button onClick={() => speakMessage(message.content)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--accent)] text-muted-foreground cursor-pointer" style={{ fontSize: "0.62rem" }}>
                          <Volume2 className="w-3 h-3" />
                          Read aloud
                        </button>
                      )}
                    </div>
                    {message.meta.confidenceReason && (
                      <p className="text-muted-foreground" style={{ fontSize: "0.68rem", lineHeight: "1.45", textAlign: "left" }}>
                        {message.meta.confidenceReason}
                      </p>
                    )}
                    {message.meta.citations && message.meta.citations.length > 0 && (
                      <div className="space-y-1">
                        {message.meta.citations.map((citation, index) => (
                          <div key={`${citation.sourceName}-${index}`} className="rounded-xl bg-[var(--accent)] px-3 py-2">
                            <p className="text-foreground" style={{ fontSize: "0.66rem" }}>
                              Source: {citation.sourceName}
                            </p>
                            {citation.snippet && (
                              <p className="text-muted-foreground" style={{ fontSize: "0.64rem", lineHeight: "1.4", textAlign: "left" }}>
                                “{citation.snippet}”
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {message.attachments && message.attachments.length > 0 && (
                  <div className={`flex flex-wrap gap-1.5 mt-1.5 ${message.role === "student" ? "justify-end" : ""}`}>
                    {message.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center gap-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg px-2.5 py-1.5">
                        <FileText className="w-3 h-3 text-muted-foreground" />
                        <span className="text-foreground truncate max-w-[140px]" style={{ fontSize: "0.65rem" }}>{attachment.name}</span>
                        <span className="px-1 py-0.5 rounded text-white shrink-0" style={{ fontSize: "0.5rem", background: "linear-gradient(135deg, #FF7541, #B352D7)" }}>{attachment.category}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #FF7541, #B352D7)" }}>
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

      {pendingAttachments.length > 0 && (
        <div className="px-5 py-2 border-t border-[var(--border)] bg-[var(--card)]">
          <div className="flex flex-wrap gap-1.5">
            {pendingAttachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center gap-1.5 bg-[var(--accent)] rounded-lg px-2.5 py-1.5">
                <FileText className="w-3 h-3 text-muted-foreground" />
                <span className="text-foreground truncate max-w-[100px]" style={{ fontSize: "0.7rem" }}>{attachment.name}</span>
                <span className="px-1 py-0.5 rounded text-white" style={{ fontSize: "0.5rem", background: "linear-gradient(135deg, #FF7541, #B352D7)" }}>{attachment.category}</span>
                <button onClick={() => removePendingAttachment(attachment.id)} className="w-4 h-4 rounded-sm hover:bg-[var(--muted)] flex items-center justify-center cursor-pointer">
                  <X className="w-2.5 h-2.5 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => void handleSend({ uploadMode: "quiz" })} disabled={pendingAttachments.length === 0 || isTyping} className="px-3 py-1.5 rounded-lg text-white disabled:opacity-40 transition-all cursor-pointer" style={{ fontSize: "0.7rem", background: "linear-gradient(135deg, #FF7541, #B352D7)" }}>
              Quiz me from uploads
            </button>
            <button type="button" onClick={() => void handleSend({ uploadMode: "teach" })} disabled={pendingAttachments.length === 0 || isTyping} className="px-3 py-1.5 rounded-lg text-white disabled:opacity-40 transition-all cursor-pointer" style={{ fontSize: "0.7rem", background: "linear-gradient(135deg, #FF7541, #B352D7)" }}>
              Teach me from uploads
            </button>
            <button type="button" onClick={() => void handleSend({ uploadMode: "revise" })} disabled={pendingAttachments.length === 0 || isTyping} className="px-3 py-1.5 rounded-lg text-white disabled:opacity-40 transition-all cursor-pointer" style={{ fontSize: "0.7rem", background: "linear-gradient(135deg, #FF7541, #B352D7)" }}>
              Help me revise
            </button>
          </div>
        </div>
      )}

      <div className="px-5 py-4 border-t border-[var(--border)] bg-[var(--card)]">
        <div className="flex items-end gap-2">
          <button onClick={() => setShowUpload(true)} className="w-10 h-10 rounded-xl bg-[var(--accent)] hover:bg-[var(--muted)] flex items-center justify-center transition-colors shrink-0 cursor-pointer" title="Upload file">
            <Paperclip className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={async () => {
              try {
                const items = await navigator.clipboard.read();
                const attachments: ChatAttachment[] = [];
                for (const item of items) {
                  for (const type of item.types) {
                    const blob = await item.getType(type);
                    if (type.startsWith("image/")) {
                      attachments.push({
                        id: `clipboard-read-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                        name: `clipboard-image.${type.split("/")[1] || "png"}`,
                        size: `${Math.round(blob.size / 1024)} KB`,
                        category: "Lecture",
                        mimeType: type,
                        dataUrl: await blobToDataUrl(blob),
                      });
                    } else if (type === "text/plain") {
                      const text = await blob.text();
                      if (text.trim()) {
                        attachments.push({
                          id: `clipboard-text-${Date.now()}`,
                          name: "clipboard-notes.txt",
                          size: `${text.trim().length} chars`,
                          category: "Lecture",
                          mimeType: type,
                          content: text.trim(),
                        });
                      }
                    }
                  }
                }
                if (attachments.length > 0) {
                  await handleFileUpload(attachments);
                  setClipboardHint(`Added ${attachments.length} clipboard item${attachments.length === 1 ? "" : "s"} into the study pipeline.`);
                }
              } catch {
                setClipboardHint("Clipboard access is blocked here. You can still paste directly into the textbox.");
              }
            }}
            className="w-10 h-10 rounded-xl bg-[var(--accent)] hover:bg-[var(--muted)] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            title="Paste from clipboard"
          >
            <ClipboardPaste className="w-4 h-4 text-muted-foreground" />
          </button>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={(event) => { void handleClipboardPaste(event); }}
            placeholder="Ask a question, or paste long notes/screenshots directly here..."
            rows={1}
            className="flex-1 resize-none bg-[var(--input-background)] rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            style={{ fontSize: "0.875rem", minHeight: "44px", maxHeight: "120px" }}
          />
          <button onClick={isListening ? stopVoiceInput : startVoiceInput} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${isListening ? "bg-red-500" : "bg-[var(--accent)] hover:bg-[var(--muted)]"}`} title="Voice input">
            <Mic className={`w-4 h-4 ${isListening ? "text-white" : "text-muted-foreground"}`} />
          </button>
          <button onClick={() => void handleSend()} disabled={(!input.trim() && pendingAttachments.length === 0) || isTyping} className="w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-30 transition-all shrink-0 cursor-pointer" style={{ background: "linear-gradient(135deg, #FF7541, #B352D7)" }}>
            {pendingAttachments.length > 0 ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {([
            { id: "coach", label: "Coach" },
            { id: "oral-quiz", label: "Oral quiz" },
            { id: "roleplay", label: "Roleplay" },
            { id: "interview", label: "Interview" },
          ] as Array<{ id: SessionMode; label: string }>).map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setSessionMode(mode.id)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${sessionMode === mode.id ? "text-white" : "bg-[var(--accent)] text-muted-foreground hover:text-foreground"}`}
              style={sessionMode === mode.id ? { background: "linear-gradient(135deg, #FF7541, #B352D7)", fontSize: "0.7rem" } : { fontSize: "0.7rem" }}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <FileUploadModal open={showUpload} onClose={() => setShowUpload(false)} onUpload={(attachments) => { void handleFileUpload(attachments); }} />
    </div>
  );
}
