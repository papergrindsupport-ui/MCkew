// Streak store — tracks consecutive correct answers. A streak begins once the
// user has 3 correct answers in a row, and grows by 1 per additional correct
// answer. When a wrong answer comes (or the user resets), the streak ends,
// awards 3 pencils per streak point, and is saved into history by day.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { usePencilsStore } from "@/stores/usePencilsStore";
import toast from "react-hot-toast";

export const PENCILS_PER_STREAK_POINT = 3;
export const STREAK_START_THRESHOLD = 3;

/** YYYY-MM-DD local-time */
const dayKey = (ts: number = Date.now()): string => {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export type StreakSubject = "bio" | "chem" | "phys" | "mixed" | "unknown";

export interface StreakRecord {
  /** YYYY-MM-DD */
  day: string;
  /** final streak size (number of consecutive corrects that counted) */
  points: number;
  /** pencils awarded */
  pencils: number;
  /** ISO ms completed */
  endedAt: number;
  /** dominant subject during the streak (or "mixed") */
  subject: StreakSubject;
}

interface StreakState {
  /** current consecutive-correct counter (resets on wrong) */
  current: number;
  /** current "live" streak points once threshold is met */
  points: number;
  /** last ts a correct was registered (for anti-dupe) */
  lastTs: number;
  /** subjects tallied during the current streak */
  currentSubjects: Partial<Record<StreakSubject, number>>;
  /** all completed streaks */
  history: StreakRecord[];

  /** Called when a question is submitted. Returns current streak points. */
  registerAnswer: (isCorrect: boolean, subject?: StreakSubject) => number;
  reset: () => void;
}

function dominantSubject(tally: Partial<Record<StreakSubject, number>>): StreakSubject {
  const entries = Object.entries(tally).filter(([, v]) => (v ?? 0) > 0) as [
    StreakSubject,
    number,
  ][];
  if (entries.length === 0) return "unknown";
  if (entries.length === 1) return entries[0][0];
  entries.sort((a, b) => b[1] - a[1]);
  // If top subject holds >=70% of answers, call it that — else "mixed".
  const total = entries.reduce((s, [, v]) => s + v, 0);
  return entries[0][1] / total >= 0.7 ? entries[0][0] : "mixed";
}

export const useStreakStore = create<StreakState>()(
  persist(
    (set, get) => ({
      current: 0,
      points: 0,
      lastTs: 0,
      currentSubjects: {},
      history: [],

      registerAnswer: (isCorrect, subject) => {
        if (isCorrect) {
          const next = get().current + 1;
          const nextPoints = next >= STREAK_START_THRESHOLD ? next : 0;
          const subj = (subject ?? "unknown") as StreakSubject;
          const tally = { ...get().currentSubjects };
          tally[subj] = (tally[subj] ?? 0) + 1;
          set({ current: next, points: nextPoints, lastTs: Date.now(), currentSubjects: tally });
          return nextPoints;
        }
        // Wrong — end streak if we had one.
        const { points, currentSubjects } = get();
        if (points >= STREAK_START_THRESHOLD) {
          const pencils = points * PENCILS_PER_STREAK_POINT;
          const subj = dominantSubject(currentSubjects);
          usePencilsStore.setState((s) => ({
            total: s.total + pencils,
            awards: [
              ...s.awards,
              {
                id: `streak-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                ts: Date.now(),
                amount: pencils,
                reason: { kind: "question", questionId: `streak:${points}`, difficulty: "medium" },
              },
            ],
          }));
          toast.success(
            `🔥 Streak ended! +${pencils} pencils (${points} pts × ${PENCILS_PER_STREAK_POINT})`,
          );
          set((s) => ({
            current: 0,
            points: 0,
            currentSubjects: {},
            history: [
              ...s.history,
              {
                day: dayKey(),
                points,
                pencils,
                endedAt: Date.now(),
                subject: subj,
              },
            ],
          }));
        } else {
          set({ current: 0, points: 0, currentSubjects: {} });
        }
        return 0;
      },

      reset: () => set({ current: 0, points: 0, lastTs: 0, currentSubjects: {}, history: [] }),
    }),
    {
      name: "ss:streak:v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ history: s.history }),
    },
  ),
);

/** Aggregate streak history by day for analytics. */
export function streaksByDay(history: StreakRecord[]): {
  day: string;
  count: number;
  totalPoints: number;
  totalPencils: number;
  streaks: StreakRecord[];
}[] {
  const map = new Map<string, StreakRecord[]>();
  for (const r of history) {
    const arr = map.get(r.day) ?? [];
    arr.push(r);
    map.set(r.day, arr);
  }
  return Array.from(map.entries())
    .map(([day, streaks]) => ({
      day,
      count: streaks.length,
      totalPoints: streaks.reduce((s, r) => s + r.points, 0),
      totalPencils: streaks.reduce((s, r) => s + r.pencils, 0),
      streaks: [...streaks].sort((a, b) => b.endedAt - a.endedAt),
    }))
    .sort((a, b) => (a.day < b.day ? 1 : -1));
}
