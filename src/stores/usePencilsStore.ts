// Pencils store — localStorage-backed counter. Users earn pencils by:
//   - answering questions correctly (by difficulty):
//       silly=1, easy=2, medium=3, hard=4, devilish=5
//   - passing a paper (>=50%): +5 bonus
//
// Awards are idempotent by event key so replays/re-submits don't double-count.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Difficulty } from "@/data/topics";

export const PENCILS_BY_DIFFICULTY: Record<Difficulty, number> = {
  silly: 1,
  easy: 2,
  medium: 3,
  hard: 4,
  devilish: 5,
};

export const PAPER_PASS_BONUS = 5;

export interface PencilAward {
  id: string;
  ts: number;
  amount: number;
  reason:
    | { kind: "question"; questionId: string; difficulty: Difficulty }
    | { kind: "paper-pass"; paperId: string };
}

interface PencilsState {
  total: number;
  awards: PencilAward[];
  /** event keys we've already credited — prevents double-counting */
  creditedKeys: Record<string, true>;

  awardForQuestion: (questionId: string, difficulty: Difficulty) => number;
  awardForPaperPass: (paperId: string, attemptTs: number) => number;
  reset: () => void;
}

const qKey = (qid: string, ts: number) => `q:${qid}:${ts}`;
const pKey = (pid: string, ts: number) => `p:${pid}:${ts}`;

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const usePencilsStore = create<PencilsState>()(
  persist(
    (set, get) => ({
      total: 0,
      awards: [],
      creditedKeys: {},

      awardForQuestion: (questionId, difficulty) => {
        // Use question id only as key — each question awards pencils once (on
        // first correct answer). Subsequent correct re-attempts won't
        // double-award. (This matches how analytics treats first-submit.)
        const key = qKey(questionId, 0);
        if (get().creditedKeys[key]) return 0;
        const amount = PENCILS_BY_DIFFICULTY[difficulty] ?? 0;
        if (amount <= 0) return 0;
        set((s) => ({
          total: s.total + amount,
          awards: [
            ...s.awards,
            {
              id: newId(),
              ts: Date.now(),
              amount,
              reason: { kind: "question", questionId, difficulty },
            },
          ],
          creditedKeys: { ...s.creditedKeys, [key]: true },
        }));
        return amount;
      },

      awardForPaperPass: (paperId, attemptTs) => {
        // Key by paperId + attemptTs so each distinct pass awards once.
        const key = pKey(paperId, attemptTs);
        if (get().creditedKeys[key]) return 0;
        set((s) => ({
          total: s.total + PAPER_PASS_BONUS,
          awards: [
            ...s.awards,
            {
              id: newId(),
              ts: Date.now(),
              amount: PAPER_PASS_BONUS,
              reason: { kind: "paper-pass", paperId },
            },
          ],
          creditedKeys: { ...s.creditedKeys, [key]: true },
        }));
        return PAPER_PASS_BONUS;
      },

      reset: () => set({ total: 0, awards: [], creditedKeys: {} }),
    }),
    {
      name: "ss:pencils:v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
