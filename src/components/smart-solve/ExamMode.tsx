import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LuChevronLeft, LuChevronRight, LuCircleCheck } from "react-icons/lu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Question } from "@/data/questionData";
import { type Paper, parsePaperId } from "@/data/paperData";
import { QuestionView } from "@/components/papers/QuestionView";
import { usePaperSession } from "@/components/papers/PaperSession";
import { useSmartSolveStore } from "./useSmartSolveStore";
import { QuestionCardMenu } from "./QuestionCardMenu";
import { BookmarkButton } from "@/components/papers/QuestionAnnotations";

export function ExamMode({ rows }: { rows: { q: Question; paper: Paper }[] }) {
  const ss = useSmartSolveStore();
  const session = usePaperSession();
  const [page, setPage] = useState(0);
  const [pageDir, setPageDir] = useState<1 | -1>(1);
  const [askName, setAskName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [tempCenter, setTempCenter] = useState(ss.centerNumber);

  // Ask for name on first entry if missing
  useEffect(() => {
    if (!ss.studentName) setAskName(true);
  }, [ss.studentName]);

  const perPage = ss.paginated ? Math.max(1, ss.questionsPerPage) : rows.length;
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const start = page * perPage;
  const slice = rows.slice(start, start + perPage);

  const goPage = (next: number) => {
    const clamped = Math.max(0, Math.min(totalPages - 1, next));
    setPageDir(clamped > page ? 1 : -1);
    setPage(clamped);
  };

  // Submit-at-end (only available in exam mode end-of-paper submission)
  const showFinalSubmit =
    session.settings.submissionMode === "end-of-paper" && !session.paperSubmitted;
  const finalScore = (() => {
    if (!session.paperSubmitted) return null;
    let correct = 0;
    for (const r of rows) {
      if (session.selected[r.q.id] === session.correctFor(r.q)) correct++;
    }
    return { correct, total: rows.length };
  })();

  return (
    <div className="space-y-6">
      {/* Exam header */}
      <div className="rounded-2xl sm:rounded-3xl border-2 border-border/60 bg-card/60 p-3 sm:p-5">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Candidate
            </div>
            <div className="text-sm sm:text-lg font-bold truncate">
              {ss.studentName || <span className="text-muted-foreground italic">— not set —</span>}
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Centre number
            </div>
            <div className="text-sm sm:text-lg font-bold font-mono truncate">
              {ss.centerNumber || "—"}
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Total questions
            </div>
            <div className="text-sm sm:text-lg font-bold">{rows.length}</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="col-span-2 sm:col-span-1 justify-self-end"
            onClick={() => {
              setTempName(ss.studentName);
              setTempCenter(ss.centerNumber);
              setAskName(true);
            }}
          >
            Edit
          </Button>
        </div>
        {finalScore && (
          <div className="mt-4 p-3 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 flex items-center gap-2">
            <LuCircleCheck size={18} className="text-emerald-600" />
            <span className="font-bold">
              Final mark: {finalScore.correct} / {finalScore.total}
              <span className="text-muted-foreground font-normal ml-2">
                ({Math.round((finalScore.correct / finalScore.total) * 100)}%)
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Pagination header */}
      {ss.paginated && (
        <div className="flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={() => goPage(page - 1)}
            disabled={page === 0}
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full border-2 border-border/60 hover:border-primary/60 disabled:opacity-40 text-xs sm:text-sm font-bold"
          >
            <LuChevronLeft size={14} /> <span className="hidden sm:inline">Previous page</span>
            <span className="sm:hidden">Prev</span>
          </button>
          <span className="text-xs sm:text-sm font-bold text-muted-foreground">
            Page {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => goPage(page + 1)}
            disabled={page === totalPages - 1}
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full border-2 border-border/60 hover:border-primary/60 disabled:opacity-40 text-xs sm:text-sm font-bold"
          >
            <span className="hidden sm:inline">Next page</span>
            <span className="sm:hidden">Next</span> <LuChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Questions — animate per-page swap */}
      <AnimatePresence mode="wait" custom={pageDir}>
        <motion.div
          key={page}
          custom={pageDir}
          initial={{ opacity: 0, x: pageDir * 60, filter: "blur(6px)" }}
          animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, x: -pageDir * 60, filter: "blur(6px)" }}
          transition={{ type: "spring", stiffness: 260, damping: 30, mass: 0.7 }}
          className="space-y-6"
        >
          {slice.map((r, i) => {
            const parsed = parsePaperId(r.paper.id);
            return (
              <motion.div
                key={r.q.id + i}
                id={`smartq-${r.paper.id}-${r.q.id}`}
                className="relative"
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  delay: 0.08 + i * 0.04,
                  type: "spring",
                  stiffness: 320,
                  damping: 26,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold">
                    Q{r.q.number}
                    {parsed && (
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        · {parsed.year} {parsed.session} {parsed.variant}
                      </span>
                    )}
                  </span>
                  <BookmarkButton paperId={r.paper.id} qid={r.q.id} className="ml-auto w-7 h-7" />
                  <QuestionCardMenu paper={r.paper} qid={r.q.id} />
                </div>
                <QuestionView question={r.q} index={i} />
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Pagination footer */}
      {ss.paginated && (
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => goPage(page - 1)}
            disabled={page === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border-2 border-border/60 hover:border-primary/60 disabled:opacity-40 text-sm font-bold"
          >
            <LuChevronLeft size={14} /> Previous
          </button>
          <button
            onClick={() => goPage(page + 1)}
            disabled={page === totalPages - 1}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border-2 border-border/60 hover:border-primary/60 disabled:opacity-40 text-sm font-bold"
          >
            Next <LuChevronRight size={14} />
          </button>
        </div>
      )}

      {showFinalSubmit && (
        <div className="flex justify-center pt-4">
          <Button size="lg" className="rounded-full px-8" onClick={() => session.submitPaper()}>
            Submit exam
          </Button>
        </div>
      )}

      {/* Name modal */}
      <Dialog
        open={askName}
        onOpenChange={(o) => {
          if (ss.studentName) setAskName(o);
        }}
      >
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle>Enter your details</DialogTitle>
            <DialogDescription>
              Like an exam — enter your full name and centre number. Saved for next time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-bold">Full name</Label>
              <Input
                autoFocus
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-bold">Centre number (optional)</Label>
              <Input
                value={tempCenter}
                onChange={(e) => setTempCenter(e.target.value)}
                placeholder="e.g. AB123"
                className={cn("mt-1 font-mono")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (!tempName.trim()) return;
                ss.set("studentName", tempName.trim());
                ss.set("centerNumber", tempCenter.trim());
                setAskName(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
