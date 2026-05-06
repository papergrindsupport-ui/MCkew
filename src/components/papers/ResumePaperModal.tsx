// Modal shown when a user opens a paper that they have either attempted
// (some answers selected) or already submitted. Asks them to choose between
// restarting (resets the session) or continuing / reviewing.
//
// Rendered inside the paper route. Shows on every mount (per user preference).

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LuRefreshCw, LuArrowRight, LuCircleCheck, LuClock4 } from "react-icons/lu";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { usePaperSession } from "@/components/papers/PaperSession";
import { hasAttemptedPaper, hasSubmittedPaper } from "@/lib/recentPapers";
import { cn } from "@/lib/utils";

export function ResumePaperModal() {
  const session = usePaperSession();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"submitted" | "attempted" | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (session.settings.submissionMode !== "end-of-paper") return;
    const submitted = hasSubmittedPaper(session.paperId);
    const attempted = hasAttemptedPaper(session.paperId);
    if (submitted) {
      setMode("submitted");
      setOpen(true);
    } else if (attempted) {
      setMode("attempted");
      setOpen(true);
    }
    // Only run on the first mount of this component.
    // Mode changes later should not reopen the resume modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (session.settings.submissionMode !== "end-of-paper") return null;

  const onRestart = () => {
    session.reattemptPaper();
    setOpen(false);
  };
  const onContinue = () => setOpen(false);

  if (!mode) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-2 border-border/60 bg-card/95 backdrop-blur">
        <AnimatePresence>
          <motion.div
            key="resume"
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="p-6 space-y-4"
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "inline-flex items-center justify-center w-12 h-12 rounded-2xl border-2",
                  mode === "submitted"
                    ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/40"
                    : "bg-amber-500/15 text-amber-600 border-amber-500/40",
                )}
              >
                {mode === "submitted" ? <LuCircleCheck size={22} /> : <LuClock4 size={22} />}
              </span>
              <div>
                <h2 className="text-lg font-bold">
                  {mode === "submitted"
                    ? "Paper already submitted"
                    : "Continue where you left off?"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {mode === "submitted"
                    ? "You can review your answers or restart the paper from scratch."
                    : "Pick up where you stopped, or start fresh."}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={onRestart}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-bold border-2 border-border bg-card hover:border-destructive/60 hover:text-destructive transition cursor-pointer"
              >
                <LuRefreshCw size={14} /> Restart
              </button>
              <button
                type="button"
                onClick={onContinue}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition cursor-pointer"
              >
                {mode === "submitted" ? "Review answers" : "Continue"}
                <LuArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
