import { motion } from "framer-motion";
import {
  LuFlame,
  LuStar,
  LuTag,
  LuTarget,
  LuRepeat,
  LuLeaf,
  LuFlaskConical,
  LuAtom,
  LuSparkles,
  LuRotateCcw,
  LuCheck,
} from "react-icons/lu";
import { cn } from "@/lib/utils";
import type { Question, DataRow } from "@/data/questionData";
import { DIFFICULTY_COLORS, PRIORITY_COLORS } from "@/data/topics";
import { parsePaperId, SUBJECT_COLORS, type Subject } from "@/data/paperData";
import { RichTextInline, RichTextView } from "./RichTextView";
import { ImageBlockView } from "./ImageBlockView";
import { TableBlockView } from "./TableBlockView";
import { ChartBlockView } from "./ChartBlockView";
import { OptionsView, optionLetters } from "./OptionsView";
import { usePaperSession } from "./PaperSession";
import {
  BookmarkButton,
  TagsBar,
  TagPicker,
  CommentsSection,
  CommentDialog,
} from "./QuestionAnnotations";
import { useEffect, useRef, useState } from "react";
import { LuMessageSquarePlus } from "react-icons/lu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMcqKeyboardNav, useKeyboardNavHint } from "./useMcqKeyboardNav";
import { fireMarkingReaction } from "@/lib/gifReactionEngine";
import { qkey as annoQkey } from "./useAnnotationsStore";
import { SelectionAnnotationProvider } from "@/components/annotations/SelectionAnnotationContext";
import { AIExplainerSection } from "@/components/ai/AIExplainerSection";

const SUBJECT_ICON: Record<Subject, typeof LuLeaf> = {
  bio: LuLeaf,
  chem: LuFlaskConical,
  phys: LuAtom,
};

const SESSION_SHORT: Record<string, string> = {
  Feb: "Feb",
  June: "Jun",
  Oct: "Oct",
};

function DataRowView({ row }: { row: DataRow }) {
  if (row.blocks.length === 1) {
    const b = row.blocks[0];
    return (
      <div className="my-3">
        {b.type === "image" && <ImageBlockView block={b} />}
        {b.type === "table" && <TableBlockView block={b} />}
        {b.type === "chart" && <ChartBlockView block={b} />}
      </div>
    );
  }
  return (
    <div className="my-3 grid gap-4 sm:grid-cols-2 items-start">
      {row.blocks.map((b, i) => (
        <div key={i} className="min-w-0">
          {b.type === "image" && <ImageBlockView block={b} />}
          {b.type === "table" && <TableBlockView block={b} />}
          {b.type === "chart" && <ChartBlockView block={b} />}
        </div>
      ))}
    </div>
  );
}

export function QuestionView({
  question,
  index,
  inlineLabel,
}: {
  question: Question;
  index: number;
  /** When set, the full identifying header is hidden and this label
   *  is rendered inline before the question text (e.g. "Biology 3."). */
  inlineLabel?: string;
}) {
  const session = usePaperSession();
  const sel = session.selected[question.id] ?? null;
  const marked = session.isMarked(question.id);
  const correct = session.correctFor(question);
  const mode = session.settings.submissionMode;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const articleRef = useRef<HTMLElement | null>(null);

  // Hint toast on first paper-with-questions visit
  useKeyboardNavHint(question.options ? true : false);

  // Keyboard navigation across options + cross-question jumps
  useMcqKeyboardNav({
    questionId: question.id,
    options: question.options,
    selected: sel,
    onSelect: (l: string) => onSelect(l as never),
    elementRef: articleRef,
    enabled: session.settings.keyboardNav && !!question.options && !marked,
  });

  const onSelect = (l: typeof sel & string) => {
    if (marked) return;
    session.selectAnswer(question.id, l as never);
  };

  const handleSubmitClick = () => {
    if (sel == null && !session.settings.dontAskEmptySubmit) {
      setConfirmOpen(true);
      return;
    }
    session.submitQuestion(question.id);
  };

  const isCorrect = marked && sel === correct;

  // Fire a GIF reaction once when this question transitions into the marked
  // state. Keyed on `marked` so re-renders don't retrigger it.
  const prevMarkedRef = useRef(marked);
  useEffect(() => {
    if (!prevMarkedRef.current && marked) {
      fireMarkingReaction(isCorrect ? 1 : 0, 1);
    }
    prevMarkedRef.current = marked;
  }, [marked, isCorrect]);

  // Track this question as "last viewed" while it's the most-visible article
  // on screen — used to auto-scroll on reload.
  useEffect(() => {
    const el = articleRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const persistKey = session.paperId;
    if (
      !persistKey ||
      persistKey.startsWith("smart-solve-") ||
      persistKey.startsWith("exam-preview:")
    ) {
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            import("@/lib/lastQuestion").then(({ setLastQuestion }) =>
              setLastQuestion(persistKey, question.number),
            );
            break;
          }
        }
      },
      { threshold: [0.5] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [question.number, session.paperId]);

  const showSubmitBtn = !session.readOnly && mode === "per-question" && !marked;
  const showReattempt =
    !session.readOnly &&
    marked &&
    (mode === "per-question" || mode === "instant") &&
    !session.paperSubmitted;

  return (
    <motion.article
      id={`question-${question.number}`}
      ref={articleRef as React.MutableRefObject<HTMLElement | null>}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.35 }}
      className={cn(
        "rounded-2xl sm:rounded-3xl border-2 bg-card/60 backdrop-blur p-3 sm:p-7 print:break-inside-avoid print:bg-card print:p-5 print:rounded-2xl print:border-border print:shadow-none overflow-hidden transition-colors",
        marked
          ? isCorrect
            ? "border-emerald-500/50 ring-2 ring-emerald-500/20"
            : sel == null
              ? "border-amber-500/50 ring-2 ring-amber-500/20"
              : "border-red-500/50 ring-2 ring-red-500/20"
          : "border-border/60",
      )}
    >
      {!inlineLabel && (
        <header className="mb-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {(() => {
              const parsed = parsePaperId(question.paperId);
              if (!parsed) return null;
              const Icon = SUBJECT_ICON[parsed.subject];
              const colors = SUBJECT_COLORS[parsed.subject];
              return (
                <h2 className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-lg sm:text-2xl font-bold tracking-tight min-w-0">
                  <span
                    className={cn(
                      "inline-flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl ring-2 shrink-0",
                      colors.soft,
                      colors.ring,
                    )}
                  >
                    <Icon size={16} />
                  </span>
                  <span>Q{question.number}</span>
                  <span className="text-muted-foreground font-medium">·</span>
                  <span>{SESSION_SHORT[parsed.session] ?? parsed.session}</span>
                  <span>{parsed.year}</span>
                  <span className={cn("px-2 py-0.5 rounded-lg text-xs sm:text-sm", colors.soft)}>
                    {parsed.variant}
                  </span>
                </h2>
              );
            })()}
            {!session.settings.hideAllTags && (
              <div className="ml-auto flex flex-wrap gap-1.5">
                {question.difficulty && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border",
                      DIFFICULTY_COLORS[question.difficulty],
                    )}
                  >
                    <LuFlame size={10} /> {question.difficulty}
                  </span>
                )}
                {question.priority && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border",
                      PRIORITY_COLORS[question.priority],
                    )}
                  >
                    <LuStar size={10} /> {question.priority}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-border/60 bg-background/60">
                  <LuTarget size={10} /> {question.targetGrade}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-border/60 bg-background/60">
                  <LuRepeat size={10} /> ×{question.repetition}
                </span>
              </div>
            )}
            <div
              className={cn("flex items-center gap-1.5", session.settings.hideAllTags && "ml-auto")}
            >
              <BookmarkButton paperId={question.paperId} qid={question.id} />
              {!session.settings.hideCommentButton && (
                <button
                  type="button"
                  onClick={() => setCommentOpen(true)}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-border/50 text-muted-foreground hover:border-primary/60 hover:text-primary transition"
                  title="Add comment"
                >
                  <LuMessageSquarePlus size={14} />
                </button>
              )}
              {!session.settings.hideTagButton && (
                <TagPicker
                  paperId={question.paperId}
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
            </div>
          </div>
          {!session.settings.hideTagButton && (
            <div className="flex flex-wrap items-center gap-1.5">
              <TagsBar paperId={question.paperId} qid={question.id} />
            </div>
          )}
        </header>
      )}
      <CommentDialog
        open={commentOpen}
        onOpenChange={setCommentOpen}
        paperId={question.paperId}
        qid={question.id}
      />

      {question.intro.length > 0 && (
        <section className="prose prose-sm sm:prose-base max-w-none">
          <SelectionAnnotationProvider
            qkey={annoQkey(question.paperId, question.id)}
            blockNamespace="intro"
          >
            <RichTextView rich={question.intro} />
          </SelectionAnnotationProvider>
        </section>
      )}

      {question.data && question.data.length > 0 && (
        <section className="mt-4">
          {question.data.map((row, i) => (
            <DataRowView key={i} row={row} />
          ))}
        </section>
      )}

      <section
        className={cn(
          inlineLabel ? "" : "pt-4 border-t border-border/40",
          question.intro.length > 0 ? "mt-6" : inlineLabel ? "" : "mt-2",
        )}
      >
        <SelectionAnnotationProvider
          qkey={annoQkey(question.paperId, question.id)}
          blockNamespace="text"
        >
          <div className="text-base sm:text-lg leading-relaxed">
            {inlineLabel && <span className="font-bold mr-2 text-primary">{inlineLabel}</span>}
            {inlineLabel ? (
              <RichTextInline rich={question.text} className="inline" />
            ) : (
              <RichTextView rich={question.text} className="inline" />
            )}
          </div>
        </SelectionAnnotationProvider>
      </section>

      {question.options && (
        <section className="mt-5">
          <OptionsView
            options={question.options}
            selected={sel}
            onSelect={(l) => onSelect(l as never)}
            disabled={session.readOnly || marked}
            marked={marked}
            correctLetter={correct}
            showHints={session.settings.showHints || marked}
            eliminatorEnabled={session.settings.mcqEliminator}
            eliminated={session.eliminated[question.id] ?? []}
            onToggleEliminate={(l) => session.toggleEliminate(question.id, l)}
          />
        </section>
      )}

      {/* Marking summary banner */}
      {marked && (
        <div
          className={cn(
            "mt-4 p-3 rounded-2xl border-2 text-sm font-bold flex flex-wrap items-center gap-3",
            isCorrect
              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
              : sel == null
                ? "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300"
                : "bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-300",
          )}
        >
          {isCorrect ? (
            <>
              <LuCheck size={16} /> Correct — answer:{" "}
              <span className="font-extrabold">{correct}</span>
            </>
          ) : sel == null ? (
            <>
              Unattempted — correct answer: <span className="font-extrabold">{correct}</span>
            </>
          ) : (
            <>
              Incorrect — your answer: <span className="font-extrabold">{sel}</span> · correct:{" "}
              <span className="font-extrabold">{correct}</span>
            </>
          )}
        </div>
      )}

      {/* Action row */}
      {(showSubmitBtn || marked) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 print:hidden">
          {showSubmitBtn && (
            <Button onClick={handleSubmitClick} className="rounded-full">
              Submit answer
            </Button>
          )}
          {showReattempt && (
            <Button
              variant="ghost"
              className="rounded-full gap-1.5"
              onClick={() => session.reattemptQuestion(question.id)}
            >
              <LuRotateCcw size={14} /> Reattempt
            </Button>
          )}
        </div>
      )}

      {marked && <AIExplainerSection question={question} userAnswer={sel} correct={correct} />}

      {!session.settings.hideAllTags && (question.tags.length > 0 || question.traps.length > 0) && (
        <footer className="mt-4 pt-3 border-t border-border/30 flex flex-wrap gap-1.5 text-[10px] print:hidden">
          {question.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/40"
            >
              <LuTag size={9} /> {tag}
            </span>
          ))}
          {question.traps.map((trap) => (
            <span
              key={trap}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/30"
            >
              ⚠ {trap}
            </span>
          ))}
        </footer>
      )}

      <CommentsSection paperId={question.paperId} qid={question.id} />

      {/* Confirm submit-without-answer dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Submit without an answer?</DialogTitle>
            <DialogDescription>
              You haven't selected an option for this question. Submitting now will mark it as
              unattempted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              No, go back
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                session.setSettings({ ...session.settings, dontAskEmptySubmit: true });
                setConfirmOpen(false);
                session.submitQuestion(question.id);
              }}
            >
              Don't ask again
            </Button>
            <Button
              onClick={() => {
                setConfirmOpen(false);
                session.submitQuestion(question.id);
              }}
            >
              Yes, submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.article>
  );
}
