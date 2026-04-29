// Analytics store — localStorage-backed event log of every question attempt
// and every paper attempt/submit. Derived stats live in src/lib/analytics.ts.
//
// IMPORTANT: A question is only recorded as "attempted" when the user has
// actually selected an option. Submitting a paper with unanswered questions
// does NOT record those questions as attempts. This is enforced in
// `recordSubmit` below — if `selected` is undefined, no AttemptEvent is
// written.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { OptionLetter } from "@/data/questionData";
import { usePencilsStore } from "@/stores/usePencilsStore";
import { useStreakStore } from "@/stores/useStreakStore";
import { QUESTIONS } from "@/data/questionData";
import { getPaperQuestions } from "@/data/paperQuestions";
import type { Question } from "@/data/questionData";
import toast from "react-hot-toast";

// Local question lookup — duplicated from src/lib/analytics.ts to avoid a
// circular import (analytics.ts reads from this store).
const _qIdx = new Map<string, Question>();
for (const q of QUESTIONS) _qIdx.set(q.id, q);
function lookupQuestion(id: string): Question | undefined {
  const direct = _qIdx.get(id);
  if (direct) return direct;
  const m = id.match(/^q-(.+)-pad-\d+$/);
  if (m) return getPaperQuestions(m[1]).find((q) => q.id === id);
  return undefined;
}

export interface AttemptEvent {
  /** unique event id */
  id: string;
  /** ISO timestamp */
  ts: number;
  questionId: string;
  paperId: string;
  /** what the user finally chose (undefined if cleared before submit) */
  selected?: OptionLetter;
  correct: OptionLetter;
  isCorrect: boolean;
  /** how many times the user changed their answer before submitting */
  changes: number;
}

export interface PaperEvent {
  id: string;
  ts: number;
  paperId: string;
  kind: "attempt" | "submit";
  /** marks (only for submit) — out of total */
  marks?: number;
  total?: number;
}

interface AnalyticsState {
  attempts: AttemptEvent[];
  papers: PaperEvent[];
  /** in-flight: per question, # of times the user changed selection before submit */
  pendingChanges: Record<string, number>;
  /** in-flight: which paperIds have already been logged as "attempted" */
  attemptedPapers: Record<string, true>;
  /** questionIds that have already produced an AttemptEvent (dedupe re-submits) */
  recordedQuestions: Record<string, true>;

  recordSelectionChange: (questionId: string) => void;
  recordSubmit: (
    questionId: string,
    paperId: string,
    selected: OptionLetter | undefined,
    correct: OptionLetter,
  ) => void;
  recordPaperAttempt: (paperId: string) => void;
  recordPaperSubmit: (paperId: string, marks: number, total: number) => void;
  /** Clear all analytics (used by Settings → reset). */
  clearAll: () => void;
  /** Seed a few demo events so empty dashboards aren't barren. */
  seedDemo: () => void;
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set, get) => ({
      attempts: [],
      papers: [],
      pendingChanges: {},
      attemptedPapers: {},
      recordedQuestions: {},

      recordSelectionChange: (questionId) => {
        set((s) => ({
          pendingChanges: {
            ...s.pendingChanges,
            [questionId]: (s.pendingChanges[questionId] ?? 0) + 1,
          },
        }));
      },

      recordSubmit: (questionId, paperId, selected, correct) => {
        // CRITICAL: only record an attempt when the user actually chose an
        // option. Unattempted questions — even those "submitted" as part of a
        // whole-paper submit — must never appear in analytics.
        if (selected === undefined) return;
        // Dedupe: first recorded submission per questionId wins.
        if (get().recordedQuestions[questionId]) return;

        const isCorrect = selected === correct;
        const changes = Math.max(0, (get().pendingChanges[questionId] ?? 1) - 1);

        set((s) => {
          const { [questionId]: _drop, ...restPending } = s.pendingChanges;
          return {
            attempts: [
              ...s.attempts,
              {
                id: newId(),
                ts: Date.now(),
                questionId,
                paperId,
                selected,
                correct,
                isCorrect,
                changes,
              },
            ],
            pendingChanges: restPending,
            recordedQuestions: { ...s.recordedQuestions, [questionId]: true },
          };
        });

        // 🏅 Pencils: award on correct answers, by difficulty. Show toast.
        if (isCorrect) {
          const q = lookupQuestion(questionId);
          if (q?.difficulty) {
            const amt = usePencilsStore.getState().awardForQuestion(questionId, q.difficulty);
            if (amt > 0) {
              toast.success(`+${amt} pencil${amt === 1 ? "" : "s"}`, { icon: "✏️" });
            }
          }
        }
        // 🔥 Streak: register answer (shows streak-end toast & history on wrong).
        const subjectPrefix = (paperId ?? "").split("-")[0];
        const streakSubject =
          subjectPrefix === "bio" || subjectPrefix === "chem" || subjectPrefix === "phys"
            ? subjectPrefix
            : "unknown";
        useStreakStore.getState().registerAnswer(isCorrect, streakSubject as any);
      },

      recordPaperAttempt: (paperId) => {
        if (get().attemptedPapers[paperId]) return;
        set((s) => ({
          attemptedPapers: { ...s.attemptedPapers, [paperId]: true },
          papers: [...s.papers, { id: newId(), ts: Date.now(), paperId, kind: "attempt" }],
        }));
      },

      recordPaperSubmit: (paperId, marks, total) => {
        const ts = Date.now();
        set((s) => ({
          papers: [...s.papers, { id: newId(), ts, paperId, kind: "submit", marks, total }],
        }));
        // 🏅 Pencils: +5 bonus if paper is passed (>= 50%).
        if (total > 0 && marks / total >= 0.5) {
          const amt = usePencilsStore.getState().awardForPaperPass(paperId, ts);
          if (amt > 0) {
            toast.success(`+${amt} pencils — paper passed!`, { icon: "🏆" });
          }
        }
      },

      clearAll: () => {
        set({
          attempts: [],
          papers: [],
          pendingChanges: {},
          attemptedPapers: {},
          recordedQuestions: {},
        });
        usePencilsStore.getState().reset();
        useStreakStore.getState().reset();
      },

      seedDemo: () => {
        // No-op: kept exported for future use; the dashboard simply renders
        // empty-state messaging when there's no data.
      },
    }),
    {
      name: "ss:analytics:v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        attempts: s.attempts,
        papers: s.papers,
        attemptedPapers: s.attemptedPapers,
        recordedQuestions: s.recordedQuestions,
      }),
    },
  ),
);
