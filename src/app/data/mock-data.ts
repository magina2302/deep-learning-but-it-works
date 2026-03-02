export interface Subtopic {
  id: string;
  name: string;
  mastery: number;
  mistakeCount: number;
  attempts: number;
  completed: boolean;
  forgettingRisk: "low" | "medium" | "high";
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
}

export interface ChatMessage {
  id: string;
  role: "ai" | "student";
  content: string;
  timestamp: Date;
  attachments?: ChatAttachment[];
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
}

export interface StudentData {
  name: string;
  modules: Module[];
}

const now = new Date();
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

export const defaultModules: Module[] = [];

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