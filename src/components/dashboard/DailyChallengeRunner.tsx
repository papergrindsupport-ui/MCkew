import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LuChevronLeft,
  LuChevronRight,
  LuLeaf,
  LuFlaskConical,
  LuAtom,
  LuX,
  LuFlame,
  LuTrophy,
  LuSparkles,
} from "react-icons/lu";
import { cn } from "@/lib/utils";
import type { Question, OptionLetter } from "@/data/questionData";
import {
  type Paper,
  parsePaperId,
  SUBJECT_COLORS,
  SUBJECT_LABEL,
  type Subject,
} from "@/data/paperData";
import { QuestionView } from "@/components/papers/QuestionView";
import { PaperSessionProvider, usePaperSession } from "@/components/papers/PaperSession";
import { getAnswerKey } from "@/data/answerKey";
import { useDailyChallengeStore } from "@/stores/useDailyChallengeStore";

const SUBJECT_ICON: Record<Subject, typeof LuLeaf> = {
  bio: LuLeaf,
  chem: LuFlaskConical,
  phys: LuAtom,
};

const correctFor = (q: Question): OptionLetter => {
  const idx = Number(q.number) - 1;
  return getAnswerKey(q.paperId)[idx] ?? "A";
};

interface DailyChallengeRunnerProps {
  subject: Subject;
  rows: { q: Question; paper: Paper }[];
  /** When true, this is a read-only "view past day" run (no recordCompletion). */
  readOnly?: boolean;
  /** When read-only, prefill these answers and mark them all submitted. */
  initialAnswers?: Record<string, OptionLetter | undefined>;
  onClose: () => void;
}

export function DailyChallengeRunner(props: DailyChallengeRunnerProps) {
  if (props.rows.length === 0) {
    return <EmptyState subject={props.subject} onClose={props.onClose} />;
  }
  return (
    <PaperSessionProvider
      paperId={`daily-challenge-${props.subject}`}
      questions={props.rows.map((r) => r.q)}
      correctForOverride={correctFor}
      initialSettings={{ submissionMode: "instant" }}
    >
      <RunnerInner {...props} />
    </PaperSessionProvider>
  );
}

function EmptyState({ subject, onClose }: { subject: Subject; onClose: () => void }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex items-center justify-center p-6"
    >
      <div className="max-w-md text-center rounded-3xl border-2 border-border/40 bg-card/80 backdrop-blur p-8 space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/15 text-primary">
          <LuSparkles size={24} />
        </div>
        <h2 className="text-xl font-bold">All hard {SUBJECT_LABEL[subject]} questions solved!</h2>
        <p className="text-sm text-muted-foreground">
          You've completed every available difficult challenge in this subject. Amazing 🎉
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-full bg-primary text-primary-foreground font-bold text-sm cursor-pointer"
        >
          Close
        </button>
      </div>
    </motion.div>,
    document.body,
  );
}

function RunnerInner({
  subject,
  rows,
  readOnly,
  initialAnswers,
  onClose,
}: DailyChallengeRunnerProps) {
  const session = usePaperSession();
  const recordCompletion = useDailyChallengeStore((s) => s.recordCompletion);

  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [completedShown, setCompletedShown] = useState(false);

  const goTo = (next: number) => {
    setDir(next > idx ? 1 : -1);
    setIdx(Math.max(0, Math.min(rows.length - 1, next)));
  };

  // Apply read-only prefilled answers once
  useEffect(() => {
    if (!readOnly || !initialAnswers) return;
    for (const r of rows) {
      const ans = initialAnswers[r.q.id];
      if (ans !== undefined) {
        session.selectAnswer(r.q.id, ans);
        session.submitQuestion(r.q.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Auto-advance after instant marking
  const currentQid = rows[idx]?.q.id;
  const currentMarked = currentQid ? session.isMarked(currentQid) : false;
  useEffect(() => {
    if (!currentMarked || readOnly) return;
    if (idx >= rows.length - 1) return;
    const t = setTimeout(() => {
      setDir(1);
      setIdx((i) => Math.min(rows.length - 1, i + 1));
    }, 1500);
    return () => clearTimeout(t);
  }, [currentMarked, idx, rows.length, readOnly]);

  // Detect completion: all 3 submitted
  const allMarked = rows.every((r) => session.isMarked(r.q.id));
  useEffect(() => {
    if (readOnly) return;
    if (!allMarked || completedShown) return;
    // Capture answers and record
    const answers: Record<string, OptionLetter | undefined> = {};
    for (const r of rows) answers[r.q.id] = session.selected[r.q.id];
    recordCompletion(subject, answers);
    setCompletedShown(true);
  }, [allMarked, completedShown, readOnly, rows, session.selected, recordCompletion, subject]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") goTo(idx + 1);
      if (e.key === "ArrowLeft") goTo(idx - 1);
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rows.length, onClose, idx]);

  // Per-question visual timer (no controls — purely decorative). Restarts on idx change.
  const DAILY_Q_TIMER_SEC = 60;
  const [timerKey, setTimerKey] = useState(0);
  useEffect(() => {
    setTimerKey((k) => k + 1);
  }, [idx]);

  if (typeof document === "undefined") return null;

  const current = rows[idx];
  const parsed = parsePaperId(current.paper.id);
  const Icon = SUBJECT_ICON[subject];
  const colors = SUBJECT_COLORS[subject];
  const progressPct = ((idx + 1) / rows.length) * 100;
  const score = rows.filter((r) => {
    const sel = session.selected[r.q.id];
    return session.isMarked(r.q.id) && sel === correctFor(r.q);
  }).length;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex flex-col"
    >
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/10 blur-3xl"
          animate={{ x: [0, 100, 0], y: [0, 50, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-accent/20 blur-3xl"
          animate={{ x: [0, -100, 0], y: [0, -50, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-3 border-b border-border/40 bg-card/50 backdrop-blur-md">
          <span
            className={cn(
              "inline-flex items-center justify-center w-9 h-9 rounded-xl ring-2 shrink-0",
              colors.soft,
              colors.ring,
            )}
          >
            <Icon size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-widest text-primary font-bold flex items-center gap-1">
              <LuFlame size={10} />
              {readOnly ? "Past Daily Challenge" : "Daily Challenge"} · {SUBJECT_LABEL[subject]}
            </div>
            <div className="font-bold text-sm sm:text-base truncate">
              Q{current.q.number} · {parsed?.year} {parsed?.session} {parsed?.variant}
              <span className="ml-2 text-xs text-muted-foreground font-medium">
                {idx + 1}/{rows.length}
              </span>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.08, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            title="Close (Esc)"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition cursor-pointer"
          >
            <LuX size={16} />
          </motion.button>
        </div>

        <div className="h-1 bg-muted/40 relative overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            animate={{ width: `${progressPct}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
          />
        </div>

        {/* Per-question visual timer — restarts each question (decorative) */}
        <div className="h-1 bg-muted/30 relative overflow-hidden">
          <div
            key={timerKey}
            className="h-full bg-primary/70 origin-left"
            style={{
              animation: `playmode-timer ${DAILY_Q_TIMER_SEC}s linear forwards`,
            }}
          />
        </div>

        <div className="flex-1 overflow-auto">
          <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={current.q.id}
                custom={dir}
                variants={{
                  enter: (d: number) => ({
                    opacity: 0,
                    x: d * 80,
                    rotateY: d * 12,
                    scale: 0.94,
                    filter: "blur(8px)",
                  }),
                  center: {
                    opacity: 1,
                    x: 0,
                    rotateY: 0,
                    scale: 1,
                    filter: "blur(0px)",
                  },
                  exit: (d: number) => ({
                    opacity: 0,
                    x: -d * 80,
                    rotateY: -d * 12,
                    scale: 0.94,
                    filter: "blur(8px)",
                  }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 280, damping: 28, mass: 0.8 }}
                style={{ transformPerspective: 1200 }}
              >
                <div className="rounded-3xl bg-card/70 backdrop-blur border-2 border-border/50 shadow-2xl shadow-primary/5 p-4 sm:p-8">
                  <QuestionView question={current.q} index={0} />
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Completion banner */}
            <AnimatePresence>
              {allMarked && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-6 rounded-2xl border-2 border-primary/40 bg-primary/10 p-5 flex items-center gap-4"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground">
                    <LuTrophy size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-base">
                      Challenge {readOnly ? "review" : "complete"}!
                    </div>
                    <div className="text-sm text-muted-foreground">
                      You scored{" "}
                      <span className="font-bold text-foreground">
                        {score}/{rows.length}
                      </span>
                      {!readOnly && " · streak saved 🔥"}
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-full bg-primary text-primary-foreground font-bold text-sm cursor-pointer"
                  >
                    Done
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="border-t border-border/40 bg-card/50 backdrop-blur-md px-3 py-3">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            <motion.button
              whileHover={{ scale: 1.08, x: -2 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => goTo(idx - 1)}
              disabled={idx === 0}
              className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full border-2 border-border/60 hover:border-primary/60 hover:bg-primary hover:text-primary-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
            >
              <LuChevronLeft size={18} />
            </motion.button>

            <div className="flex-1 flex items-center gap-2 justify-center">
              {rows.map((r, i) => {
                const sel = session.selected[r.q.id];
                const marked = session.isMarked(r.q.id);
                let color = "border-border/40 bg-background/40 text-muted-foreground";
                if (marked) {
                  if (sel === correctFor(r.q))
                    color =
                      "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
                  else color = "border-red-500 bg-red-500/15 text-red-700 dark:text-red-300";
                } else if (sel !== undefined) {
                  color = "border-primary/60 bg-primary/15 text-primary";
                }
                return (
                  <motion.button
                    key={r.q.id + i}
                    onClick={() => goTo(i)}
                    whileHover={{ scale: 1.2, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                      "shrink-0 w-9 h-9 rounded-full border-2 text-xs font-bold transition-colors cursor-pointer",
                      color,
                      i === idx &&
                        "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110",
                    )}
                    title={`Question ${i + 1}`}
                  >
                    {i + 1}
                  </motion.button>
                );
              })}
            </div>

            <motion.button
              whileHover={{ scale: 1.08, x: 2 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => goTo(idx + 1)}
              disabled={idx === rows.length - 1}
              className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full border-2 border-border/60 hover:border-primary/60 hover:bg-primary hover:text-primary-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
            >
              <LuChevronRight size={18} />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
