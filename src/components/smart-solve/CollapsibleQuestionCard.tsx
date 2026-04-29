import { useEffect, useRef, useState } from "react";

// localStorage key for the most-recently-expanded card on this page (one per
// smart-solve route). On revisit we auto-open + scroll to it.
function lastExpandedKey() {
  if (typeof window === "undefined") return "smart-solve-last-expanded:unknown";
  return `smart-solve-last-expanded:${window.location.pathname}`;
}
import { motion, AnimatePresence } from "framer-motion";
import { LuChevronDown, LuLeaf, LuFlaskConical, LuAtom, LuTag } from "react-icons/lu";
import { cn } from "@/lib/utils";
import type { Question } from "@/data/questionData";
import { type Paper, parsePaperId, SUBJECT_COLORS, type Subject } from "@/data/paperData";
import { QuestionView } from "@/components/papers/QuestionView";
import {
  BookmarkButton,
  TagsBar,
  TagPicker,
  CommentsSection,
} from "@/components/papers/QuestionAnnotations";
import { QuestionCardMenu } from "./QuestionCardMenu";
import { usePaperSession } from "@/components/papers/PaperSession";
import { SelectionCheckbox } from "@/components/smart-solve/SelectionCheckbox";

const SUBJECT_ICON: Record<Subject, typeof LuLeaf> = {
  bio: LuLeaf,
  chem: LuFlaskConical,
  phys: LuAtom,
};

export function CollapsibleQuestionCard({
  question,
  paper,
  index,
  defaultOpen,
  selection,
}: {
  question: Question;
  paper: Paper;
  index: number;
  defaultOpen?: boolean;
  selection?: {
    active: boolean;
    selected: boolean;
    onToggle: () => void;
  };
}) {
  const cardKey = `${paper.id}:${question.id}`;
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return defaultOpen ?? false;
    const exp = new URL(window.location.href).searchParams.get("exp");
    if (exp && exp.split("|").includes(cardKey)) return true;
    // Auto-open the most-recently-expanded card from a prior visit.
    try {
      if (window.localStorage.getItem(lastExpandedKey()) === cardKey) return true;
    } catch {
      /* ignore */
    }
    return defaultOpen ?? false;
  });

  // Mirror open state to URL: collect all currently-open cards in `?exp=`.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const cur = (url.searchParams.get("exp") ?? "").split("|").filter(Boolean);
    const set = new Set(cur);
    if (open) set.add(cardKey);
    else set.delete(cardKey);
    const next = Array.from(set).join("|");
    if (next) url.searchParams.set("exp", next);
    else url.searchParams.delete("exp");
    window.history.replaceState(window.history.state, "", url.toString());
    // Persist last-expanded card per page for revisit auto-scroll + auto-open.
    try {
      if (open) window.localStorage.setItem(lastExpandedKey(), cardKey);
      else if (window.localStorage.getItem(lastExpandedKey()) === cardKey) {
        window.localStorage.removeItem(lastExpandedKey());
      }
    } catch {
      /* ignore */
    }
  }, [open, cardKey]);

  // On first mount, scroll this card into view if it matches the persisted
  // last-expanded card. Runs at most once.
  const didAutoScrollRef = useRef(false);
  useEffect(() => {
    if (didAutoScrollRef.current) return;
    if (typeof window === "undefined") return;
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(lastExpandedKey());
    } catch {
      /* ignore */
    }
    if (stored !== cardKey) return;
    didAutoScrollRef.current = true;
    const t = window.setTimeout(() => {
      const el = document.getElementById(`smartq-${question.paperId}-${question.id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => window.clearTimeout(t);
  }, [cardKey, question.paperId, question.id]);
  const session = usePaperSession();
  const parsed = parsePaperId(paper.id);
  if (!parsed) return null;
  const Icon = SUBJECT_ICON[parsed.subject];
  const colors = SUBJECT_COLORS[parsed.subject];

  // Get question status for the indicator
  const questionStatus = session.status[question.id];
  const isAnswered = questionStatus === "answered";
  const isSubmitted = questionStatus === "submitted";
  const selectedAnswer = session.selected[question.id];
  const correctAnswer = session.correctFor(question);
  const isCorrect = isSubmitted && selectedAnswer === correctAnswer;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.4) }}
      id={`smartq-${question.paperId}-${question.id}`}
      className="rounded-2xl border-2 border-border/60 bg-card/60 backdrop-blur overflow-hidden"
    >
      <header className="flex items-center gap-2 p-3">
        {selection?.active && (
          <SelectionCheckbox
            checked={selection.selected}
            onChange={selection.onToggle}
            label={`Select question ${question.number}`}
          />
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex-1 flex items-center gap-2 text-left min-w-0"
        >
          <span
            className={cn(
              "inline-flex items-center justify-center w-8 h-8 rounded-xl ring-2 shrink-0",
              colors.soft,
              colors.ring,
            )}
          >
            <Icon size={14} />
          </span>
          <span className="font-bold text-sm sm:text-base truncate">
            Q{question.number} {parsed.year}{" "}
            {parsed.session === "June" ? "June" : parsed.session === "Feb" ? "Feb" : "Oct"}{" "}
            {parsed.variant}
          </span>
          <LuChevronDown
            size={14}
            className={cn("ml-2 text-muted-foreground transition shrink-0", open && "rotate-180")}
          />
        </button>
        {/* Status indicator: answered (primary circle) or submitted (0/1 with red/green circle) */}
        {isAnswered && (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary shrink-0" />
        )}
        {isSubmitted && (
          <span
            className={cn(
              "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
              isCorrect
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
            )}
          >
            {isCorrect ? "1" : "0"}
          </span>
        )}
        <BookmarkButton paperId={paper.id} qid={question.id} />
        {!session.settings.hideTagButton && (
          <TagPicker
            paperId={paper.id}
            qid={question.id}
            trigger={
              <button
                type="button"
                title="Tags"
                className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-border/50 text-muted-foreground hover:border-primary/60 hover:text-primary transition"
              >
                <LuTag size={14} />
              </button>
            }
          />
        )}
        <QuestionCardMenu paper={paper} qid={question.id} />
      </header>
      {!session.settings.hideTagButton && (
        <div className="px-3 pb-2 flex flex-wrap items-center gap-1.5">
          <TagsBar paperId={paper.id} qid={question.id} />
        </div>
      )}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-3">
              <QuestionView question={question} index={0} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {!open && (
        <div className="px-3 pb-3">
          <CommentsSection paperId={paper.id} qid={question.id} />
        </div>
      )}
    </motion.div>
  );
}
