import { Subtopic } from "./mock-data";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LOW_MASTERY_THRESHOLD = 60;

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function getDaysInactive(lastStudied: Date, now: Date = new Date()): number {
  const nowStart = startOfDay(now).getTime();
  const lastStart = startOfDay(lastStudied).getTime();
  return Math.max(0, Math.floor((nowStart - lastStart) / MS_PER_DAY));
}

export function computeOverallMastery(subtopics: Subtopic[], fallback = 0): number {
  if (subtopics.length === 0) return fallback;
  const total = subtopics.reduce((sum, s) => sum + s.mastery, 0);
  return Math.round(total / subtopics.length);
}

export function getWeakSpots(subtopics: Subtopic[]): Subtopic[] {
  return subtopics
    .filter((s) => s.mistakeCount >= 5 && s.mastery < 60)
    .sort((a, b) => a.mastery - b.mastery);
}

export function computeStatus(
  lastStudied: Date,
  overallMastery: number,
  weakSpots: Subtopic[],
): { status: "on-track" | "needs-review" | "inactive"; statusLabel: string } {
  const inactiveDays = getDaysInactive(lastStudied);

  if (inactiveDays > 0) {
    return {
      status: "inactive",
      statusLabel: `Inactive ${inactiveDays} ${inactiveDays === 1 ? "day" : "days"}`,
    };
  }

  if (weakSpots.length > 0 || overallMastery < LOW_MASTERY_THRESHOLD) {
    return { status: "needs-review", statusLabel: "Needs review" };
  }

  return { status: "on-track", statusLabel: "On track" };
}

export function computeNextStreak(lastStudied: Date | null, currentStreak: number, now: Date = new Date()): number {
  if (!lastStudied) return 1;

  const inactiveDays = getDaysInactive(lastStudied, now);
  if (inactiveDays === 0) return Math.max(currentStreak, 1);
  if (inactiveDays === 1) return Math.max(currentStreak, 0) + 1;
  return 1;
}
