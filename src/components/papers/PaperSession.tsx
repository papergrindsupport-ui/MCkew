import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import type { OptionLetter, Question } from "@/data/questionData";
import { getAnswerKey } from "@/data/answerKey";
import { getPaperCorrectLetter } from "@/data/paperQuestions";
import { celebrate, bigCelebrate } from "@/lib/confetti";
import { useAnalyticsStore } from "@/stores/useAnalyticsStore";

export type SubmissionMode = "end-of-paper" | "per-question" | "instant";
export type ReviewFilter = "all" | "wrong" | "correct";

export interface TimerCfg {
  id: string;
  name: string;
  /** initial duration in seconds */
  durationSec: number;
  /** remaining seconds (live) */
  remainingSec: number;
  running: boolean;
  /** has fired the 5-min warning */
  warned: boolean;
  /** has fired time's up */
  expired: boolean;
}

export type NavStripPosition = "right" | "left" | "top" | "bottom";

export interface PaperSettings {
  submissionMode: SubmissionMode;
  dontAskEmptySubmit: boolean;
  dontAskSubmitConfirm: boolean;
  hideAllTags: boolean;
  showHints: boolean;
  mcqEliminator: boolean;
  timed: boolean;
  autoSubmitOnTimeUp: boolean;
  showNavStrip: boolean;
  navStripPosition: NavStripPosition;
  /** Arrow-key MCQ navigation (and cross-question jumps). */
  keyboardNav: boolean;
  /** Hide the per-question Tag button (icon next to bookmark). */
  hideTagButton: boolean;
  /** Hide the per-question Comment button. */
  hideCommentButton: boolean;
}

export const DEFAULT_SETTINGS: PaperSettings = {
  submissionMode: "end-of-paper",
  dontAskEmptySubmit: false,
  dontAskSubmitConfirm: false,
  hideAllTags: true,
  showHints: false,
  mcqEliminator: false,
  timed: false,
  autoSubmitOnTimeUp: false,
  showNavStrip: false,
  navStripPosition: "right",
  keyboardNav: true,
  hideTagButton: false,
  hideCommentButton: false,
};

export type QuestionStatus = "unanswered" | "answered" | "submitted";

interface PaperSessionContextValue {
  paperId: string;
  questions: Question[];
  readOnly: boolean;
  settings: PaperSettings;
  setSettings: (s: PaperSettings) => void;

  selected: Record<string, OptionLetter | undefined>;
  status: Record<string, QuestionStatus>;

  /** map of qid -> set of eliminated letters */
  eliminated: Record<string, OptionLetter[]>;
  toggleEliminate: (qid: string, letter: OptionLetter) => void;

  paperSubmitted: boolean;

  /** Review filter (after submission) */
  reviewFilter: ReviewFilter;
  setReviewFilter: (f: ReviewFilter) => void;

  selectAnswer: (qid: string, letter: OptionLetter) => void;
  submitQuestion: (qid: string) => void;
  submitPaper: () => void;
  reattemptQuestion: (qid: string) => void;
  reattemptPaper: () => void;
  resetPaper: () => void;

  /** Timers + stopwatch */
  timers: TimerCfg[];
  addTimer: (durationSec?: number, name?: string) => void;
  removeTimer: (id: string) => void;
  updateTimer: (id: string, patch: Partial<TimerCfg>) => void;
  pauseResumeTimer: (id: string) => void;
  restartTimer: (id: string) => void;
  renameTimer: (id: string, name: string) => void;

  stopwatchRunning: boolean;
  stopwatchSec: number;
  stopwatchLaps: number[];
  stopwatchEnabled: boolean;
  setStopwatchEnabled: (v: boolean) => void;
  startStopwatch: () => void;
  pauseStopwatch: () => void;
  resetStopwatch: () => void;
  lapStopwatch: () => void;
  /** internal tick (called by floating component) */
  _tick: () => void;

  /** Answer key lookup. */
  correctFor: (q: Question) => OptionLetter;
  isMarked: (qid: string) => boolean;
  attemptedCount: number;
  totalMark: number;
}

const Ctx = createContext<PaperSessionContextValue | null>(null);

export function usePaperSession(): PaperSessionContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePaperSession outside provider");
  return v;
}

let _tid = 0;
const newId = () => `t-${Date.now()}-${++_tid}`;

export function PaperSessionProvider({
  paperId,
  questions,
  children,
  correctForOverride,
  initialSettings,
  storageKey,
  initialState,
  readOnly,
}: {
  paperId: string;
  questions: Question[];
  children: ReactNode;
  /** When provided, overrides the default per-paper answer-key lookup.
   *  Used by /smart-solve-{subject} pages where each question carries its own paperId. */
  correctForOverride?: (q: Question) => OptionLetter;
  initialSettings?: Partial<PaperSettings>;
  /** When set, persist selected answers + status to localStorage under this key. */
  storageKey?: string;
  /** Seed the session from a shared link / server snapshot. */
  initialState?: Partial<{
    settings: PaperSettings;
    selected: Record<string, OptionLetter | undefined>;
    status: Record<string, QuestionStatus>;
    eliminated: Record<string, OptionLetter[]>;
    paperSubmitted: boolean;
    reviewFilter: ReviewFilter;
    timers: TimerCfg[];
    stopwatchEnabled: boolean;
    stopwatchRunning: boolean;
    stopwatchSec: number;
    stopwatchLaps: number[];
  }>;
  /** When true, prevent answering/submitting/edits. */
  readOnly?: boolean;
}) {
  const [settings, setSettings] = useState<PaperSettings>({
    ...DEFAULT_SETTINGS,
    ...(initialState?.settings ?? {}),
    ...(initialSettings ?? {}),
  });
  const initialPersistKey = storageKey ?? paperId;
  const [selected, setSelected] = useState<Record<string, OptionLetter | undefined>>(() => {
    if (initialState?.selected) return initialState.selected;
    if (!initialPersistKey || typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem(`${initialPersistKey}:sel`) ?? "{}");
    } catch {
      return {};
    }
  });
  const [status, setStatus] = useState<Record<string, QuestionStatus>>(() => {
    if (initialState?.status) return initialState.status;
    if (!initialPersistKey || typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem(`${initialPersistKey}:status`) ?? "{}");
    } catch {
      return {};
    }
  });
  const [eliminated, setEliminated] = useState<Record<string, OptionLetter[]>>(
    () => initialState?.eliminated ?? {},
  );
  const [paperSubmitted, setPaperSubmitted] = useState<boolean>(() => {
    if (typeof initialState?.paperSubmitted === "boolean") return initialState.paperSubmitted;
    if (typeof window === "undefined") return false;
    try {
      const events = useAnalyticsStore.getState().papers;
      return events.some((e) => e.paperId === paperId && e.kind === "submit");
    } catch {
      return false;
    }
  });
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>(() => initialState?.reviewFilter ?? "all");

  const [timers, setTimers] = useState<TimerCfg[]>(() => initialState?.timers ?? []);
  const [stopwatchEnabled, setStopwatchEnabled] = useState(() => initialState?.stopwatchEnabled ?? false);
  const [stopwatchRunning, setStopwatchRunning] = useState(() => initialState?.stopwatchRunning ?? false);
  const [stopwatchSec, setStopwatchSec] = useState(() => initialState?.stopwatchSec ?? 0);
  const [stopwatchLaps, setStopwatchLaps] = useState<number[]>(() => initialState?.stopwatchLaps ?? []);

  const answerKey = useMemo(() => getAnswerKey(paperId), [paperId]);

  const correctFor = useCallback(
    (q: Question): OptionLetter => {
      if (correctForOverride) return correctForOverride(q);
      const idx = Number(q.number) - 1;
      if (idx >= 0 && idx < answerKey.length) return answerKey[idx];
      return getPaperCorrectLetter(q.id) ?? "A";
    },
    [answerKey, correctForOverride],
  );

  // Persist selected + status. We use `storageKey` if provided (smart-solve-*
  // shared sessions namespace by their virtual key), but ALWAYS persist real
  // paper sessions under the paperId so the Recent Papers / "continue where
  // you left off" UX works even when no storageKey was passed.
  const persistKey = storageKey ?? paperId;
  useEffect(() => {
    if (!persistKey || typeof window === "undefined") return;
    if (readOnly) return;
    try {
      localStorage.setItem(`${persistKey}:sel`, JSON.stringify(selected));
    } catch {}
    // Touch recent-papers tracker on every selection change for real papers.
    if (!persistKey.startsWith("smart-solve-") && !persistKey.startsWith("exam-preview:")) {
      // Lazy-import to avoid a require cycle at module load.
      import("@/lib/recentPapers").then((m) => m.touchRecentPaper(persistKey)).catch(() => {});
    }
  }, [selected, persistKey]);
  useEffect(() => {
    if (!persistKey || typeof window === "undefined") return;
    if (readOnly) return;
    try {
      localStorage.setItem(`${persistKey}:status`, JSON.stringify(status));
    } catch {}
  }, [status, persistKey]);

  // Auto-scroll to the last-viewed question (if any) once on mount.
  // Skipped for synthetic smart-solve-* / exam-preview sessions which manage
  // their own scroll state.
  useEffect(() => {
    if (!persistKey || typeof window === "undefined") return;
    if (persistKey.startsWith("smart-solve-") || persistKey.startsWith("exam-preview:")) return;
    let cancelled = false;
    import("@/lib/lastQuestion").then(({ getLastQuestion }) => {
      if (cancelled) return;
      const last = getLastQuestion(persistKey);
      if (!last) return;
      // Defer to next frame so QuestionView articles are mounted.
      requestAnimationFrame(() => {
        const el = document.getElementById(`question-${last}`);
        if (el) el.scrollIntoView({ behavior: "auto", block: "start" });
      });
    });
    return () => {
      cancelled = true;
    };
    // Mount-only — persistKey shouldn't change during a session, but if it
    // does (e.g. switching papers via SPA nav) we re-run intentionally.
  }, [persistKey]);

  const selectAnswer = useCallback(
    (qid: string, letter: OptionLetter) => {
      if (readOnly) return;
      // eliminated letters cannot be selected
      if ((eliminated[qid] ?? []).includes(letter)) return;
      // Track answer change in analytics + log paper attempt on first interaction
      const analytics = useAnalyticsStore.getState();
      analytics.recordPaperAttempt(paperId);
      analytics.recordSelectionChange(qid);
      setSelected((cur) => {
        if (status[qid] === "submitted") return cur;
        return { ...cur, [qid]: cur[qid] === letter ? undefined : letter };
      });
      setStatus((cur) => {
        if (cur[qid] === "submitted") return cur;
        const newSel = selected[qid] === letter ? undefined : letter;
        return { ...cur, [qid]: newSel ? "answered" : "unanswered" };
      });
      if (settings.submissionMode === "instant") {
        setStatus((cur) => ({ ...cur, [qid]: "submitted" }));
        const q = questions.find((x) => x.id === qid);
        if (q) {
          const newSel = selected[qid] === letter ? undefined : letter;
          analytics.recordSubmit(qid, paperId, newSel, correctFor(q));
          if (correctFor(q) === letter && selected[qid] !== letter) {
            celebrate();
          }
        }
      }
    },
    [readOnly, settings.submissionMode, status, selected, eliminated, questions, correctFor, paperId],
  );

  const toggleEliminate = useCallback(
    (qid: string, letter: OptionLetter) => {
      if (readOnly) return;
      if (status[qid] === "submitted") return;
      setEliminated((cur) => {
        const list = cur[qid] ?? [];
        const has = list.includes(letter);
        // Don't allow eliminating the last remaining option
        const q = questions.find((x) => x.id === qid);
        const totalOpts = q?.options ? optionsCount(q.options) : 4;
        if (!has && list.length + 1 >= totalOpts) return cur;
        const next = has ? list.filter((l) => l !== letter) : [...list, letter];
        return { ...cur, [qid]: next };
      });
      // If eliminating the currently-selected letter, deselect it
      setSelected((cur) => (cur[qid] === letter ? { ...cur, [qid]: undefined } : cur));
    },
    [readOnly, status, questions],
  );

  const submitQuestion = useCallback(
    (qid: string) => {
      if (readOnly) return;
      setStatus((cur) => ({ ...cur, [qid]: "submitted" }));
      const q = questions.find((x) => x.id === qid);
      if (q) {
        useAnalyticsStore.getState().recordSubmit(qid, paperId, selected[qid], correctFor(q));
        if (selected[qid] === correctFor(q)) celebrate();
      }
    },
    [readOnly, questions, selected, correctFor, paperId],
  );

  const submitPaper = useCallback(() => {
    if (readOnly) return;
    const analytics = useAnalyticsStore.getState();
    let marks = 0;
    questions.forEach((q) => {
      if (status[q.id] !== "submitted") {
        // Record any unsubmitted question on paper submit
        analytics.recordSubmit(q.id, paperId, selected[q.id], correctFor(q));
      }
      if (selected[q.id] === correctFor(q)) marks++;
    });
    analytics.recordPaperSubmit(paperId, marks, questions.length);
    setStatus((cur) => {
      const next = { ...cur };
      questions.forEach((q) => {
        next[q.id] = "submitted";
      });
      return next;
    });
    setPaperSubmitted(true);
    setTimers((cur) => cur.map((t) => ({ ...t, running: false })));
    setStopwatchRunning(false);
    // Celebrate paper submission
    bigCelebrate();
  }, [readOnly, questions, status, selected, correctFor, paperId]);

  const reattemptQuestion = useCallback((qid: string) => {
    if (readOnly) return;
    setSelected((cur) => ({ ...cur, [qid]: undefined }));
    setStatus((cur) => ({ ...cur, [qid]: "unanswered" }));
    setEliminated((cur) => ({ ...cur, [qid]: [] }));
  }, [readOnly]);

  const reattemptPaper = useCallback(() => {
    if (readOnly) return;
    setSelected({});
    setStatus({});
    setEliminated({});
    setPaperSubmitted(false);
    setReviewFilter("all");
    setTimers((cur) =>
      cur.map((t) => ({
        ...t,
        remainingSec: t.durationSec,
        running: false,
        warned: false,
        expired: false,
      })),
    );
    setStopwatchRunning(false);
    setStopwatchSec(0);
    setStopwatchLaps([]);
    // Wipe persisted state so the paper truly resets
    if (initialPersistKey && typeof window !== "undefined") {
      try {
        localStorage.removeItem(`${initialPersistKey}:sel`);
        localStorage.removeItem(`${initialPersistKey}:status`);
      } catch {}
    }
  }, [readOnly, initialPersistKey]);

  const resetPaper = reattemptPaper;

  const isMarked = useCallback((qid: string) => status[qid] === "submitted", [status]);

  const attemptedCount = useMemo(
    () => questions.filter((q) => selected[q.id] !== undefined).length,
    [questions, selected],
  );

  const totalMark = useMemo(() => {
    let m = 0;
    for (const q of questions) {
      if (status[q.id] === "submitted" && selected[q.id] === correctFor(q)) m++;
    }
    return m;
  }, [questions, status, selected, correctFor]);

  /* ---------------- Timers ---------------- */
  const addTimer = useCallback((durationSec = 45 * 60, name?: string) => {
    if (readOnly) return;
    setTimers((cur) => [
      ...cur,
      {
        id: newId(),
        name: name ?? `Timer ${cur.length + 1}`,
        durationSec,
        remainingSec: durationSec,
        running: false,
        warned: false,
        expired: false,
      },
    ]);
  }, [readOnly]);
  const removeTimer = useCallback((id: string) => {
    if (readOnly) return;
    setTimers((cur) => cur.filter((t) => t.id !== id));
  }, [readOnly]);
  const updateTimer = useCallback((id: string, patch: Partial<TimerCfg>) => {
    if (readOnly) return;
    setTimers((cur) =>
      cur.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t, ...patch };
        // If duration changed, clamp remaining
        if (patch.durationSec !== undefined && patch.remainingSec === undefined) {
          next.remainingSec = patch.durationSec;
          next.warned = false;
          next.expired = false;
        }
        return next;
      }),
    );
  }, [readOnly]);
  const pauseResumeTimer = useCallback((id: string) => {
    if (readOnly) return;
    setTimers((cur) => cur.map((t) => (t.id === id ? { ...t, running: !t.running } : t)));
  }, [readOnly]);
  const restartTimer = useCallback((id: string) => {
    if (readOnly) return;
    setTimers((cur) =>
      cur.map((t) =>
        t.id === id
          ? { ...t, remainingSec: t.durationSec, warned: false, expired: false, running: true }
          : t,
      ),
    );
  }, [readOnly]);
  const renameTimer = useCallback((id: string, name: string) => {
    if (readOnly) return;
    setTimers((cur) => cur.map((t) => (t.id === id ? { ...t, name } : t)));
  }, [readOnly]);

  const startStopwatch = useCallback(() => {
    if (readOnly) return;
    setStopwatchRunning(true);
  }, [readOnly]);
  const pauseStopwatch = useCallback(() => {
    if (readOnly) return;
    setStopwatchRunning(false);
  }, [readOnly]);
  const resetStopwatch = useCallback(() => {
    if (readOnly) return;
    setStopwatchRunning(false);
    setStopwatchSec(0);
    setStopwatchLaps([]);
  }, [readOnly]);
  const lapStopwatch = useCallback(() => {
    if (readOnly) return;
    setStopwatchLaps((cur) => [...cur, stopwatchSec]);
  }, [readOnly, stopwatchSec]);

  const tickRef = useRef<() => void>(() => {});
  tickRef.current = () => {
    setTimers((cur) =>
      cur.map((t) => {
        if (!t.running || t.expired) return t;
        return { ...t, remainingSec: Math.max(0, t.remainingSec - 1) };
      }),
    );
    if (stopwatchRunning) setStopwatchSec((s) => s + 1);
  };
  const _tick = useCallback(() => tickRef.current(), []);

  const value: PaperSessionContextValue = {
    paperId,
    questions,
    readOnly: !!readOnly,
    settings,
    setSettings,
    selected,
    status,
    eliminated,
    toggleEliminate,
    paperSubmitted,
    reviewFilter,
    setReviewFilter,
    selectAnswer,
    submitQuestion,
    submitPaper,
    reattemptQuestion,
    reattemptPaper,
    resetPaper,
    timers,
    addTimer,
    removeTimer,
    updateTimer,
    pauseResumeTimer,
    restartTimer,
    renameTimer,
    stopwatchRunning,
    stopwatchSec,
    stopwatchLaps,
    stopwatchEnabled,
    setStopwatchEnabled,
    startStopwatch,
    pauseStopwatch,
    resetStopwatch,
    lapStopwatch,
    _tick,
    correctFor,
    isMarked,
    attemptedCount,
    totalMark,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function optionsCount(opts: NonNullable<Question["options"]>): number {
  switch (opts.type) {
    case "text-options":
    case "image-options":
    case "graph-options":
      return opts.options.length;
    case "table-options-rows":
      return opts.optionRows.length;
    case "table-options-cols":
      return opts.optionCols.length;
    case "table-options-cells":
      return opts.optionCells.length;
    case "image-positioned":
      return opts.options.length;
  }
}
