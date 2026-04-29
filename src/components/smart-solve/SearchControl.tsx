// SmartSolve contextual search — on-page only.
//
// Collapsed: small search icon button.
// Expanded: an inline search bar (in-flow, NOT a popover/modal) with a
// "search settings" icon-button that drops down a small panel for mode,
// scope, and the "consider filters" toggle. Live typing updates the
// shared store, so the page's cards re-filter dynamically — no preview
// list is rendered here.
//
// A separate Cmd-K modal (ContextualSearchModal) renders results too,
// but submitting it does NOT navigate to /search. Instead it copies the
// query + settings into the store, closes the modal, and opens this
// inline bar pre-filled.

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LuSearch, LuX, LuInfo, LuSettings2, LuArrowRight, LuChevronDown } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { useSmartSolveSearchStore } from "./useSmartSolveSearchStore";
import {
  SEARCH_MODE_LABELS,
  SEARCH_MODE_HELP,
  QUESTION_SCOPE_LABELS,
  PAPER_SCOPE_LABELS,
  paperMatches,
  questionMatches,
  type SearchMode,
  type QuestionScope,
  type PaperScope,
} from "./searchEngine";
import { getMergedPapers } from "@/admin/merge";
import { getPaperQuestions } from "@/data/paperQuestions";
import { QuestionResultCard, PaperResultCard } from "./SearchResultPreview";
import type { Question } from "@/data/questionData";
import type { Paper } from "@/data/paperData";
import { ImageSearchButton } from "@/components/ImageSearchButton";

interface Props {
  variant: "questions" | "papers";
}

export function SearchControl({ variant }: Props) {
  const s = useSmartSolveSearchStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Esc collapses the inline bar. Cmd-K is handled at the page/Navbar level.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && s.inlineOpen) s.setInlineOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s]);

  // When inline opens, focus the input.
  useEffect(() => {
    if (s.inlineOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [s.inlineOpen]);

  const submitInline = () => {
    s.submit();
    // Stay on page; just commit the search so cards re-filter.
  };

  return (
    <>
      <div ref={containerRef} className="relative inline-flex items-center">
        <AnimatePresence initial={false} mode="wait">
          {!s.inlineOpen ? (
            <motion.button
              key="trigger"
              type="button"
              onClick={() => s.setInlineOpen(true)}
              aria-label="Search"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "inline-flex items-center justify-center w-9 h-9 rounded-full border-2 transition cursor-pointer",
                s.active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border hover:border-primary/50",
              )}
            >
              <LuSearch size={15} />
            </motion.button>
          ) : (
            <motion.form
              key="bar"
              onSubmit={(e) => {
                e.preventDefault();
                submitInline();
              }}
              initial={{ width: 36, opacity: 0.6 }}
              animate={{ width: "min(72vw, 440px)", opacity: 1 }}
              exit={{ width: 36, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
              className="flex items-center gap-1.5 rounded-full border-2 border-border/60 bg-card pl-3 pr-1 h-9 focus-within:border-primary overflow-hidden"
            >
              <LuSearch size={14} className="text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={s.query}
                onChange={(e) => {
                  s.setQuery(e.target.value);
                  // Auto-activate on typing so page cards filter dynamically.
                  if (e.target.value.trim()) s.submit();
                }}
                placeholder={
                  variant === "papers" ? "Search papers, topics…" : "Search questions, topics…"
                }
                className="flex-1 min-w-0 bg-transparent outline-none text-sm"
              />
              {s.query && (
                <motion.button
                  type="button"
                  onClick={() => s.clear()}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                  aria-label="Clear"
                >
                  <LuX size={13} />
                </motion.button>
              )}

              <ImageSearchButton
                onText={(text) => {
                  s.setQuery(text);
                  s.setMode("lenient");
                  s.submit();
                }}
              />

              {/* Settings icon button — animates in playfully */}
              <Popover>
                <PopoverTrigger asChild>
                  <motion.button
                    type="button"
                    aria-label="Search settings"
                    initial={{ opacity: 0, x: 12, rotate: -90, scale: 0.6 }}
                    animate={{ opacity: 1, x: 0, rotate: 0, scale: 1 }}
                    transition={{
                      delay: 0.12,
                      type: "spring",
                      stiffness: 380,
                      damping: 18,
                    }}
                    whileHover={{ rotate: 25 }}
                    whileTap={{ scale: 0.9 }}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-border/60 bg-background hover:border-primary/60 cursor-pointer shrink-0"
                  >
                    <LuSettings2 size={12} />
                  </motion.button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-[300px] p-3 space-y-2 border-2 border-border/60"
                >
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Search settings
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ModeDropdown />
                    {variant === "questions" ? <QuestionScopeDropdown /> : <PaperScopeDropdown />}
                  </div>
                  <label className="flex items-center justify-between gap-2 text-[11px] font-bold cursor-pointer pt-1">
                    Consider page filters
                    <Switch
                      checked={s.considerFilters}
                      onCheckedChange={(v) => s.setConsiderFilters(v)}
                    />
                  </label>
                </PopoverContent>
              </Popover>

              <motion.button
                type="button"
                onClick={() => s.setInlineOpen(false)}
                aria-label="Close search"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.16 }}
                className="inline-flex items-center justify-center w-7 h-7 rounded-full hover:bg-muted/50 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
              >
                <LuX size={13} />
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Cmd-K modal lives here, opened by parent page via the store. */}
      <Dialog open={s.modalOpen} onOpenChange={s.setModalOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden border-2 border-border/60 bg-card/95 backdrop-blur">
          <ContextualSearchModalBody
            variant={variant}
            onSubmitToInline={() => {
              s.submit();
              s.setModalOpen(false);
              s.setInlineOpen(true);
            }}
            onClose={() => s.setModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ============ Cmd-K modal body ============ */

function ContextualSearchModalBody({
  variant,
  onSubmitToInline,
  onClose,
}: {
  variant: "questions" | "papers";
  onSubmitToInline: () => void;
  onClose: () => void;
}) {
  const s = useSmartSolveSearchStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  const { questions, papers } = useLiveResults(s.query, s.mode, variant);

  return (
    <motion.div
      initial={{ opacity: 0, y: 80, scale: 0.92, rotate: -1.5 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
      exit={{ opacity: 0, y: 60, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 280, damping: 22, mass: 0.9 }}
      className="flex flex-col max-h-[78vh]"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmitToInline();
        }}
        className="flex items-center gap-2 border-b border-border/60 px-4 py-3"
      >
        <LuSearch size={16} className="text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          value={s.query}
          onChange={(e) => s.setQuery(e.target.value)}
          placeholder="Search questions, papers, topics…"
          className="flex-1 bg-transparent outline-none text-sm"
        />
        <kbd className="text-[10px] font-mono opacity-70 border border-current/30 rounded px-1">
          ⌘K
        </kbd>
        {s.query && (
          <button
            type="button"
            onClick={() => s.setQuery("")}
            className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
            aria-label="Clear"
          >
            <LuX size={14} />
          </button>
        )}
        <ImageSearchButton
          onText={(text) => {
            s.setQuery(text);
            s.setMode("lenient");
          }}
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
        >
          Apply <LuArrowRight size={12} />
        </button>
      </form>

      {/* Collapsible settings */}
      <div className="border-b border-border/60">
        <button
          type="button"
          onClick={() => setSettingsOpen((o) => !o)}
          className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold hover:bg-muted/40 transition cursor-pointer"
        >
          <LuSettings2 size={12} /> Search settings
          <motion.span animate={{ rotate: settingsOpen ? 180 : 0 }} className="ml-auto">
            <LuChevronDown size={12} />
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {settingsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="p-3 flex flex-wrap items-center gap-2 border-t border-border/60 bg-muted/20">
                <ModeDropdown />
                {variant === "questions" ? <QuestionScopeDropdown /> : <PaperScopeDropdown />}
                <label className="ml-auto inline-flex items-center gap-2 text-[11px] font-bold cursor-pointer">
                  <Switch
                    checked={s.considerFilters}
                    onCheckedChange={(v) => s.setConsiderFilters(v)}
                  />
                  Consider filters
                </label>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <LiveResultsList
          query={s.query}
          questions={questions}
          papers={papers}
          onQuestionClick={(q, p) => {
            scrollToQuestion(q, p);
            onClose();
          }}
          onApply={onSubmitToInline}
        />
      </div>
    </motion.div>
  );
}

/* ============ Shared live results list (modal only) ============ */

function LiveResultsList({
  query,
  questions,
  papers,
  onQuestionClick,
  onApply,
}: {
  query: string;
  questions: { q: Question; paper: Paper }[];
  papers: Paper[];
  onQuestionClick: (q: Question, p: Paper) => void;
  onApply: () => void;
}) {
  const total = questions.length + papers.length;
  if (!query.trim()) {
    return (
      <div className="text-center py-6 text-xs text-muted-foreground">
        Start typing — results preview here, or hit Apply to filter the page.
      </div>
    );
  }
  if (total === 0) {
    return (
      <div className="text-center py-6 text-xs text-muted-foreground">
        No matches. Try a different mode in search settings.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {papers.length > 0 && (
        <div>
          <div className="flex items-baseline gap-2 mb-1 px-1">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Papers
            </h3>
            <span className="text-[10px] text-muted-foreground">{papers.length}</span>
          </div>
          <div className="grid gap-1.5">
            {papers.slice(0, 5).map((p) => (
              <PaperResultCard key={p.id} paper={p} query={query} />
            ))}
          </div>
        </div>
      )}
      {questions.length > 0 && (
        <div>
          <div className="flex items-baseline gap-2 mb-1 px-1">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Questions
            </h3>
            <span className="text-[10px] text-muted-foreground">{questions.length}</span>
          </div>
          <div className="grid gap-1.5">
            {questions.slice(0, 40).map((r) => (
              <QuestionResultCard
                key={`${r.paper.id}-${r.q.id}`}
                q={r.q}
                paper={r.paper}
                query={query}
                onClick={() => onQuestionClick(r.q, r.paper)}
              />
            ))}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={onApply}
        className="w-full mt-1 inline-flex items-center justify-center gap-1 text-xs font-bold px-3 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
      >
        Apply to page <LuArrowRight size={12} />
      </button>
    </div>
  );
}

/* ============ Live results hook ============ */

function useLiveResults(query: string, mode: SearchMode, variant: "questions" | "papers") {
  return useMemo(() => {
    const q = query.trim();
    if (!q) return { questions: [], papers: [] };
    const PAPERS = getMergedPapers();
    const papers = PAPERS.filter((p) => paperMatches(p, q, mode)).slice(0, 50);

    const questions: { q: Question; paper: Paper }[] = [];
    const MAX = 80;
    for (const p of PAPERS) {
      const qs = getPaperQuestions(p.id);
      for (const qu of qs) {
        if (questionMatches(qu, q, mode, "everything")) {
          questions.push({ q: qu, paper: p });
          if (questions.length >= MAX) break;
        }
      }
      if (questions.length >= MAX) break;
    }
    void variant;
    return { questions, papers };
  }, [query, mode, variant]);
}

/* ============ Navigation / scroll helpers ============ */

function scrollToQuestion(q: Question, p: Paper) {
  const id = `smartq-${p.id}-${q.id}`;
  requestAnimationFrame(() => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-4", "ring-primary/60");
      setTimeout(() => el.classList.remove("ring-4", "ring-primary/60"), 1800);
    }
  });
}

/* ---------- Dropdowns with tooltip-explained options ---------- */

function ModeDropdown() {
  const s = useSmartSolveSearchStore();
  const modes: SearchMode[] = ["broad", "strict", "fuzzy", "wholeWord", "strictest", "lenient"];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-bold border-2 border-border bg-card hover:border-primary/50 transition cursor-pointer"
        >
          Mode: {SEARCH_MODE_LABELS[s.mode]}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 p-1">
        <TooltipProvider delayDuration={150}>
          {modes.map((m) => (
            <DropdownMenuItem
              key={m}
              onSelect={(e) => {
                e.preventDefault();
                s.setMode(m);
              }}
              className={cn(
                "flex items-center justify-between gap-2 cursor-pointer rounded-md",
                s.mode === m && "bg-primary/15 text-primary font-bold",
              )}
            >
              <span>{SEARCH_MODE_LABELS[m]}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    onClick={(e) => e.stopPropagation()}
                    className="text-muted-foreground hover:text-primary cursor-help"
                  >
                    <LuInfo size={12} />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[260px] text-xs leading-relaxed">
                  {SEARCH_MODE_HELP[m]}
                </TooltipContent>
              </Tooltip>
            </DropdownMenuItem>
          ))}
        </TooltipProvider>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function QuestionScopeDropdown() {
  const s = useSmartSolveSearchStore();
  const scopes: QuestionScope[] = ["everything", "stem", "options", "tagsMeta", "paperInfo"];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-bold border-2 border-border bg-card hover:border-primary/50 transition cursor-pointer"
        >
          Scope: {QUESTION_SCOPE_LABELS[s.questionScope]}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60 p-1">
        {scopes.map((sc) => (
          <DropdownMenuItem
            key={sc}
            onSelect={(e) => {
              e.preventDefault();
              s.setQuestionScope(sc);
            }}
            className={cn(
              "cursor-pointer rounded-md",
              s.questionScope === sc && "bg-primary/15 text-primary font-bold",
            )}
          >
            {QUESTION_SCOPE_LABELS[sc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PaperScopeDropdown() {
  const s = useSmartSolveSearchStore();
  const scopes: PaperScope[] = ["paperOnly", "papersAndQuestions"];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-bold border-2 border-border bg-card hover:border-primary/50 transition cursor-pointer"
        >
          Scope: {PAPER_SCOPE_LABELS[s.paperScope]}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60 p-1">
        {scopes.map((sc) => (
          <DropdownMenuItem
            key={sc}
            onSelect={(e) => {
              e.preventDefault();
              s.setPaperScope(sc);
            }}
            className={cn(
              "cursor-pointer rounded-md",
              s.paperScope === sc && "bg-primary/15 text-primary font-bold",
            )}
          >
            {PAPER_SCOPE_LABELS[sc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
