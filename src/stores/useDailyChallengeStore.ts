// Daily Challenge store — picks 3 hard random questions per subject per day,
// tracks which question IDs were used (so they're never re-served in
// challenges) and records day-by-day completion history per subject for streaks.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { QUESTIONS, type Question, type OptionLetter } from "@/data/questionData";
import { getPaperById, type Paper, type Subject } from "@/data/paperData";
import { getAnswerKey } from "@/data/answerKey";

/** Day key in local time, format YYYY-MM-DD */
export const dayKey = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const dayKeyToDate = (k: string): Date => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export interface ChallengeDayRecord {
  /** YYYY-MM-DD */
  day: string;
  questionIds: string[];
  /** answers chosen for each question, keyed by qid */
  answers: Record<string, OptionLetter | undefined>;
  /** marks scored 0..3 */
  marks: number;
  /** ISO timestamp completed */
  completedAt: number;
}

interface DailyChallengeState {
  /** subject -> day -> {questionIds (the served set, may include unfinished)} */
  pickedToday: Record<Subject, { day: string; questionIds: string[] } | undefined>;
  /** subject -> ordered history of completed challenge days */
  history: Record<Subject, ChallengeDayRecord[]>;
  /** subject -> set of qids used in any past challenge (so never re-pick) */
  usedQuestionIds: Record<Subject, Record<string, true>>;

  /** Returns today's pick (creating one if none exists yet). */
  getOrPickToday: (subject: Subject) => string[];
  /** Re-rolls today's pick (e.g. if there are no eligible questions) */
  reRoll: (subject: Subject) => string[];
  /** Records a finished challenge for today. */
  recordCompletion: (subject: Subject, answers: Record<string, OptionLetter | undefined>) => void;
  /** Computes current streak (consecutive days up to today) for a subject. */
  currentStreak: (subject: Subject) => number;
  /** Removes everything (settings reset). */
  clearAll: () => void;
}

const SUBJECTS_ALL: Subject[] = ["bio", "chem", "phys"];
const emptyByS = <T>(make: () => T): Record<Subject, T> =>
  SUBJECTS_ALL.reduce(
    (acc, s) => {
      acc[s] = make();
      return acc;
    },
    {} as Record<Subject, T>,
  );

/** Get all hard questions for a subject (questions whose paper.subject matches). */
function eligibleHardQuestions(subject: Subject, excludeIds: Record<string, true>): Question[] {
  const out: Question[] = [];
  for (const q of QUESTIONS) {
    if (q.difficulty !== "hard") continue;
    if (excludeIds[q.id]) continue;
    const paper = getPaperById(q.paperId);
    if (!paper || paper.subject !== subject) continue;
    out.push(q);
  }
  return out;
}

/** Pick up to N random items (deterministic-ish using day-seeded RNG). */
function pickRandom<T>(arr: T[], n: number, seed: number): T[] {
  const a = arr.slice();
  // simple LCG
  let s = seed || 1;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.min(n, a.length));
}

const seedFromDay = (day: string, subject: Subject) => {
  let h = 2166136261;
  const s = `${day}|${subject}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
};

export const useDailyChallengeStore = create<DailyChallengeState>()(
  persist(
    (set, get) => ({
      pickedToday: { bio: undefined, chem: undefined, phys: undefined },
      history: emptyByS(() => []),
      usedQuestionIds: emptyByS(() => ({})),

      getOrPickToday: (subject) => {
        const today = dayKey();
        const existing = get().pickedToday[subject];
        if (existing && existing.day === today) return existing.questionIds;
        // Don't pick again if already completed today (return that locked set)
        const todayRecord = get().history[subject].find((r) => r.day === today);
        if (todayRecord) {
          set((s) => ({
            pickedToday: {
              ...s.pickedToday,
              [subject]: { day: today, questionIds: todayRecord.questionIds },
            },
          }));
          return todayRecord.questionIds;
        }
        const pool = eligibleHardQuestions(subject, get().usedQuestionIds[subject]);
        const picked = pickRandom(pool, 3, seedFromDay(today, subject)).map((q) => q.id);
        set((s) => ({
          pickedToday: {
            ...s.pickedToday,
            [subject]: { day: today, questionIds: picked },
          },
        }));
        return picked;
      },

      reRoll: (subject) => {
        const today = dayKey();
        const pool = eligibleHardQuestions(subject, get().usedQuestionIds[subject]);
        const picked = pickRandom(pool, 3, Math.floor(Math.random() * 1e9)).map((q) => q.id);
        set((s) => ({
          pickedToday: {
            ...s.pickedToday,
            [subject]: { day: today, questionIds: picked },
          },
        }));
        return picked;
      },

      recordCompletion: (subject, answers) => {
        const today = dayKey();
        const picked = get().pickedToday[subject];
        if (!picked || picked.day !== today) return;
        // Avoid duplicate completions for the same day.
        if (get().history[subject].some((r) => r.day === today)) return;

        let marks = 0;
        for (const qid of picked.questionIds) {
          const q = QUESTIONS.find((x) => x.id === qid);
          if (!q) continue;
          const idx = Number(q.number) - 1;
          const correct = getAnswerKey(q.paperId)[idx] ?? "A";
          if (answers[qid] === correct) marks += 1;
        }

        set((s) => {
          const used = { ...s.usedQuestionIds[subject] };
          for (const qid of picked.questionIds) used[qid] = true;
          const record: ChallengeDayRecord = {
            day: today,
            questionIds: picked.questionIds,
            answers: { ...answers },
            marks,
            completedAt: Date.now(),
          };
          return {
            history: {
              ...s.history,
              [subject]: [...s.history[subject], record].sort((a, b) => a.day.localeCompare(b.day)),
            },
            usedQuestionIds: { ...s.usedQuestionIds, [subject]: used },
          };
        });
      },

      currentStreak: (subject) => {
        const days = new Set(get().history[subject].map((r) => r.day));
        if (days.size === 0) return 0;
        let streak = 0;
        const cur = new Date();
        // If today not done yet, start counting from yesterday so we don't show 0
        // when streak is "alive" but today isn't completed yet.
        if (!days.has(dayKey(cur))) {
          cur.setDate(cur.getDate() - 1);
        }
        while (days.has(dayKey(cur))) {
          streak += 1;
          cur.setDate(cur.getDate() - 1);
        }
        return streak;
      },

      clearAll: () =>
        set({
          pickedToday: { bio: undefined, chem: undefined, phys: undefined },
          history: emptyByS(() => []),
          usedQuestionIds: emptyByS(() => ({})),
        }),
    }),
    {
      name: "ss:daily-challenge:v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        pickedToday: s.pickedToday,
        history: s.history,
        usedQuestionIds: s.usedQuestionIds,
      }),
    },
  ),
);

/** Convenience: resolve a list of question ids into { q, paper } rows. */
export function resolveChallengeRows(qids: string[]): { q: Question; paper: Paper }[] {
  const rows: { q: Question; paper: Paper }[] = [];
  for (const id of qids) {
    const q = QUESTIONS.find((x) => x.id === id);
    if (!q) continue;
    const paper = getPaperById(q.paperId);
    if (!paper) continue;
    rows.push({ q, paper });
  }
  return rows;
}
