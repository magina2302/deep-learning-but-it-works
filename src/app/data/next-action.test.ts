import { describe, expect, it } from "vitest";
import { decideNextAction, LearningState } from "./next-action";

function baseState(overrides: Partial<LearningState> = {}): LearningState {
  return {
    topicId: "signals",
    daysInactive: 0,
    overallMastery: 55,
    failedAttemptsOnCurrentConcept: 0,
    weakSpot: null,
    ...overrides,
  };
}

describe("decideNextAction", () => {
  it("inactive 8 days -> restart", () => {
    const decision = decideNextAction(baseState({ daysInactive: 8 }));
    expect(decision.action).toBe("restart");
  });

  it("inactive 4 days -> full recap", () => {
    const decision = decideNextAction(baseState({ daysInactive: 4 }));
    expect(decision.action).toBe("full_recap");
  });

  it("inactive 2 days -> quick recap", () => {
    const decision = decideNextAction(baseState({ daysInactive: 2 }));
    expect(decision.action).toBe("quick_recap");
  });

  it("weak spot exists -> loop back", () => {
    const decision = decideNextAction(
      baseState({
        weakSpot: { subtopicId: "laplace-basics", mastery: 42, mistakeCount: 7 },
      }),
    );
    expect(decision.action).toBe("loop_back_weak_spot");
    expect(decision.targetSubtopicId).toBe("laplace-basics");
  });

  it("3 failed attempts -> plateau mode", () => {
    const decision = decideNextAction(baseState({ failedAttemptsOnCurrentConcept: 3 }));
    expect(decision.action).toBe("plateau_mode");
  });

  it("high mastery -> harder problems", () => {
    const decision = decideNextAction(baseState({ overallMastery: 88 }));
    expect(decision.action).toBe("harder_problems");
  });

  it("low mastery -> more practice", () => {
    const decision = decideNextAction(baseState({ overallMastery: 25 }));
    expect(decision.action).toBe("more_practice");
  });

  it("normal state -> continue", () => {
    const decision = decideNextAction(baseState({ overallMastery: 60 }));
    expect(decision.action).toBe("continue");
  });

  it("restart outranks plateau and weak spot", () => {
    const decision = decideNextAction(
      baseState({
        daysInactive: 9,
        failedAttemptsOnCurrentConcept: 5,
        weakSpot: { subtopicId: "fourier", mastery: 30, mistakeCount: 8 },
      }),
    );
    expect(decision.action).toBe("restart");
  });

  it("full recap outranks high mastery", () => {
    const decision = decideNextAction(baseState({ daysInactive: 4, overallMastery: 95 }));
    expect(decision.action).toBe("full_recap");
  });
});