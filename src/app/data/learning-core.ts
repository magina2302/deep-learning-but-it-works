import type { ChatAttachment, Module, Subtopic } from "./mock-data";

export type ReviewOutcome = "mastered" | "struggled" | "missed";
export type ConfidenceLabel = "high" | "medium" | "low";

export interface CitationRef {
  sourceName: string;
  snippet?: string;
}

export interface DiagnosticProfile {
  goal: string;
  deadline?: string;
  weeklyStudyMinutes: number;
  baselineConfidence: number;
  knownWeakAreas: string[];
  constraints?: string;
  createdAt: string;
  recommendedFocus: string[];
}

export interface ReviewEvent {
  id: string;
  subtopicId: string;
  subtopicName: string;
  outcome: ReviewOutcome;
  createdAt: string;
  source: "due-review" | "chat" | "quiz" | "diagnostic";
  note: string;
}

export interface MistakeRecord {
  id: string;
  subtopicId: string;
  subtopicName: string;
  createdAt: string;
  severity: "high" | "medium" | "low";
  trigger: string;
  nextStep: string;
}

export interface MasteryBreakdown {
  overall: number;
  retrieval: number;
  recency: number;
  completion: number;
  consistency: number;
  explanation: string[];
}

export interface DueReviewItem {
  moduleId: string;
  moduleName: string;
  subtopicId: string;
  subtopicName: string;
  dueDate: string;
  daysOverdue: number;
  priority: "high" | "medium" | "low";
  reason: string;
}

export interface WeeklyPlanBlock {
  id: string;
  moduleId: string;
  title: string;
  reason: string;
  minutes: number;
  type: "review" | "focus" | "deadline" | "recovery";
}

const stopwords = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "your", "have", "will", "then", "than", "been",
  "using", "used", "over", "under", "when", "what", "where", "which", "while", "their", "there", "after", "before",
  "about", "through", "each", "them", "they", "because", "would", "could", "should", "into", "between", "across",
  "also", "some", "more", "most", "very", "just", "only", "onto", "upon", "such", "other", "like", "need",
  "work", "works", "working", "study", "learning", "module", "topic", "notes", "lecture", "tutorial", "file",
]);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function inferRecommendedFocus(weakAreas: string[], goal: string): string[] {
  const focus = weakAreas.slice(0, 3);
  if (focus.length > 0) return focus;

  const goalWords = goal
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 4 && !stopwords.has(word));

  return goalWords.slice(0, 3).map(capitalizePhrase);
}

function capitalizePhrase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildDiagnosticProfile(input: {
  goal: string;
  deadline?: string;
  weeklyStudyMinutes: number;
  baselineConfidence: number;
  knownWeakAreas: string[];
  constraints?: string;
}): DiagnosticProfile {
  return {
    goal: input.goal.trim(),
    deadline: input.deadline || undefined,
    weeklyStudyMinutes: clamp(Math.round(input.weeklyStudyMinutes || 90), 30, 1200),
    baselineConfidence: clamp(Math.round(input.baselineConfidence || 50), 0, 100),
    knownWeakAreas: input.knownWeakAreas.map((item) => item.trim()).filter(Boolean),
    constraints: input.constraints?.trim() || undefined,
    createdAt: new Date().toISOString(),
    recommendedFocus: inferRecommendedFocus(input.knownWeakAreas, input.goal),
  };
}

function cleanPhrase(value: string): string {
  return value
    .replace(/^\d+[.)-]?\s*/, "")
    .replace(/[_*#>`~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function phraseScore(value: string): number {
  const words = value.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const longWords = words.filter((word) => word.length >= 4 && !stopwords.has(word)).length;
  const titleCaseBonus = /[A-Z]/.test(value) ? 2 : 0;
  return longWords * 2 + titleCaseBonus - Math.abs(words.length - 3);
}

export function extractSubtopicCandidatesFromText(text: string, fallbackTopicName: string): string[] {
  const normalized = text
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/\u2022/g, "\n")
    .replace(/\s+/g, " ")
    .replace(/([.!?])\s+/g, "$1\n");

  const lines = normalized
    .split(/\n+/)
    .map(cleanPhrase)
    .filter((line) => line.length >= 6 && line.length <= 80);

  const candidates = new Map<string, number>();

  for (const line of lines) {
    if (/^(page|figure|table|chapter|section)\b/i.test(line)) continue;
    if (line.split(" ").length > 8) continue;
    candidates.set(line, Math.max(candidates.get(line) || 0, phraseScore(line)));
  }

  const words = normalized
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4 && !stopwords.has(word));

  for (let index = 0; index < words.length - 1; index += 1) {
    const bigram = `${words[index]} ${words[index + 1]}`;
    if (stopwords.has(words[index]) || stopwords.has(words[index + 1])) continue;
    candidates.set(capitalizePhrase(bigram), (candidates.get(capitalizePhrase(bigram)) || 0) + 1);
  }

  const picked = [...candidates.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([name]) => name)
    .filter((name, index, arr) => arr.findIndex((other) => other.toLowerCase() === name.toLowerCase()) === index)
    .slice(0, 8);

  if (picked.length > 0) return picked;
  return [`Foundations of ${fallbackTopicName}`];
}

export function buildSubtopicsFromCandidates(candidates: string[], sourceName?: string): Subtopic[] {
  return candidates.slice(0, 8).map((candidate, index) => ({
    id: makeId(`subtopic-${index}`),
    name: candidate,
    mastery: 25,
    mistakeCount: 0,
    attempts: 0,
    completed: false,
    forgettingRisk: "medium",
    reviewIntervalDays: 1,
    lastReviewedAt: undefined,
    reviewDueAt: new Date().toISOString(),
    reviewHistory: [],
    masteryHistory: [
      {
        recordedAt: new Date().toISOString(),
        score: 25,
        reason: sourceName ? `Created from ${sourceName}` : "Created during onboarding",
      },
    ],
    sourceReferences: sourceName ? [{ sourceName }] : [],
  }));
}

function outcomeScore(outcome: ReviewOutcome): number {
  if (outcome === "mastered") return 100;
  if (outcome === "struggled") return 55;
  return 20;
}

export function computeSubtopicMastery(subtopic: Subtopic, now = new Date()): number {
  const reviewScores = (subtopic.reviewHistory || []).slice(-5).map((event) => outcomeScore(event.outcome));
  const retrieval = reviewScores.length > 0 ? average(reviewScores) : subtopic.mastery || 25;

  const lastReviewedAt = subtopic.lastReviewedAt ? new Date(subtopic.lastReviewedAt) : undefined;
  const daysSinceReview = lastReviewedAt ? Math.max(0, Math.floor((now.getTime() - lastReviewedAt.getTime()) / 86400000)) : 7;
  const recency = clamp(100 - daysSinceReview * 12, 25, 100);
  const attempts = Math.max(1, subtopic.attempts || 0);
  const mistakePenalty = clamp((subtopic.mistakeCount || 0) * 7, 0, 35);
  const consistency = clamp(100 - ((subtopic.mistakeCount || 0) / attempts) * 50, 35, 100);
  const completion = subtopic.completed ? 100 : 45;

  return clamp(Math.round(retrieval * 0.4 + recency * 0.2 + consistency * 0.25 + completion * 0.15 - mistakePenalty), 0, 100);
}

export function computeModuleMasteryBreakdown(module: Module, now = new Date()): MasteryBreakdown {
  const subtopics = module.subtopics || [];
  if (subtopics.length === 0) {
    const baseline = clamp((module.diagnostic?.baselineConfidence || 35) * 0.6, 15, 55);
    return {
      overall: Math.round(baseline),
      retrieval: Math.round(baseline),
      recency: 40,
      completion: 20,
      consistency: 50,
      explanation: [
        "No evidence has been collected yet, so mastery is currently based on diagnostic confidence.",
        "Start a review or upload study material to generate measurable subtopics.",
      ],
    };
  }

  const retrieval = average(subtopics.map((subtopic) => average((subtopic.reviewHistory || []).slice(-4).map((event) => outcomeScore(event.outcome))) || subtopic.mastery || 25));
  const recency = average(subtopics.map((subtopic) => {
    const reviewed = subtopic.lastReviewedAt ? new Date(subtopic.lastReviewedAt) : undefined;
    if (!reviewed) return 35;
    const days = Math.max(0, Math.floor((now.getTime() - reviewed.getTime()) / 86400000));
    return clamp(100 - days * 12, 20, 100);
  }));
  const completion = average(subtopics.map((subtopic) => (subtopic.completed ? 100 : 35)));
  const consistency = average(subtopics.map((subtopic) => {
    const attempts = Math.max(1, subtopic.attempts || 0);
    return clamp(100 - ((subtopic.mistakeCount || 0) / attempts) * 50, 35, 100);
  }));
  const overall = clamp(Math.round(retrieval * 0.38 + recency * 0.17 + completion * 0.17 + consistency * 0.28), 0, 100);

  const weakest = [...subtopics].sort((left, right) => computeSubtopicMastery(left, now) - computeSubtopicMastery(right, now))[0];
  const dueCount = getDueTodayQueue([module], now).length;
  const explanation = [
    `Mastery is evidence-based: retrieval ${Math.round(retrieval)}%, consistency ${Math.round(consistency)}%, completion ${Math.round(completion)}%, recency ${Math.round(recency)}%.`,
    weakest ? `${weakest.name} is the biggest drag on progress because it still has ${weakest.mistakeCount} mistakes recorded.` : "",
    dueCount > 0 ? `${dueCount} review item${dueCount === 1 ? " is" : "s are"} due today, so recent performance can improve quickly.` : "No reviews are due today, so the score is mostly shaped by past evidence.",
  ].filter(Boolean);

  return {
    overall,
    retrieval: Math.round(retrieval),
    recency: Math.round(recency),
    completion: Math.round(completion),
    consistency: Math.round(consistency),
    explanation,
  };
}

export function recordReviewOutcome(module: Module, subtopicId: string, outcome: ReviewOutcome, note: string): Module {
  const now = new Date();
  const updatedSubtopics = module.subtopics.map((subtopic) => {
    if (subtopic.id !== subtopicId) return subtopic;

    const interval = outcome === "mastered"
      ? clamp((subtopic.reviewIntervalDays || 1) * 2, 1, 14)
      : outcome === "struggled"
        ? 1
        : 0;

    const mistakeDelta = outcome === "missed" ? 1 : outcome === "struggled" ? 0.5 : -0.25;
    const nextMistakes = clamp(Math.round((subtopic.mistakeCount || 0) + mistakeDelta), 0, 99);
    const nextAttempts = (subtopic.attempts || 0) + 1;
    const nextCompleted = outcome === "mastered" ? true : subtopic.completed;
    const reviewDueAt = new Date(now.getTime() + Math.max(interval, 0) * 86400000).toISOString();

    const reviewEvent: ReviewEvent = {
      id: makeId("review"),
      subtopicId: subtopic.id,
      subtopicName: subtopic.name,
      outcome,
      createdAt: now.toISOString(),
      source: "due-review",
      note,
    };

    const nextSubtopic: Subtopic = {
      ...subtopic,
      attempts: nextAttempts,
      mistakeCount: nextMistakes,
      completed: nextCompleted,
      lastReviewedAt: now.toISOString(),
      reviewDueAt,
      reviewIntervalDays: Math.max(interval, 1),
      reviewHistory: [...(subtopic.reviewHistory || []), reviewEvent].slice(-12),
      forgettingRisk: outcome === "mastered" ? "low" : outcome === "struggled" ? "medium" : "high",
    };

    const nextScore = computeSubtopicMastery(nextSubtopic, now);
    nextSubtopic.mastery = nextScore;
    nextSubtopic.masteryHistory = [
      ...(subtopic.masteryHistory || []),
      { recordedAt: now.toISOString(), score: nextScore, reason: `${outcome} review: ${note}` },
    ].slice(-20);

    return nextSubtopic;
  });

  const mistakeTarget = updatedSubtopics.find((subtopic) => subtopic.id === subtopicId);
  const mistakeHistory = [...(module.mistakeHistory || [])];
  if (mistakeTarget && outcome !== "mastered") {
    mistakeHistory.unshift({
      id: makeId("mistake"),
      subtopicId,
      subtopicName: mistakeTarget.name,
      createdAt: now.toISOString(),
      severity: outcome === "missed" ? "high" : "medium",
      trigger: note,
      nextStep: outcome === "missed" ? "Redo this item in the due-today queue before starting new material." : "Repeat one guided example, then retest tomorrow.",
    });
  }

  const nextModule = {
    ...module,
    subtopics: updatedSubtopics,
    mistakeHistory: mistakeHistory.slice(0, 40),
    lastStudied: now,
    lastCheckInAt: now.toISOString(),
  } as Module;

  const breakdown = computeModuleMasteryBreakdown(nextModule, now);
  nextModule.overallMastery = breakdown.overall;
  nextModule.masteryBreakdown = breakdown;
  nextModule.statusLabel = getStatusLabelFromMastery(breakdown.overall);
  nextModule.status = getStatusFromMastery(breakdown.overall);
  nextModule.nextActions = buildNextActions(nextModule);
  nextModule.weeklyPlan = buildWeeklyPlanForModule(nextModule);
  return nextModule;
}

export function getStatusFromMastery(mastery: number): Module["status"] {
  if (mastery >= 75) return "on-track";
  if (mastery >= 40) return "needs-review";
  return "inactive";
}

export function getStatusLabelFromMastery(mastery: number): string {
  if (mastery >= 80) return "Evidence says you are ready to level up";
  if (mastery >= 60) return "Momentum is good, but keep reviewing weak spots";
  if (mastery >= 40) return "Understanding is forming; retrieval still needs work";
  return "Foundation is fragile; prioritize reviews before new material";
}

export function getDueTodayQueue(modules: Module[], now = new Date()): DueReviewItem[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const items: DueReviewItem[] = [];

  for (const module of modules) {
    for (const subtopic of module.subtopics || []) {
      if (!subtopic.reviewDueAt) continue;
      const dueTime = new Date(subtopic.reviewDueAt).getTime();
      if (Number.isNaN(dueTime) || dueTime > today + 86399999) continue;
      const daysOverdue = Math.max(0, Math.floor((today - dueTime) / 86400000));
      const priority = daysOverdue >= 2 || subtopic.forgettingRisk === "high"
        ? "high"
        : subtopic.forgettingRisk === "medium" || daysOverdue === 1
          ? "medium"
          : "low";

      items.push({
        moduleId: module.id,
        moduleName: module.name,
        subtopicId: subtopic.id,
        subtopicName: subtopic.name,
        dueDate: subtopic.reviewDueAt,
        daysOverdue,
        priority,
        reason: daysOverdue > 0
          ? `Overdue by ${daysOverdue} day${daysOverdue === 1 ? "" : "s"}`
          : `Due today because its review interval has elapsed`,
      });
    }
  }

  return items.sort((left, right) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[left.priority] - priorityOrder[right.priority] || right.daysOverdue - left.daysOverdue;
  });
}

export function buildWeeklyPlanForModule(module: Module): WeeklyPlanBlock[] {
  const dueItems = getDueTodayQueue([module]);
  const plan: WeeklyPlanBlock[] = [];
  const weeklyMinutes = module.diagnostic?.weeklyStudyMinutes || 90;

  if (dueItems.length > 0) {
    plan.push({
      id: makeId("plan-review"),
      moduleId: module.id,
      title: `Clear ${Math.min(dueItems.length, 3)} due review item${dueItems.length === 1 ? "" : "s"}`,
      reason: `Reviews due today directly improve evidence-based mastery for ${module.name}.`,
      minutes: clamp(dueItems.length * 12, 15, 40),
      type: "review",
    });
  }

  const weakSpot = [...(module.subtopics || [])].sort((left, right) => computeSubtopicMastery(left) - computeSubtopicMastery(right))[0];
  if (weakSpot) {
    plan.push({
      id: makeId("plan-focus"),
      moduleId: module.id,
      title: `Rebuild ${weakSpot.name}`,
      reason: `${weakSpot.name} has the weakest mastery signal in this module.`,
      minutes: clamp(Math.round(weeklyMinutes * 0.35), 20, 60),
      type: "focus",
    });
  }

  if (module.diagnostic?.deadline) {
    const daysLeft = Math.max(0, Math.ceil((new Date(module.diagnostic.deadline).getTime() - Date.now()) / 86400000));
    plan.push({
      id: makeId("plan-deadline"),
      moduleId: module.id,
      title: daysLeft <= 7 ? `Deadline sprint: ${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : `Deadline prep`,
      reason: daysLeft <= 7 ? `Shift time toward retrieval and exam-style practice.` : `Keep steady progress toward your deadline.`,
      minutes: clamp(Math.round(weeklyMinutes * 0.25), 15, 45),
      type: daysLeft <= 7 ? "deadline" : "recovery",
    });
  }

  return plan.slice(0, 4);
}

export function buildNextActions(module: Module): string[] {
  const breakdown = module.masteryBreakdown || computeModuleMasteryBreakdown(module);
  const dueCount = getDueTodayQueue([module]).length;
  const weakest = [...(module.subtopics || [])].sort((left, right) => computeSubtopicMastery(left) - computeSubtopicMastery(right))[0];
  const actions = [
    dueCount > 0 ? `Clear ${dueCount} due review item${dueCount === 1 ? "" : "s"} before starting new content.` : "No due reviews today; use the session to push one weak concept forward.",
    weakest ? `Target ${weakest.name} next because it has the weakest mastery signal.` : "Upload study material or add subtopics to create your first evidence trail.",
    breakdown.recency < 55 ? "Recent evidence is stale. Do one recall check today to refresh your score." : "Recent evidence is healthy; keep reinforcing consistency.",
  ];

  if (module.diagnostic?.deadline) {
    const daysLeft = Math.max(0, Math.ceil((new Date(module.diagnostic.deadline).getTime() - Date.now()) / 86400000));
    actions.push(daysLeft <= 7 ? `Deadline is close (${daysLeft} day${daysLeft === 1 ? "" : "s"}). Switch to exam-style retrieval.` : `Keep pacing toward the deadline in ${daysLeft} days.`);
  }

  return actions.filter(Boolean).slice(0, 4);
}

export function createModuleSummary(module: Module): string {
  const breakdown = module.masteryBreakdown || computeModuleMasteryBreakdown(module);
  const weakSpots = [...(module.subtopics || [])]
    .sort((left, right) => computeSubtopicMastery(left) - computeSubtopicMastery(right))
    .slice(0, 3)
    .map((item) => item.name);

  return [
    `Module: ${module.name}`,
    `Goal: ${module.diagnostic?.goal || "Not set"}`,
    `Mastery: ${breakdown.overall}% (retrieval ${breakdown.retrieval}%, consistency ${breakdown.consistency}%, recency ${breakdown.recency}%, completion ${breakdown.completion}%)`,
    `Weak spots: ${weakSpots.length > 0 ? weakSpots.join(", ") : "None identified yet"}`,
    `Next actions: ${(module.nextActions || buildNextActions(module)).join(" | ")}`,
  ].join("\n");
}

export function attachSourcesToSubtopics(subtopics: Subtopic[], sourceName: string): Subtopic[] {
  return subtopics.map((subtopic) => ({
    ...subtopic,
    sourceReferences: dedupeCitations([...(subtopic.sourceReferences || []), { sourceName }]),
  }));
}

export function dedupeCitations(citations: CitationRef[]): CitationRef[] {
  return citations.filter((citation, index, list) => list.findIndex((other) => other.sourceName === citation.sourceName && other.snippet === citation.snippet) === index);
}

export function mergeExtractedSubtopics(existing: Subtopic[], extractedNames: string[], sourceName: string): Subtopic[] {
  const existingByName = new Map(existing.map((subtopic) => [subtopic.name.toLowerCase(), subtopic]));
  const merged = [...existing];

  for (const name of extractedNames) {
    const key = name.toLowerCase();
    const existingSubtopic = existingByName.get(key);
    if (existingSubtopic) {
      existingSubtopic.sourceReferences = dedupeCitations([...(existingSubtopic.sourceReferences || []), { sourceName }]);
      continue;
    }

    merged.push(...attachSourcesToSubtopics(buildSubtopicsFromCandidates([name]), sourceName));
  }

  return merged.slice(0, 14);
}

export function enrichModuleWithEvidence(module: Module): Module {
  const nextSubtopics = module.subtopics.map((subtopic) => {
    const nextScore = computeSubtopicMastery(subtopic);
    return {
      ...subtopic,
      mastery: nextScore,
    };
  });

  const nextModule = { ...module, subtopics: nextSubtopics } as Module;
  const breakdown = computeModuleMasteryBreakdown(nextModule);
  nextModule.masteryBreakdown = breakdown;
  nextModule.overallMastery = breakdown.overall;
  nextModule.status = getStatusFromMastery(breakdown.overall);
  nextModule.statusLabel = getStatusLabelFromMastery(breakdown.overall);
  nextModule.nextActions = buildNextActions(nextModule);
  nextModule.weeklyPlan = buildWeeklyPlanForModule(nextModule);
  nextModule.dueToday = getDueTodayQueue([nextModule]);
  return nextModule;
}

export function buildModuleFromDiagnostic(baseModule: Module, diagnostic: DiagnosticProfile, onboardingSubtopics: string[]): Module {
  const generated = onboardingSubtopics.length > 0 ? buildSubtopicsFromCandidates(onboardingSubtopics) : baseModule.subtopics;
  const nextModule: Module = {
    ...baseModule,
    diagnostic,
    subtopics: generated,
    mistakeHistory: [],
    accountability: {
      streakDays: 0,
      completedReviewDates: [],
      lastNudgeAt: undefined,
    },
  };

  return enrichModuleWithEvidence(nextModule);
}

export function summarizeAttachmentForSubtopics(attachment: ChatAttachment, moduleName: string): string[] {
  if (attachment.content) {
    return extractSubtopicCandidatesFromText(attachment.content, moduleName);
  }

  const fallback = cleanPhrase(attachment.name.replace(/\.[^.]+$/, ""));
  return fallback ? [fallback] : [`Key ideas from ${moduleName}`];
}
