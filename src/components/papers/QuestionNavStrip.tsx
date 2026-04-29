import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LuChevronLeft,
  LuChevronRight,
  LuChevronUp,
  LuChevronDown,
  LuBookmark,
} from "react-icons/lu";
import { cn } from "@/lib/utils";
import { usePaperSession } from "./PaperSession";
import { useAnnotationsStore, qkey } from "./useAnnotationsStore";

export function QuestionNavStrip() {
  const session = usePaperSession();
  const bookmarks = useAnnotationsStore((s) => s.bookmarks);
  const [open, setOpen] = useState(true);

  if (!session.settings.showNavStrip) return null;

  const pos = session.settings.navStripPosition;
  const isVertical = pos === "right" || pos === "left";

  const goTo = (n: number) => {
    const el = document.getElementById(`question-${n}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const wrapperPos: Record<string, string> = {
    right: "right-1 sm:right-2 top-1/2 -translate-y-1/2",
    left: "left-1 sm:left-2 top-1/2 -translate-y-1/2",
    top: "top-16 left-1/2 -translate-x-1/2 max-w-[calc(100vw-0.5rem)]",
    bottom: "bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 max-w-[calc(100vw-0.5rem)]",
  };

  const ChevronIn = isVertical
    ? pos === "right"
      ? LuChevronRight
      : LuChevronLeft
    : pos === "top"
      ? LuChevronUp
      : LuChevronDown;
  const ChevronOut = isVertical
    ? pos === "right"
      ? LuChevronLeft
      : LuChevronRight
    : pos === "top"
      ? LuChevronDown
      : LuChevronUp;

  return (
    <div className={cn("fixed z-40 print:hidden", wrapperPos[pos])}>
      <AnimatePresence initial={false} mode="wait">
        {open ? (
          <motion.div
            key="open"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className={cn(
              "rounded-full border border-border/50 bg-card/90 backdrop-blur-xl shadow-lg",
              isVertical ? "py-2 px-1.5 max-h-[80vh]" : "py-1.5 px-2 max-w-[92vw]",
            )}
          >
            <div
              className={cn(
                "flex items-center",
                isVertical ? "flex-col gap-1.5" : "flex-row gap-1.5",
              )}
            >
              <button
                onClick={() => setOpen(false)}
                className="shrink-0 w-6 h-6 rounded-full hover:bg-accent text-muted-foreground flex items-center justify-center"
                title="Collapse"
              >
                <ChevronIn size={12} />
              </button>
              <div
                className={cn(
                  "flex items-center gap-1.5 scroll-smooth scrollbar-thin",
                  isVertical
                    ? "flex-col overflow-y-auto overflow-x-hidden max-h-[70vh] py-1"
                    : "flex-row overflow-x-auto overflow-y-hidden max-w-[80vw] px-1",
                )}
              >
                {session.questions.map((q) => {
                  const sel = session.selected[q.id];
                  const isAnswered = sel !== undefined;
                  const isBookmarked = !!bookmarks[qkey(session.paperId, q.id)];
                  let color =
                    "border-border/40 bg-background/40 text-muted-foreground hover:border-primary/50";
                  if (session.paperSubmitted) {
                    const correct = session.correctFor(q);
                    if (sel === correct)
                      color =
                        "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
                    else if (sel != null)
                      color = "border-red-500 bg-red-500/15 text-red-700 dark:text-red-300";
                    else
                      color =
                        "border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-300";
                  } else if (session.isMarked(q.id) && isAnswered) {
                    color = "border-primary bg-primary text-primary-foreground";
                  } else if (isAnswered) {
                    color = "border-primary/60 bg-primary/15 text-primary";
                  }
                  if (isBookmarked) {
                    color =
                      "border-yellow-500 bg-yellow-400/40 text-yellow-900 dark:text-yellow-100";
                  }
                  return (
                    <button
                      key={q.id}
                      onClick={() => goTo(Number(q.number))}
                      className={cn(
                        "relative shrink-0 w-7 h-7 rounded-full border text-[10px] font-bold flex items-center justify-center transition-all hover:scale-110",
                        color,
                      )}
                      title={`Q${q.number}${isBookmarked ? " · bookmarked" : ""}`}
                    >
                      {q.number}
                      {isBookmarked && (
                        <LuBookmark
                          size={8}
                          fill="currentColor"
                          className="absolute -top-1 -right-1 text-yellow-600 dark:text-yellow-400 drop-shadow"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="closed"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setOpen(true)}
            className="w-9 h-9 rounded-full border border-border/50 bg-card/90 backdrop-blur-xl shadow-lg flex items-center justify-center hover:border-primary/60"
            title="Show navigation"
          >
            <ChevronOut size={16} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
