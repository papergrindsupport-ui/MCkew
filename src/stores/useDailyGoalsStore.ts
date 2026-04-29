// Daily goals store — tracks user's daily targets for questions and papers,
// plus per-day progress history (so Analytics can show goal stats by day).
//
// Progress is derived from the analytics store; this store only records the
// goal values + a per-day "progress snapshot" and which goal-completion
// congrats have already been shown today (so we don't show them twice).

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** YYYY-MM-DD local time. */
export const dayKeyFor = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** Canonical paper "pass" threshold — fixed 20/40 per user spec. */
export const PAPER_PASS_MIN_MARKS = 20;
export const PAPER_PASS_MIN_TOTAL = 40;
export function isPaperPassForGoal(marks: number, total: number): boolean {
  return total >= PAPER_PASS_MIN_TOTAL && marks >= PAPER_PASS_MIN_MARKS;
}

export interface DailyGoalRecord {
  /** YYYY-MM-DD */
  day: string;
  /** Goal that applied on that day */
  questionsGoal: number;
  papersGoal: number;
  /** Progress captured that day */
  correctQuestions: number;
  passedPapers: number;
}

interface DailyGoalsState {
  /** Current goals (used for today going forward) */
  questionsGoal: number;
  papersGoal: number;
  /** Whether the user has completed the onboarding wizard */
  onboarded: boolean;
  /** Day -> progress record */
  history: Record<string, DailyGoalRecord>;
  /** Per-day flags so congrats are shown at most once */
  celebratedQuestions: Record<string, true>;
  celebratedPapers: Record<string, true>;

  setQuestionsGoal: (n: number) => void;
  setPapersGoal: (n: number) => void;
  setOnboarded: (v: boolean) => void;
  updateProgress: (day: string, correctQuestions: number, passedPapers: number) => void;
  markCelebratedQuestions: (day: string) => void;
  markCelebratedPapers: (day: string) => void;
}

export const useDailyGoalsStore = create<DailyGoalsState>()(
  persist(
    (set) => ({
      questionsGoal: 10,
      papersGoal: 3,
      onboarded: false,
      history: {},
      celebratedQuestions: {},
      celebratedPapers: {},
      setQuestionsGoal: (n) => set({ questionsGoal: Math.max(1, Math.floor(n)) }),
      setPapersGoal: (n) => set({ papersGoal: Math.max(1, Math.floor(n)) }),
      setOnboarded: (v) => set({ onboarded: v }),
      updateProgress: (day, correctQuestions, passedPapers) =>
        set((s) => {
          const prev = s.history[day];
          const rec: DailyGoalRecord = {
            day,
            questionsGoal: prev?.questionsGoal ?? s.questionsGoal,
            papersGoal: prev?.papersGoal ?? s.papersGoal,
            correctQuestions,
            passedPapers,
          };
          return { history: { ...s.history, [day]: rec } };
        }),
      markCelebratedQuestions: (day) =>
        set((s) => ({ celebratedQuestions: { ...s.celebratedQuestions, [day]: true } })),
      markCelebratedPapers: (day) =>
        set((s) => ({ celebratedPapers: { ...s.celebratedPapers, [day]: true } })),
    }),
    {
      name: "ss:daily-goals:v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
