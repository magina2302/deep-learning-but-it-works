export type NextActionType =
  | "restart"
  | "full_recap"
  | "quick_recap"
  | "plateau_mode"
  | "loop_back_weak_spot"
  | "harder_problems"
  | "more_practice"
  | "continue";

export interface WeakSpot {
  subtopicId: string;
  mastery: number;
  mistakeCount: number;
}

export interface LearningState {
  topicId: string;
  daysInactive: number;
  overallMastery: number;
  failedAttemptsOnCurrentConcept: number;
  weakSpot?: WeakSpot | null;
}

export interface NextActionDecision {
  action: NextActionType;
  reason: string;
  topicId: string;
  targetSubtopicId?: string;
}

const HIGH_MASTERY_THRESHOLD = 75;
const LOW_MASTERY_THRESHOLD = 40;

export function decideNextAction(state: LearningState): NextActionDecision {
  if (state.daysInactive >= 7) {
    return {
      action: "restart",
      reason: "Inactive for 7+ days, so fundamentals should be reintroduced.",
      topicId: state.topicId,
    };
  }

  if (state.daysInactive >= 3) {
    return {
      action: "full_recap",
      reason: "Inactive for 3-6 days, so a full recap is required before continuing.",
      topicId: state.topicId,
    };
  }

  if (state.failedAttemptsOnCurrentConcept >= 3) {
    return {
      action: "plateau_mode",
      reason: "3+ failed attempts detected, so explanation style should switch.",
      topicId: state.topicId,
    };
  }

  if (state.weakSpot) {
    return {
      action: "loop_back_weak_spot",
      reason: "A weak spot exists, so loop back before introducing new content.",
      topicId: state.topicId,
      targetSubtopicId: state.weakSpot.subtopicId,
    };
  }

  if (state.daysInactive >= 1) {
    return {
      action: "quick_recap",
      reason: "Inactive for 1-2 days, so start with a quick recap quiz.",
      topicId: state.topicId,
    };
  }

  if (state.overallMastery >= HIGH_MASTERY_THRESHOLD) {
    return {
      action: "harder_problems",
      reason: "High mastery detected, so progression can speed up.",
      topicId: state.topicId,
    };
  }

  if (state.overallMastery < LOW_MASTERY_THRESHOLD) {
    return {
      action: "more_practice",
      reason: "Low mastery detected, so add more guided practice.",
      topicId: state.topicId,
    };
  }

  return {
    action: "continue",
    reason: "Student is on track, so continue with the current concept flow.",
    topicId: state.topicId,
  };
}

export function parseLearningStateFromQuery(topicId: string, query: URLSearchParams): LearningState {
  const daysInactive = Number(query.get("daysInactive") ?? "0");
  const overallMastery = Number(query.get("overallMastery") ?? "50");
  const failedAttemptsOnCurrentConcept = Number(query.get("failedAttempts") ?? "0");

  const weakSpotSubtopicId = query.get("weakSpotSubtopicId");
  const weakSpotMastery = Number(query.get("weakSpotMastery") ?? "0");
  const weakSpotMistakeCount = Number(query.get("weakSpotMistakeCount") ?? "0");

  return {
    topicId,
    daysInactive: Number.isFinite(daysInactive) ? daysInactive : 0,
    overallMastery: Number.isFinite(overallMastery) ? overallMastery : 50,
    failedAttemptsOnCurrentConcept: Number.isFinite(failedAttemptsOnCurrentConcept)
      ? failedAttemptsOnCurrentConcept
      : 0,
    weakSpot: weakSpotSubtopicId
      ? {
          subtopicId: weakSpotSubtopicId,
          mastery: Number.isFinite(weakSpotMastery) ? weakSpotMastery : 0,
          mistakeCount: Number.isFinite(weakSpotMistakeCount) ? weakSpotMistakeCount : 0,
        }
      : null,
  };
}