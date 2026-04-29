// Helpers to compute today's goal progress from the analytics store.

import type { AttemptEvent, PaperEvent } from "@/stores/useAnalyticsStore";
import { isPaperPassForGoal, dayKeyFor } from "@/stores/useDailyGoalsStore";

function isOnDay(ts: number, day: string): boolean {
  return dayKeyFor(new Date(ts)) === day;
}

export function todaysCorrect(attempts: AttemptEvent[], day = dayKeyFor()): number {
  return attempts.filter((a) => a.isCorrect && isOnDay(a.ts, day)).length;
}

export function todaysPassedPapers(papers: PaperEvent[], day = dayKeyFor()): number {
  return papers.filter(
    (p) =>
      p.kind === "submit" &&
      p.marks !== undefined &&
      p.total !== undefined &&
      isPaperPassForGoal(p.marks, p.total) &&
      isOnDay(p.ts, day),
  ).length;
}
