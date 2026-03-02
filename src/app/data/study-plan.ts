import { Module, Subtopic } from "./mock-data";

export type StudyPlanStatus = "needs-work" | "developing" | "strong" | "break";

export interface StudyPlanItem {
  id: string;
  title: string;
  description: string;
  minutes: number;
  status: StudyPlanStatus;
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function statusFromMastery(mastery: number): Exclude<StudyPlanStatus, "break"> {
  if (mastery < 50) return "needs-work";
  if (mastery < 80) return "developing";
  return "strong";
}

function titleForSubtopic(name: string, status: Exclude<StudyPlanStatus, "break">, mode: "study" | "quiz" | "recap"): string {
  if (mode === "quiz") return `Quiz — ${name}`;
  if (mode === "recap") return `Recap — ${name}`;
  if (status === "needs-work") return `Focus — ${name}`;
  if (status === "developing") return `Strengthen — ${name}`;
  return `Advance — ${name}`;
}

function descriptionForSubtopic(subtopic: Subtopic, mode: "study" | "quiz" | "recap"): string {
  if (mode === "quiz") {
    return `Do targeted questions on ${subtopic.name}. Prioritize the patterns behind mistakes and explain each answer briefly.`;
  }

  if (mode === "recap") {
    return `Summarize ${subtopic.name} in your own words, then solve one short check problem to confirm retention.`;
  }

  if (subtopic.mastery < 50) {
    return `Rebuild fundamentals for ${subtopic.name}. Work step by step through weak areas and correct ${subtopic.mistakeCount} common mistakes.`;
  }

  if (subtopic.mastery < 80) {
    return `Reinforce ${subtopic.name} with medium-difficulty practice and brief reflection on where confusion appears.`;
  }

  return `Push ${subtopic.name} with one harder problem and verify your reasoning, not just the final answer.`;
}

function distributeMinutes(total: number, includeBreak: boolean): { coreA: number; coreB: number; quiz: number; recap: number; breakMinutes: number } {
  const breakMinutes = includeBreak ? Math.max(8, Math.round(total * 0.12)) : 0;
  const focused = total - breakMinutes;

  const coreA = Math.max(12, Math.round(focused * 0.38));
  const coreB = Math.max(10, Math.round(focused * 0.24));
  const quiz = Math.max(8, Math.round(focused * 0.22));
  const recap = Math.max(6, focused - coreA - coreB - quiz);

  const adjustedRecap = focused - coreA - coreB - quiz;

  return {
    coreA,
    coreB,
    quiz,
    recap: Math.max(6, adjustedRecap),
    breakMinutes,
  };
}

function pickTopSubtopics(module: Module): Subtopic[] {
  if (module.subtopics.length === 0) return [];

  const moduleSeed = hashString(module.id || module.name);

  return [...module.subtopics]
    .sort((left, right) => {
      const leftScore = (100 - left.mastery) + left.mistakeCount * 4 + left.attempts * 2 + ((moduleSeed ^ hashString(left.id)) % 7);
      const rightScore = (100 - right.mastery) + right.mistakeCount * 4 + right.attempts * 2 + ((moduleSeed ^ hashString(right.id)) % 7);
      return rightScore - leftScore;
    })
    .slice(0, 3);
}

function getSignalsAndSystemsPreset(module: Module): StudyPlanItem[] {
  return [
    {
      id: `${module.id}-preset-1`,
      title: "Ultrasonic Sensor",
      description: "You've made 11 mistakes here — mostly on distance calculation formulas. This needs the most attention. We will review the core concepts and work through the tricky parts step by step.",
      minutes: 31,
      status: "needs-work",
    },
    {
      id: `${module.id}-preset-2`,
      title: "IR Sensor & Temperature Sensor",
      description: "You have a solid grasp on both IR and Temperature sensors. Spend only about 10 minutes here to recap the key points and make sure nothing slips.",
      minutes: 18,
      status: "developing",
    },
    {
      id: `${module.id}-preset-break`,
      title: "Break",
      description: "Step away from your screen, stretch, grab some water. Your brain needs this to consolidate what you just studied.",
      minutes: 10,
      status: "break",
    },
    {
      id: `${module.id}-preset-3`,
      title: "Quiz — Complementary & Kalman Filters",
      description: "We noticed you scored lower on filter concepts — your mastery for Kalman Filter is at 38% and you got 9 questions wrong in your last session on this. This quiz will target exactly those gaps. No notes allowed.",
      minutes: 23,
      status: "needs-work",
    },
    {
      id: `${module.id}-preset-4`,
      title: "Quiz Recap & Clarification",
      description: "Go through your quiz answers and clarify anything you got wrong. Reinforce the correct understanding before your next session.",
      minutes: 18,
      status: "developing",
    },
  ];
}

export function recommendStudyPlan(module: Module, requestedMinutes: number): StudyPlanItem[] {
  if (module.id === "mock-module-chat-history" || module.name === "Mock: Signals & Systems") {
    return getSignalsAndSystemsPreset(module);
  }

  const totalMinutes = Math.min(180, Math.max(30, Math.round(requestedMinutes || 90)));
  const includeBreak = totalMinutes >= 60;
  const split = distributeMinutes(totalMinutes, includeBreak);
  const picked = pickTopSubtopics(module);

  if (picked.length === 0) {
    const baseTitle = module.name;
    const genericItems: StudyPlanItem[] = [
      {
        id: `${module.id}-focus`,
        title: `Focus — ${baseTitle}`,
        description: `Revisit the core concepts in ${baseTitle} and write a quick summary of key formulas and definitions.`,
        minutes: split.coreA + Math.round(split.coreB / 2),
        status: "developing",
      },
      {
        id: `${module.id}-quiz`,
        title: `Quiz — ${baseTitle}`,
        description: `Attempt 5-8 short questions on ${baseTitle}. Check each mistake immediately and note why it happened.`,
        minutes: split.quiz,
        status: "developing",
      },
    ];

    if (includeBreak) {
      genericItems.push({
        id: `${module.id}-break`,
        title: "Break",
        description: "Take a short break: move away from the screen, hydrate, and reset attention.",
        minutes: split.breakMinutes,
        status: "break",
      });
    }

    genericItems.push({
      id: `${module.id}-recap`,
      title: `Recap — ${baseTitle}`,
      description: `Close with a rapid recap and one final check question to lock in what you learned.`,
      minutes: split.recap + Math.floor(split.coreB / 2),
      status: "developing",
    });

    return genericItems;
  }

  const primary = picked[0];
  const secondary = picked[1] || picked[0];
  const quizTarget = picked[2] || secondary;

  const plan: StudyPlanItem[] = [
    {
      id: `${module.id}-${primary.id}-study`,
      title: titleForSubtopic(primary.name, statusFromMastery(primary.mastery), "study"),
      description: descriptionForSubtopic(primary, "study"),
      minutes: split.coreA,
      status: statusFromMastery(primary.mastery),
    },
    {
      id: `${module.id}-${secondary.id}-study`,
      title: titleForSubtopic(secondary.name, statusFromMastery(secondary.mastery), "study"),
      description: descriptionForSubtopic(secondary, "study"),
      minutes: split.coreB,
      status: statusFromMastery(secondary.mastery),
    },
  ];

  if (includeBreak) {
    plan.push({
      id: `${module.id}-break`,
      title: "Break",
      description: "Step away briefly and reset before the high-focus quiz segment.",
      minutes: split.breakMinutes,
      status: "break",
    });
  }

  plan.push(
    {
      id: `${module.id}-${quizTarget.id}-quiz`,
      title: titleForSubtopic(quizTarget.name, statusFromMastery(quizTarget.mastery), "quiz"),
      description: descriptionForSubtopic(quizTarget, "quiz"),
      minutes: split.quiz,
      status: statusFromMastery(quizTarget.mastery),
    },
    {
      id: `${module.id}-${primary.id}-recap`,
      title: titleForSubtopic(primary.name, statusFromMastery(primary.mastery), "recap"),
      description: descriptionForSubtopic(primary, "recap"),
      minutes: split.recap,
      status: statusFromMastery(primary.mastery),
    }
  );

  return plan;
}
