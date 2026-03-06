import type {
  CitationRef,
  ConfidenceLabel,
  DiagnosticProfile,
  DueReviewItem,
  MasteryBreakdown,
  MistakeRecord,
  ReviewEvent,
  WeeklyPlanBlock,
} from "./learning-core";

export interface Subtopic {
  id: string;
  name: string;
  mastery: number;
  mistakeCount: number;
  attempts: number;
  completed: boolean;
  forgettingRisk: "low" | "medium" | "high";
  reviewIntervalDays?: number;
  lastReviewedAt?: string;
  reviewDueAt?: string;
  reviewHistory?: ReviewEvent[];
  masteryHistory?: Array<{
    recordedAt: string;
    score: number;
    reason: string;
  }>;
  sourceReferences?: CitationRef[];
}

export interface ErrorBreakdown {
  type: string;
  count: number;
  color: string;
}

export interface ChatAttachment {
  id: string;
  name: string;
  size: string;
  category: "Lecture" | "PYP" | "Tutorial" | "Labs";
  mimeType?: string;
  content?: string;
  dataUrl?: string;
}

export interface AiMessageMeta {
  confidence?: ConfidenceLabel;
  confidenceReason?: string;
  citations?: CitationRef[];
  mode?: string;
}

export interface ChatMessage {
  id: string;
  role: "ai" | "student";
  content: string;
  timestamp: Date;
  attachments?: ChatAttachment[];
  meta?: AiMessageMeta;
}

export interface Module {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  tags: string[];
  subtitle: string;
  lastStudied: Date;
  overallMastery: number;
  status: "on-track" | "needs-review" | "inactive";
  statusLabel: string;
  todaysFocus: string;
  subtopics: Subtopic[];
  chatHistory: ChatMessage[];
  errorBreakdown: ErrorBreakdown[];
  topicImportance: number;
  estimatedTimeToMastery: number;
  learningSummary: string[];
  diagnostic?: DiagnosticProfile;
  masteryBreakdown?: MasteryBreakdown;
  mistakeHistory?: MistakeRecord[];
  weeklyPlan?: WeeklyPlanBlock[];
  nextActions?: string[];
  dueToday?: DueReviewItem[];
  accountability?: {
    streakDays: number;
    completedReviewDates: string[];
    lastNudgeAt?: string;
  };
  lastCheckInAt?: string;
}

export interface StudentData {
  name: string;
  modules: Module[];
}

const now = new Date();
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

export const defaultModules: Module[] = [];

export function createMockModuleWithHistory(): Module {
  const createdAt = new Date();

  return {
    id: "mock-module-chat-history",
    name: "Mock: Signals & Systems",
    icon: "📡",
    color: "#B352D7",
    bgColor: "rgba(179,82,215,0.15)",
    borderColor: "rgba(179,82,215,0.3)",
    tags: ["Mock", "Verification"],
    subtitle: "Use this module to verify chat + mastery persistence",
    lastStudied: createdAt,
    overallMastery: 62,
    status: "on-track",
    statusLabel: "Steady progress",
    todaysFocus: "Practice convolution and step-response interpretation",
    topicImportance: 7,
    estimatedTimeToMastery: 160,
    learningSummary: [
      "Understands basic signal classifications.",
      "Can compute simple convolutions with guidance.",
      "Still mixing up causal vs non-causal systems in edge cases.",
    ],
    subtopics: [
      {
        id: "mock-subtopic-1",
        name: "Signal Properties",
        mastery: 72,
        mistakeCount: 2,
        attempts: 4,
        completed: true,
        forgettingRisk: "low",
        reviewIntervalDays: 3,
        lastReviewedAt: new Date(createdAt.getTime() - 1000 * 60 * 60 * 24).toISOString(),
        reviewDueAt: new Date(createdAt.getTime() + 1000 * 60 * 60 * 24).toISOString(),
        reviewHistory: [],
        masteryHistory: [],
        sourceReferences: [{ sourceName: "Signals and Systems Notes.pdf" }],
      },
      {
        id: "mock-subtopic-2",
        name: "Convolution",
        mastery: 58,
        mistakeCount: 6,
        attempts: 5,
        completed: false,
        forgettingRisk: "medium",
        reviewIntervalDays: 1,
        lastReviewedAt: new Date(createdAt.getTime() - 1000 * 60 * 60 * 24 * 2).toISOString(),
        reviewDueAt: new Date(createdAt.getTime() - 1000 * 60 * 60 * 8).toISOString(),
        reviewHistory: [],
        masteryHistory: [],
        sourceReferences: [{ sourceName: "Signals and Systems Notes.pdf" }],
      },
      {
        id: "mock-subtopic-3",
        name: "LTI System Response",
        mastery: 54,
        mistakeCount: 5,
        attempts: 3,
        completed: false,
        forgettingRisk: "medium",
        reviewIntervalDays: 2,
        lastReviewedAt: new Date(createdAt.getTime() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        reviewDueAt: new Date(createdAt.getTime() - 1000 * 60 * 60 * 24).toISOString(),
        reviewHistory: [],
        masteryHistory: [],
        sourceReferences: [{ sourceName: "Signals and Systems Tutorial.pdf" }],
      },
    ],
    errorBreakdown: [
      { type: "Calculation", count: 5, color: "#FF7541" },
      { type: "Concept", count: 3, color: "#B352D7" },
      { type: "Notation", count: 2, color: "#6129CC" },
    ],
    chatHistory: [
      {
        id: "mock-chat-1",
        role: "ai",
        content: "Welcome back! Last time you were working on convolution. Want a quick recap or a challenge question?",
        timestamp: new Date(createdAt.getTime() - 1000 * 60 * 35),
      },
      {
        id: "mock-chat-2",
        role: "student",
        content: "Quick recap first — I still confuse the overlap boundaries.",
        timestamp: new Date(createdAt.getTime() - 1000 * 60 * 33),
      },
      {
        id: "mock-chat-3",
        role: "ai",
        content: "Great call. Think in three steps: flip, shift, multiply-integrate. For overlap limits, ask: where are both signals non-zero at the same time?",
        timestamp: new Date(createdAt.getTime() - 1000 * 60 * 31),
      },
      {
        id: "mock-chat-4",
        role: "student",
        content: "Got it. Give me one more practice prompt.",
        timestamp: new Date(createdAt.getTime() - 1000 * 60 * 29),
      },
      {
        id: "mock-chat-5",
        role: "ai",
        content: "Try this: x(t)=u(t)-u(t-2), h(t)=u(t). Compute y(t)=x*h and describe each interval clearly.",
        timestamp: new Date(createdAt.getTime() - 1000 * 60 * 27),
      },
    ],
    diagnostic: {
      goal: "Be exam-ready for the upcoming Signals and Systems assessment",
      weeklyStudyMinutes: 180,
      baselineConfidence: 58,
      knownWeakAreas: ["Convolution", "LTI system response"],
      createdAt: createdAt.toISOString(),
      recommendedFocus: ["Convolution", "LTI system response"],
      deadline: new Date(createdAt.getTime() + 1000 * 60 * 60 * 24 * 12).toISOString(),
    },
    masteryBreakdown: {
      overall: 62,
      retrieval: 60,
      recency: 68,
      completion: 56,
      consistency: 63,
      explanation: [
        "Recent evidence is solid, but repeated convolution mistakes are still holding the score back.",
      ],
    },
    mistakeHistory: [
      {
        id: "mock-mistake-1",
        subtopicId: "mock-subtopic-2",
        subtopicName: "Convolution",
        createdAt: new Date(createdAt.getTime() - 1000 * 60 * 60 * 24).toISOString(),
        severity: "high",
        trigger: "Mixed up overlap boundaries in a recall question",
        nextStep: "Redo one graph-based convolution question before moving on.",
      },
    ],
    nextActions: [
      "Clear the overdue Convolution review first.",
      "Do one timed LTI response question after the review.",
    ],
    weeklyPlan: [],
    dueToday: [],
    accountability: {
      streakDays: 2,
      completedReviewDates: [new Date(createdAt.getTime() - 1000 * 60 * 60 * 24).toISOString()],
    },
    lastCheckInAt: createdAt.toISOString(),
  };
}

export function getDaysInactive(lastStudied: Date): number {
  const now = new Date();
  return Math.floor((now.getTime() - lastStudied.getTime()) / (1000 * 60 * 60 * 24));
}

export function getInactivityLabel(days: number): string {
  if (days === 0) return "Studied today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function getWeakSpots(subtopics: Subtopic[]): Subtopic[] {
  return subtopics.filter((s) => s.mistakeCount >= 5 && s.mastery < 60).sort((a, b) => a.mastery - b.mastery);
}

const moduleColors = [
  { color: "#FF7541", bgColor: "rgba(255,117,65,0.15)", borderColor: "rgba(255,117,65,0.3)" },
  { color: "#B352D7", bgColor: "rgba(179,82,215,0.15)", borderColor: "rgba(179,82,215,0.3)" },
  { color: "#DE6AE4", bgColor: "rgba(222,106,228,0.15)", borderColor: "rgba(222,106,228,0.3)" },
  { color: "#6129CC", bgColor: "rgba(97,41,204,0.15)", borderColor: "rgba(97,41,204,0.3)" },
  { color: "#38bdf8", bgColor: "rgba(56,189,248,0.15)", borderColor: "rgba(56,189,248,0.3)" },
  { color: "#10b981", bgColor: "rgba(16,185,129,0.15)", borderColor: "rgba(16,185,129,0.3)" },
];

const moduleIcons = ["📚", "🧪", "🔬", "📐", "🎯", "🧠", "💡", "📊", "🔧", "🌐"];

export function createNewModule(name: string, subtitle: string, tags: string[], existingId?: string): Module {
  const colorSet = moduleColors[Math.floor(Math.random() * moduleColors.length)];
  const icon = moduleIcons[Math.floor(Math.random() * moduleIcons.length)];
  return {
    id: existingId || `mod-${Date.now()}`,
    name,
    icon,
    ...colorSet,
    tags,
    subtitle,
    lastStudied: new Date(),
    overallMastery: 0,
    status: "on-track",
    statusLabel: "Just started",
    todaysFocus: `Start learning ${name}`,
    topicImportance: 5,
    estimatedTimeToMastery: 300,
    learningSummary: ["No progress yet — start your first session to begin tracking."],
    subtopics: [],
    errorBreakdown: [],
    chatHistory: [
      {
        id: `welcome-${Date.now()}`,
        role: "ai",
        content: `Welcome to ${name}! I'm your AI tutor for this module. Let's get started — what would you like to learn first?`,
        timestamp: new Date(),
      },
    ],
    diagnostic: undefined,
    masteryBreakdown: {
      overall: 0,
      retrieval: 0,
      recency: 0,
      completion: 0,
      consistency: 0,
      explanation: ["No learning evidence yet. Complete diagnostic setup to personalize this module."],
    },
    mistakeHistory: [],
    nextActions: ["Complete module setup so Gradify can build your study plan."],
    weeklyPlan: [],
    dueToday: [],
    accountability: {
      streakDays: 0,
      completedReviewDates: [],
    },
    lastCheckInAt: undefined,
  };
}

export function generateAIResponse(module: Module, userMessage: string): string {
  const weakSpots = getWeakSpots(module.subtopics);
  const currentSubtopic = module.subtopics.find((s) => !s.completed) || module.subtopics[module.subtopics.length - 1];

  if (!currentSubtopic) {
    return "Great question! Since we're just getting started with this module, let me help you explore the fundamentals. What specific area interests you most?";
  }

  if (currentSubtopic.attempts >= 3 && currentSubtopic.mastery < 40) {
    const responses = [
      `I can see ${currentSubtopic.name} has been tricky. Let me try a completely different approach. Instead of the formal definition, think of it like this...`,
      `Let's take a step back from ${currentSubtopic.name}. Sometimes a different analogy helps. Imagine you're...`,
      `I notice you've been working hard on ${currentSubtopic.name}. Let me break it down into smaller pieces that might click better.`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  if (weakSpots.length > 0) {
    return `Before we continue, I noticed you've been having trouble with ${weakSpots[0].name}. Let me loop back to that with a quick exercise to strengthen your understanding.`;
  }

  if (module.overallMastery > 75) {
    return `Great response! You clearly have a strong grasp. Let me challenge you with something harder — here's a problem that combines ${currentSubtopic.name} with what you learned earlier.`;
  }

  if (module.overallMastery < 40) {
    return `Good effort! Let's make sure we really nail this concept before moving on. Here's another practice question on ${currentSubtopic.name} — take your time with it.`;
  }

  const responses = [
    `Good thinking! Let me build on that. For ${currentSubtopic.name}, the key insight is...`,
    `That's a solid answer. Let me give you a follow-up question to deepen your understanding of ${currentSubtopic.name}.`,
    `Nice work! You're making good progress on ${currentSubtopic.name}. Let's try applying this concept to a slightly different scenario.`,
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

export function createInactiveReminderModule(): Module {
  const lastStudied = daysAgo(5);

  return {
    id: "mock-module-inactive-5-days",
    name: "Mock: Control Systems Review",
    icon: "🛰️",
    color: "#FF7541",
    bgColor: "rgba(255,117,65,0.15)",
    borderColor: "rgba(255,117,65,0.3)",
    tags: ["Mock", "Inactivity Reminder"],
    subtitle: "Tracked as not studied for 5 days",
    lastStudied,
    overallMastery: 43,
    status: "inactive",
    statusLabel: "5 days inactive",
    todaysFocus: "Quick control-systems quiz to reactivate recall",
    topicImportance: 8,
    estimatedTimeToMastery: 210,
    learningSummary: [
      "Can model first-order systems but needs more confidence with transient analysis.",
      "Makes recurring mistakes around steady-state error interpretation.",
      "Best recovery path is a short diagnostic quiz and targeted revision.",
    ],
    subtopics: [
      {
        id: "inactive-subtopic-1",
        name: "Time Response",
        mastery: 46,
        mistakeCount: 7,
        attempts: 5,
        completed: false,
        forgettingRisk: "high",
        reviewIntervalDays: 1,
        lastReviewedAt: new Date(lastStudied.getTime() - 1000 * 60 * 60 * 24).toISOString(),
        reviewDueAt: lastStudied.toISOString(),
        reviewHistory: [],
        masteryHistory: [],
        sourceReferences: [{ sourceName: "Control Systems Notes.pdf" }],
      },
      {
        id: "inactive-subtopic-2",
        name: "Stability Criteria",
        mastery: 41,
        mistakeCount: 6,
        attempts: 4,
        completed: false,
        forgettingRisk: "high",
        reviewIntervalDays: 1,
        lastReviewedAt: new Date(lastStudied.getTime() - 1000 * 60 * 60 * 48).toISOString(),
        reviewDueAt: lastStudied.toISOString(),
        reviewHistory: [],
        masteryHistory: [],
        sourceReferences: [{ sourceName: "Control Systems Revision.pdf" }],
      },
    ],
    errorBreakdown: [
      { type: "Concept", count: 5, color: "#FF7541" },
      { type: "Calculation", count: 4, color: "#B352D7" },
      { type: "Notation", count: 2, color: "#6129CC" },
    ],
    chatHistory: [
      {
        id: "inactive-chat-1",
        role: "ai",
        content: "You have not studied this module for 5 days. Want to do a quick recovery quiz now?",
        timestamp: new Date(lastStudied.getTime() + 1000 * 60 * 3),
      },
    ],
    diagnostic: {
      goal: "Recover enough confidence to restart control systems revision",
      weeklyStudyMinutes: 120,
      baselineConfidence: 40,
      knownWeakAreas: ["Time Response", "Stability Criteria"],
      createdAt: lastStudied.toISOString(),
      recommendedFocus: ["Time Response", "Stability Criteria"],
    },
    masteryBreakdown: {
      overall: 43,
      retrieval: 38,
      recency: 20,
      completion: 35,
      consistency: 49,
      explanation: ["Evidence is stale and both subtopics are overdue for review."],
    },
    mistakeHistory: [
      {
        id: "inactive-mistake-1",
        subtopicId: "inactive-subtopic-1",
        subtopicName: "Time Response",
        createdAt: lastStudied.toISOString(),
        severity: "high",
        trigger: "Forgot how to interpret transient response graphs after inactivity",
        nextStep: "Take a recovery quiz before doing new examples.",
      },
    ],
    nextActions: ["Take the recovery quiz.", "Revisit the weakest control-systems graph question."],
    weeklyPlan: [],
    dueToday: [],
    accountability: {
      streakDays: 0,
      completedReviewDates: [],
      lastNudgeAt: lastStudied.toISOString(),
    },
    lastCheckInAt: lastStudied.toISOString(),
  };
}