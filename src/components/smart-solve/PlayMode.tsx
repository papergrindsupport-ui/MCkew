import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LuChevronLeft,
  LuChevronRight,
  LuLeaf,
  LuFlaskConical,
  LuAtom,
  LuBookmark,
  LuX,
  LuPlay,
  LuPause,
} from "react-icons/lu";
import { cn } from "@/lib/utils";
import type { Question } from "@/data/questionData";
import { type Paper, parsePaperId, SUBJECT_COLORS, type Subject } from "@/data/paperData";
import { QuestionView } from "@/components/papers/QuestionView";
import { usePaperSession } from "@/components/papers/PaperSession";
import { PaperSettingsButton } from "@/components/papers/PaperSettingsButton";
import { useSmartSolveStore } from "./useSmartSolveStore";
import { QuestionCardMenu } from "./QuestionCardMenu";
import { BookmarkButton } from "@/components/papers/QuestionAnnotations";
import { useAnnotationsStore, qkey } from "@/components/papers/useAnnotationsStore";
import { SmartSolveSettingsButton } from "./SmartSolveSettingsButton";

const SUBJECT_ICON: Record<Subject, typeof LuLeaf> = {
  bio: LuLeaf,
  chem: LuFlaskConical,
  phys: LuAtom,
};

export function PlayMode({ rows }: { rows: { q: Question; paper: Paper }[] }) {
  // Open the modal immediately when this mode is selected — no intro panel.
  const [open, setOpen] = useState(true);
  const ss = useSmartSolveStore();

  // If the user closes the modal, drop back to General mode so they
  // aren't stuck staring at an empty section.
  const handleClose = () => {
    setOpen(false);
    ss.setMode("general");
  };

  return (
    <>
      {/* Tiny placeholder shown only briefly while the modal mounts /
          if the user closes the modal mid-transition. */}
      <div className="rounded-3xl border-2 border-dashed border-primary/30 bg-card/30 backdrop-blur p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/15 text-primary mb-2">
          <LuPlay size={20} />
        </div>
        <p className="text-sm text-muted-foreground">
          Play mode is open in fullscreen. Close it to return to General mode.
        </p>
        <button
          onClick={() => setOpen(true)}
          disabled={rows.length === 0}
          className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground font-bold text-sm cursor-pointer disabled:opacity-50"
        >
          <LuPlay size={14} /> Reopen
        </button>
      </div>

      <AnimatePresence>
        {open && rows.length > 0 && <PlayModeModal rows={rows} onClose={handleClose} />}
      </AnimatePresence>
    </>
  );
}

function PlayModeModal({
  rows,
  onClose,
}: {
  rows: { q: Question; paper: Paper }[];
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const goTo = (next: number) => {
    setDir(next > idx ? 1 : -1);
    setIdx(Math.max(0, Math.min(rows.length - 1, next)));
  };
  const [paused, setPaused] = useState(false);
  const ss = useSmartSolveStore();
  const session = usePaperSession();
  const bookmarks = useAnnotationsStore((s) => s.bookmarks);

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Per-question CSS timer animation key (forces restart on idx/duration change)
  const [timerKey, setTimerKey] = useState(0);
  useEffect(() => {
    setTimerKey((k) => k + 1);
  }, [idx, ss.perQuestionTimerSec, ss.perQuestionTimer]);

  // Track elapsed via timeout for auto-advance (smoother than 1s tick)
  useEffect(() => {
    if (!ss.perQuestionTimer || paused) return;
    const ms = ss.perQuestionTimerSec * 1000;
    const id = setTimeout(() => {
      setDir(1);
      setIdx((i) => Math.min(rows.length - 1, i + 1));
    }, ms);
    return () => clearTimeout(id);
  }, [timerKey, ss.perQuestionTimer, ss.perQuestionTimerSec, paused, rows.length]);

  // Auto-advance 2s after instant marking
  const currentQid = rows[idx]?.q.id;
  const currentMarked = currentQid ? session.isMarked(currentQid) : false;
  const isInstant = session.settings.submissionMode === "instant";
  useEffect(() => {
    if (!ss.perQuestionTimer || !isInstant || !currentMarked) return;
    if (idx >= rows.length - 1) return;
    const t = setTimeout(() => {
      setDir(1);
      setIdx((i) => Math.min(rows.length - 1, i + 1));
    }, 2000);
    return () => clearTimeout(t);
  }, [currentMarked, isInstant, ss.perQuestionTimer, idx, rows.length]);

  // Keyboard: arrows + Esc
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

  if (typeof document === "undefined") return null;

  const current = rows[idx];
  const parsed = parsePaperId(current.paper.id);
  const Icon = parsed ? SUBJECT_ICON[parsed.subject] : LuLeaf;
  const colors = parsed ? SUBJECT_COLORS[parsed.subject] : SUBJECT_COLORS.bio;
  const progressPct = ((idx + 1) / rows.length) * 100;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex flex-col"
    >
      {/* Animated gradient backdrop */}
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
        {/* Top bar */}
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
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              Question {idx + 1} of {rows.length}
            </div>
            <div className="font-bold text-sm sm:text-base truncate">
              Q{current.q.number} · {parsed?.year} {parsed?.session} {parsed?.variant}
            </div>
          </div>

          {ss.perQuestionTimer && (
            <button
              onClick={() => setPaused((p) => !p)}
              title={paused ? "Resume timer" : "Pause timer"}
              className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-full border-2 border-border/60 hover:border-primary/60 hover:text-primary transition cursor-pointer"
            >
              {paused ? <LuPlay size={14} /> : <LuPause size={14} />}
            </button>
          )}
          <SmartSolveSettingsButton />
          <BookmarkButton paperId={current.paper.id} qid={current.q.id} className="w-9 h-9" />
          <QuestionCardMenu paper={current.paper} qid={current.q.id} />
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

        {/* Progress bar (overall) */}
        <div className="h-1 bg-muted/40 relative overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary/70 to-primary"
            animate={{ width: `${progressPct}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
          />
        </div>

        {/* Per-question timer — uses CSS animation for buttery-smooth fill */}
        {ss.perQuestionTimer && (
          <div className="h-1.5 bg-muted/30 relative overflow-hidden">
            <div
              key={timerKey}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500"
              style={{
                width: "100%",
                transformOrigin: "left",
                animation: paused
                  ? "none"
                  : `playmode-timer ${ss.perQuestionTimerSec}s linear forwards`,
              }}
            />
          </div>
        )}

        {/* Question body */}
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
                transition={{
                  type: "spring",
                  stiffness: 280,
                  damping: 28,
                  mass: 0.8,
                }}
                style={{ transformPerspective: 1200 }}
              >
                <div className="rounded-3xl bg-card/70 backdrop-blur border-2 border-border/50 shadow-2xl shadow-primary/5 p-4 sm:p-8">
                  <QuestionView question={current.q} index={0} />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom nav strip */}
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

            <div className="flex-1 overflow-x-auto">
              <div className="flex items-center gap-1.5 px-1 justify-center min-w-max">
                {rows.map((r, i) => {
                  const sel = session.selected[r.q.id];
                  const marked = session.isMarked(r.q.id);
                  const isBookmarked = !!bookmarks[qkey(r.paper.id, r.q.id)];
                  let color = "border-border/40 bg-background/40 text-muted-foreground";
                  if (marked) {
                    const correct = session.correctFor(r.q);
                    if (sel === correct)
                      color =
                        "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
                    else color = "border-red-500 bg-red-500/15 text-red-700 dark:text-red-300";
                  } else if (sel !== undefined) {
                    color = "border-primary/60 bg-primary/15 text-primary";
                  }
                  if (isBookmarked)
                    color =
                      "border-yellow-500 bg-yellow-400/40 text-yellow-900 dark:text-yellow-100";
                  return (
                    <motion.button
                      key={r.q.id + i}
                      onClick={() => goTo(i)}
                      whileHover={{ scale: 1.2, y: -2 }}
                      whileTap={{ scale: 0.9 }}
                      className={cn(
                        "relative shrink-0 w-7 h-7 rounded-full border-2 text-[10px] font-bold transition-colors cursor-pointer",
                        color,
                        i === idx &&
                          "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110",
                      )}
                      title={`Q${r.q.number}${isBookmarked ? " · bookmarked" : ""}`}
                    >
                      {i + 1}
                      {isBookmarked && (
                        <LuBookmark
                          size={7}
                          fill="currentColor"
                          className="absolute -top-1 -right-1 text-yellow-600 dark:text-yellow-400"
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
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
