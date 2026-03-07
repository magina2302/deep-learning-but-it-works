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

export const defaultModules: Module[] = [];

export function createDemoModule(): Module {
  const createdAt = new Date();
  const daysAgoDate = (d: number) => new Date(createdAt.getTime() - d * 24 * 60 * 60 * 1000);

  return {
    id: "demo-module",
    name: "Demo: AI & Machine Learning",
    icon: "🧠",
    color: "#B352D7",
    bgColor: "rgba(179,82,215,0.15)",
    borderColor: "rgba(179,82,215,0.3)",
    tags: ["Demo"],
    subtitle: "Comprehensive demo module — use this to test every Gradify feature",
    lastStudied: daysAgoDate(1),
    overallMastery: 52,
    status: "needs-review",
    statusLabel: "Needs review",
    todaysFocus: "Review Neural Networks and practice Gradient Descent calculations",
    topicImportance: 8,
    estimatedTimeToMastery: 200,
    learningSummary: [
      "Solid understanding of supervised vs unsupervised learning.",
      "Struggles with backpropagation chain-rule steps.",
      "Needs more practice on loss function selection and interpretation.",
    ],
    subtopics: [
      {
        id: "demo-sub-1",
        name: "Neural Network Architecture",
        mastery: 74,
        mistakeCount: 3,
        attempts: 6,
        completed: true,
        forgettingRisk: "low",
        reviewIntervalDays: 4,
        lastReviewedAt: daysAgoDate(1).toISOString(),
        reviewDueAt: new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        reviewHistory: [
          { id: crypto.randomUUID(), subtopicId: "demo-sub-1", subtopicName: "Neural Network Architecture", outcome: "pass", createdAt: daysAgoDate(4).toISOString(), source: "quiz" },
          { id: crypto.randomUUID(), subtopicId: "demo-sub-1", subtopicName: "Neural Network Architecture", outcome: "pass", createdAt: daysAgoDate(1).toISOString(), source: "review" },
        ],
        masteryHistory: [
          { recordedAt: daysAgoDate(6).toISOString(), score: 45, reason: "Initial assessment" },
          { recordedAt: daysAgoDate(3).toISOString(), score: 62, reason: "Quiz improvement" },
          { recordedAt: daysAgoDate(1).toISOString(), score: 74, reason: "Consistent correct answers" },
        ],
        sourceReferences: [{ sourceName: "ML Fundamentals Lecture.pdf" }],
      },
      {
        id: "demo-sub-2",
        name: "Gradient Descent & Optimization",
        mastery: 38,
        mistakeCount: 9,
        attempts: 7,
        completed: false,
        forgettingRisk: "high",
        reviewIntervalDays: 1,
        lastReviewedAt: daysAgoDate(3).toISOString(),
        reviewDueAt: daysAgoDate(1).toISOString(),
        reviewHistory: [
          { id: crypto.randomUUID(), subtopicId: "demo-sub-2", subtopicName: "Gradient Descent & Optimization", outcome: "fail", createdAt: daysAgoDate(5).toISOString(), source: "quiz" },
          { id: crypto.randomUUID(), subtopicId: "demo-sub-2", subtopicName: "Gradient Descent & Optimization", outcome: "fail", createdAt: daysAgoDate(3).toISOString(), source: "review" },
        ],
        masteryHistory: [
          { recordedAt: daysAgoDate(7).toISOString(), score: 30, reason: "Initial assessment" },
          { recordedAt: daysAgoDate(3).toISOString(), score: 38, reason: "Slight improvement, still struggling" },
        ],
        sourceReferences: [{ sourceName: "Optimization Methods Tutorial.pdf" }],
      },
      {
        id: "demo-sub-3",
        name: "Loss Functions",
        mastery: 55,
        mistakeCount: 5,
        attempts: 4,
        completed: false,
        forgettingRisk: "medium",
        reviewIntervalDays: 2,
        lastReviewedAt: daysAgoDate(2).toISOString(),
        reviewDueAt: createdAt.toISOString(),
        reviewHistory: [
          { id: crypto.randomUUID(), subtopicId: "demo-sub-3", subtopicName: "Loss Functions", outcome: "pass", createdAt: daysAgoDate(4).toISOString(), source: "quiz" },
          { id: crypto.randomUUID(), subtopicId: "demo-sub-3", subtopicName: "Loss Functions", outcome: "fail", createdAt: daysAgoDate(2).toISOString(), source: "review" },
        ],
        masteryHistory: [
          { recordedAt: daysAgoDate(5).toISOString(), score: 40, reason: "Initial assessment" },
          { recordedAt: daysAgoDate(2).toISOString(), score: 55, reason: "Good on MSE, weak on cross-entropy" },
        ],
        sourceReferences: [{ sourceName: "ML Fundamentals Lecture.pdf" }],
      },
      {
        id: "demo-sub-4",
        name: "Backpropagation",
        mastery: 42,
        mistakeCount: 8,
        attempts: 5,
        completed: false,
        forgettingRisk: "high",
        reviewIntervalDays: 1,
        lastReviewedAt: daysAgoDate(4).toISOString(),
        reviewDueAt: daysAgoDate(2).toISOString(),
        reviewHistory: [
          { id: crypto.randomUUID(), subtopicId: "demo-sub-4", subtopicName: "Backpropagation", outcome: "fail", createdAt: daysAgoDate(4).toISOString(), source: "quiz" },
        ],
        masteryHistory: [
          { recordedAt: daysAgoDate(6).toISOString(), score: 35, reason: "Initial assessment" },
          { recordedAt: daysAgoDate(4).toISOString(), score: 42, reason: "Improving on chain rule but still weak" },
        ],
        sourceReferences: [{ sourceName: "Optimization Methods Tutorial.pdf" }],
      },
    ],
    errorBreakdown: [
      { type: "Calculation", count: 8, color: "#FF7541" },
      { type: "Concept", count: 6, color: "#B352D7" },
      { type: "Notation", count: 4, color: "#6129CC" },
    ],
    chatHistory: [
      {
        id: "demo-chat-1",
        role: "ai",
        content:
          "Welcome to your AI & Machine Learning module! I've set up subtopics based on your study plan. You have 4 areas to cover:\n\n" +
          "1. **Neural Network Architecture** — layers, activations, forward pass\n" +
          "2. **Gradient Descent & Optimization** — SGD, learning rate, convergence\n" +
          "3. **Loss Functions** — MSE, cross-entropy, when to use each\n" +
          "4. **Backpropagation** — chain rule, weight updates\n\n" +
          "What would you like to start with?",
        timestamp: daysAgoDate(6),
      },
      {
        id: "demo-chat-2",
        role: "student",
        content: "Let's start with neural network architecture.",
        timestamp: daysAgoDate(6),
      },
      {
        id: "demo-chat-3",
        role: "ai",
        content:
          "A neural network is made of layers of neurons. Each neuron computes:\n\n" +
          "$z = \\mathbf{w} \\cdot \\mathbf{x} + b$\n\n" +
          "then applies an activation function $a = \\sigma(z)$.\n\n" +
          "Common activations include ReLU: $f(x) = \\max(0, x)$ and sigmoid: $\\sigma(x) = \\frac{1}{1 + e^{-x}}$.\n\n" +
          "**Quick check:** If a hidden layer has 4 neurons and the input has 3 features, how many weights does that layer have (not counting biases)?",
        timestamp: daysAgoDate(6),
        meta: { confidence: "high", confidenceReason: "Foundational concept with well-established definitions", citations: [{ sourceName: "ML Fundamentals Lecture.pdf" }] },
      },
      {
        id: "demo-chat-4",
        role: "student",
        content: "12 weights because each of 4 neurons is connected to all 3 inputs.",
        timestamp: daysAgoDate(5),
      },
      {
        id: "demo-chat-5",
        role: "ai",
        content:
          "Exactly right! $4 \\times 3 = 12$ weights.\n\n" +
          "Now let's look at gradient descent. The idea: we want to minimize a loss function $L(\\theta)$ by updating parameters:\n\n" +
          "$\\theta_{t+1} = \\theta_t - \\eta \\nabla L(\\theta_t)$\n\n" +
          "where $\\eta$ is the learning rate.\n\n" +
          "**Try this:** If $L(w) = (w - 3)^2$, current $w = 7$, and $\\eta = 0.1$, what is $w$ after one gradient step?",
        timestamp: daysAgoDate(5),
        meta: { confidence: "high", citations: [{ sourceName: "Optimization Methods Tutorial.pdf" }] },
      },
    ],
    diagnostic: {
      goal: "Master core ML concepts for the upcoming assessment",
      weeklyStudyMinutes: 150,
      baselineConfidence: 45,
      knownWeakAreas: ["Gradient Descent & Optimization", "Backpropagation"],
      createdAt: daysAgoDate(7).toISOString(),
      recommendedFocus: ["Gradient Descent & Optimization", "Backpropagation", "Loss Functions"],
      deadline: new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
    masteryBreakdown: {
      overall: 52,
      retrieval: 48,
      recency: 55,
      completion: 45,
      consistency: 58,
      explanation: [
        "Gradient descent and backpropagation are significantly weaker than architecture knowledge.",
        "Multiple calculation errors on chain-rule steps are dragging the overall score down.",
      ],
    },
    mistakeHistory: [
      {
        id: "demo-mistake-1",
        subtopicId: "demo-sub-2",
        subtopicName: "Gradient Descent & Optimization",
        createdAt: daysAgoDate(3).toISOString(),
        severity: "high",
        trigger: "Forgot to negate the gradient in the update rule",
        nextStep: "Redo the parameter-update formula from scratch and verify with a 1D example.",
      },
      {
        id: "demo-mistake-2",
        subtopicId: "demo-sub-4",
        subtopicName: "Backpropagation",
        createdAt: daysAgoDate(4).toISOString(),
        severity: "high",
        trigger: "Applied chain rule in wrong order across layers",
        nextStep: "Walk through a 2-layer network backprop by hand, writing each partial derivative explicitly.",
      },
      {
        id: "demo-mistake-3",
        subtopicId: "demo-sub-3",
        subtopicName: "Loss Functions",
        createdAt: daysAgoDate(2).toISOString(),
        severity: "medium",
        trigger: "Confused MSE and cross-entropy use cases",
        nextStep: "List when to use MSE vs cross-entropy with one example each.",
      },
    ],
    nextActions: [
      "Clear the overdue Gradient Descent review — it's 2 days late.",
      "Do one Backpropagation chain-rule walkthrough.",
      "Practice Loss Functions with a short quiz.",
    ],
    weeklyPlan: [],
    dueToday: [
      { subtopicId: "demo-sub-2", subtopicName: "Gradient Descent & Optimization", urgency: 0.9, daysPastDue: 2 },
      { subtopicId: "demo-sub-4", subtopicName: "Backpropagation", urgency: 0.8, daysPastDue: 2 },
      { subtopicId: "demo-sub-3", subtopicName: "Loss Functions", urgency: 0.5, daysPastDue: 0 },
    ],
    accountability: {
      streakDays: 3,
      completedReviewDates: [
        daysAgoDate(3).toISOString(),
        daysAgoDate(2).toISOString(),
        daysAgoDate(1).toISOString(),
      ],
    },
    lastCheckInAt: daysAgoDate(1).toISOString(),
  };
}

/*
 * ─── DEMO MODULE TEST INSTRUCTIONS ───────────────────────────────────
 *
 * Use the "Demo: AI & Machine Learning" module to test every feature:
 *
 * 1. CHAT & TUTOR
 *    - Open the module → type a question → verify AI responds with citations
 *    - Click "Quiz me" → verify MCQ options appear as clickable buttons
 *    - Select an MCQ option → verify your selection is sent as a message
 *
 * 2. SESSION MODES
 *    - Switch to Coach / Roleplay / Interview → send a message → verify tone changes
 *
 * 3. FILE UPLOAD & SUBTOPIC EXTRACTION
 *    - Click the paperclip → upload a PDF or image → choose a category
 *    - Click "Generate subtopics" → verify new subtopics appear in metrics
 *    - Click "Quiz me from uploads" → verify quiz is based on uploaded content
 *    - Click "Teach me from uploads" → verify explanatory response
 *    - Click "Help me revise" → verify revision summary
 *
 * 4. CLIPBOARD PASTE
 *    - Copy an image or text → click the clipboard button or paste into textarea
 *    - Verify attachment appears in the pending bar
 *
 * 5. STUDY PLAN GENERATION
 *    - In the Metrics panel → click "Generate study plan" → enter minutes (e.g. 90)
 *    - Verify a dynamic plan is generated using the module's subtopics
 *    - Verify items have correct Focus/Strengthen/Quiz/Recap labels
 *
 * 6. MASTERY & METRICS
 *    - Check the mastery breakdown panel → verify Retrieval, Consistency, Recency, Completion
 *    - Check "Today's Focus" shows due reviews (Gradient Descent, Backpropagation)
 *    - Check mistake history shows 3 recorded mistakes
 *    - Check the next actions list
 *
 * 7. WEEKLY PLAN BLOCKS
 *    - Generate a study plan → verify blocks appear in the weekly plan section
 *    - Mark blocks as complete → verify state persists
 *
 * 8. RECOVERY QUIZ (INACTIVITY)
 *    - To test: temporarily set lastStudied to >5 days ago in the module data
 *    - Verify the recovery quiz prompt fires automatically on module open
 *
 * 9. DASHBOARD
 *    - Navigate to Dashboard → verify the demo module card appears
 *    - Check due-queue preview, learning model panel, intervention board
 *    - Check analytics tab with streak, mastery history
 *
 * 10. PERSONA EDITOR
 *     - Click the settings gear in chat → change explanation style / pace / tone
 *     - Send a message → verify the tutor adapts
 *
 * 11. DELETE MODULE
 *     - Delete the demo module → verify it reappears on refresh (demo modules auto-restore)
 *
 * ─────────────────────────────────────────────────────────────────────
 */

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

