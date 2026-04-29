// Single-question play-mode modal — used by the analytics timeline so users
// can re-open any past question in a focused overlay. Mirrors the PlayMode
// presentation (portal, blurred backdrop, QuestionView) but for one question.

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { LuX, LuLeaf, LuFlaskConical, LuAtom } from "react-icons/lu";
import { cn } from "@/lib/utils";
import type { Question, OptionLetter } from "@/data/questionData";
import { parsePaperId, SUBJECT_COLORS, type Subject } from "@/data/paperData";
import { QuestionView } from "@/components/papers/QuestionView";
import { PaperSessionProvider } from "@/components/papers/PaperSession";
import { getAnswerKey } from "@/data/answerKey";

const SUBJECT_ICON: Record<Subject, typeof LuLeaf> = {
  bio: LuLeaf,
  chem: LuFlaskConical,
  phys: LuAtom,
};

const correctFor = (q: Question): OptionLetter => {
  const idx = Number(q.number) - 1;
  return getAnswerKey(q.paperId)[idx] ?? "A";
};

export function SingleQuestionPlayModal({
  question,
  onClose,
}: {
  question: Question;
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const parsed = parsePaperId(question.paperId);
  const subject = parsed?.subject ?? "bio";
  const Icon = SUBJECT_ICON[subject];
  const colors = SUBJECT_COLORS[subject];

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex flex-col"
    >
      <PaperSessionProvider
        paperId={question.paperId}
        questions={[question]}
        correctForOverride={correctFor}
        initialSettings={{ submissionMode: "instant" }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
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
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                Replay · single question
              </div>
              <div className="font-bold text-sm sm:text-base truncate">
                Q{question.number} · {parsed?.year} {parsed?.session} {parsed?.variant}
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

          <div className="flex-1 overflow-auto">
            <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
              <div className="rounded-3xl bg-card/70 backdrop-blur border-2 border-border/50 shadow-2xl shadow-primary/5 p-4 sm:p-8">
                <QuestionView question={question} index={0} />
              </div>
            </div>
          </div>
        </motion.div>
      </PaperSessionProvider>
    </motion.div>,
    document.body,
  );
}
