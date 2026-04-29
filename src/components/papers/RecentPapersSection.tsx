// "Recent Papers" section for /smart-solve-papers — shows attempted /
// submitted papers as quick-access cards with a progress bar and a Continue
// or Review button. Filterable by status.

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { LuClock4, LuCircleCheck, LuArrowRight, LuHistory, LuChevronDown } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { useRecentPapers, type RecentPaperEntry } from "@/lib/recentPapers";
import { getMergedPaperById } from "@/admin/merge";
import { getPaperById, SUBJECT_COLORS, SUBJECT_LABEL } from "@/data/paperData";

type Filter = "all" | "attempted" | "submitted";

export function RecentPapersSection() {
  const recents = useRecentPapers();
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState(true);

  const filtered = useMemo(() => {
    if (filter === "all") return recents;
    return recents.filter((r) => r.status === filter);
  }, [recents, filter]);

  if (recents.length === 0) return null;

  const counts = {
    all: recents.length,
    attempted: recents.filter((r) => r.status === "attempted").length,
    submitted: recents.filter((r) => r.status === "submitted").length,
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border-2 border-border/60 bg-card/50 backdrop-blur p-4 mb-6"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          <LuHistory size={18} className="text-primary" />
          <h2 className="font-bold">Recent papers</h2>
          <span className="text-xs text-muted-foreground">· {filtered.length}</span>
        </div>
        <LuChevronDown
          size={16}
          className={cn("text-muted-foreground transition", open && "rotate-180")}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                {(["all", "attempted", "submitted"] as Filter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-bold border-2 transition capitalize",
                      filter === f
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border hover:border-primary/50",
                    )}
                  >
                    {f === "all" ? "All recent" : f} · {counts[f]}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((r) => (
                  <RecentPaperCard key={r.paperId} entry={r} />
                ))}
                {filtered.length === 0 && (
                  <div className="col-span-full text-center py-6 text-xs text-muted-foreground">
                    Nothing here yet.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function RecentPaperCard({ entry }: { entry: RecentPaperEntry }) {
  const paper = getMergedPaperById(entry.paperId) ?? getPaperById(entry.paperId);
  if (!paper) return null;
  const colors = SUBJECT_COLORS[paper.subject];
  const isSubmitted = entry.status === "submitted";
  const pct = Math.round((entry.progress || 0) * 100);

  return (
    <Link
      to="/smart-solve-papers/$paperId"
      params={{ paperId: paper.id }}
      className={cn(
        "relative rounded-2xl border-2 border-border/60 p-3 flex flex-col gap-2 overflow-hidden hover:border-foreground/40 transition",
        colors.bg,
      )}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <p className={cn("text-[10px] uppercase tracking-wider font-bold truncate", colors.text)}>
            {SUBJECT_LABEL[paper.subject]}
          </p>
          <h3 className="font-bold leading-tight truncate text-sm">{paper.title}</h3>
        </div>
        <span
          className={cn(
            "shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap",
            isSubmitted
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
              : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40",
          )}
        >
          {isSubmitted ? <LuCircleCheck size={10} /> : <LuClock4 size={10} />}
          {isSubmitted ? "Submitted" : "In progress"}
        </span>
      </div>

      {isSubmitted ? (
        <div className="text-xs text-muted-foreground">
          Score: <span className="font-bold text-foreground">{entry.marks ?? 0}</span> /{" "}
          {entry.total}
        </div>
      ) : (
        <div className="space-y-1">
          <div className="h-1.5 rounded-full bg-background/70 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full bg-primary rounded-full"
            />
          </div>
          <div className="text-[10px] text-muted-foreground font-bold">
            {entry.answered} / {entry.total} answered · {pct}%
          </div>
        </div>
      )}

      <div className="mt-1">
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full",
            isSubmitted ? "bg-emerald-600 text-white" : "bg-primary text-primary-foreground",
          )}
        >
          {isSubmitted ? "Review" : "Continue"} <LuArrowRight size={12} />
        </span>
      </div>
    </Link>
  );
}
