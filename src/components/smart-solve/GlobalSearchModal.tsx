// Global search triggered from the navbar. Always shows sections
// (Questions · Papers · Pages), each collapsed to a handful of items with a
// "Show more / less" expander. Enter or the "Search" button navigates to
// /search?q=...

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import { LuSearch, LuX, LuArrowRight, LuChevronDown } from "react-icons/lu";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ImageSearchButton } from "@/components/ImageSearchButton";
import { cn } from "@/lib/utils";
import { getMergedPapers } from "@/admin/merge";
import { getPaperQuestions } from "@/data/paperQuestions";
import { paperMatches, questionMatches, type SearchMode, SEARCH_MODE_LABELS } from "./searchEngine";
import { PAGE_INDEX, matchPage } from "./pageIndex";
import { QuestionResultCard, PaperResultCard, PageResultCard } from "./SearchResultPreview";
import type { Question } from "@/data/questionData";
import type { Paper } from "@/data/paperData";

export function GlobalSearchModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<SearchMode>("broad");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const results = useMemo(() => {
    const query = q.trim();
    if (!query) return { questions: [], papers: [], pages: [] as typeof PAGE_INDEX };
    const PAPERS = getMergedPapers();
    const papers = PAPERS.filter((p) => paperMatches(p, query, mode)).slice(0, 50);
    const questions: { q: Question; paper: Paper }[] = [];
    const MAX = 120;
    for (const p of PAPERS) {
      const qs = getPaperQuestions(p.id);
      for (const qu of qs) {
        if (questionMatches(qu, query, mode, "everything")) {
          questions.push({ q: qu, paper: p });
          if (questions.length >= MAX) break;
        }
      }
      if (questions.length >= MAX) break;
    }
    const pages = PAGE_INDEX.filter((pg) => matchPage(pg, query));
    return { questions, papers, pages };
  }, [q, mode]);

  const submit = () => {
    if (!q.trim()) return;
    onOpenChange(false);
    navigate({ to: "/search", search: { q, mode } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-2 border-border/60 bg-card/95 backdrop-blur">
        <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.15 }}         
     className="flex flex-col max-h-[78vh]"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex items-center gap-2 border-b border-border/60 px-4 py-3"
          >
            <LuSearch size={16} className="text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search everything — questions, papers, pages…"
              className="flex-1 bg-transparent outline-none text-sm"
            />
            <kbd className="text-[10px] font-mono opacity-70 border border-current/30 rounded px-1">
              ⌘K
            </kbd>
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="text-muted-foreground hover:text-foreground p-1"
                aria-label="Clear"
              >
                <LuX size={14} />
              </button>
            )}
            <ImageSearchButton
              onText={(text) => {
                setQ(text);
                setMode("lenient");
              }}
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90"
            >
              Search <LuArrowRight size={12} />
            </button>
          </form>

          {/* Mode selector (slim) */}
          <div className="flex flex-wrap gap-1.5 px-4 py-2 border-b border-border/60 bg-muted/20">
            {(
              ["broad", "strict", "fuzzy", "wholeWord", "strictest", "lenient"] as SearchMode[]
            ).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-bold border transition",
                  mode === m
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border/60 hover:border-primary/50",
                )}
              >
                {SEARCH_MODE_LABELS[m]}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {!q.trim() ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                Type to search questions, papers, and pages.
              </div>
            ) : (
              <>
                <ExpandableSection
                  title="Questions"
                  total={results.questions.length}
                  initial={5}
                  cap={40}
                  onMore={submit}
                  renderItem={(i) => {
                    const r = results.questions[i];
                    return (
                      <QuestionResultCard
                        key={`${r.paper.id}-${r.q.id}`}
                        q={r.q}
                        paper={r.paper}
                        query={q}
                      />
                    );
                  }}
                />
                <ExpandableSection
                  title="Papers"
                  total={results.papers.length}
                  initial={4}
                  cap={40}
                  onMore={submit}
                  renderItem={(i) => (
                    <PaperResultCard
                      key={results.papers[i].id}
                      paper={results.papers[i]}
                      query={q}
                    />
                  )}
                  gridCols="sm:grid-cols-2"
                />
                <ExpandableSection
                  title="Pages"
                  total={results.pages.length}
                  initial={4}
                  cap={40}
                  onMore={submit}
                  renderItem={(i) => (
                    <PageResultCard key={results.pages[i].to} page={results.pages[i]} query={q} />
                  )}
                  gridCols="sm:grid-cols-2"
                />
              </>
            )}
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

function ExpandableSection({
  title,
  total,
  initial,
  cap,
  onMore,
  renderItem,
  gridCols,
}: {
  title: string;
  total: number;
  initial: number;
  cap: number;
  onMore: () => void;
  renderItem: (i: number) => React.ReactNode;
  gridCols?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (total === 0) {
    return (
      <section>
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1 px-1">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground italic px-1">No matches.</p>
      </section>
    );
  }
  const visibleMax = Math.min(cap, total);
  const count = expanded ? visibleMax : Math.min(initial, total);
  const hasMoreBeyondCap = total > cap;
  return (
    <section>
      <div className="flex items-baseline gap-2 mb-1 px-1">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        <span className="text-[10px] text-muted-foreground">{total}</span>
      </div>
      <div className={cn("grid gap-1.5", gridCols)}>
        {Array.from({ length: count }, (_, i) => renderItem(i))}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-3">
        {visibleMax > initial && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer"
          >
            {expanded ? "Show less" : `Show ${visibleMax - initial} more`}
            <LuChevronDown size={12} className={cn("transition", expanded && "rotate-180")} />
          </button>
        )}
        {hasMoreBeyondCap && (
          <button
            type="button"
            onClick={onMore}
            className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
          >
            More on Search page →
          </button>
        )}
      </div>
    </section>
  );
}
