import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LuLeaf, LuFlaskConical, LuAtom } from "react-icons/lu";
import { cn } from "@/lib/utils";
import type { Question } from "@/data/questionData";
import { type Paper, parsePaperId, SUBJECT_COLORS, type Subject } from "@/data/paperData";
import { QuestionView } from "@/components/papers/QuestionView";
import { CollapsibleQuestionCard } from "./CollapsibleQuestionCard";
import { QuestionCardMenu } from "./QuestionCardMenu";
import { useSmartSolveStore } from "./useSmartSolveStore";
import { SelectionCheckbox } from "@/components/smart-solve/SelectionCheckbox";
import { readUrlParams, writeUrlParams } from "./useUrlState";

const SUBJECT_ICON: Record<Subject, typeof LuLeaf> = {
  bio: LuLeaf,
  chem: LuFlaskConical,
  phys: LuAtom,
};

const DEFAULT_PAGE_SIZE = 15;
const MAX_PAGE_SIZE = 50;

type QuestionSelection = {
  active: boolean;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
};

export function GeneralMode({
  rows,
  selection,
}: {
  rows: { q: Question; paper: Paper }[];
  selection?: QuestionSelection;
}) {
  const ss = useSmartSolveStore();
  const [page, setPage] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    const n = Number(readUrlParams().get("page"));
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
  });
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_PAGE_SIZE;
    const n = Number(readUrlParams().get("perPage"));
    return Number.isFinite(n) && n >= 1
      ? Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(n)))
      : DEFAULT_PAGE_SIZE;
  });

  const safePageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize));
  const totalPages = Math.max(1, Math.ceil(rows.length / safePageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * safePageSize;
  const pageRows = useMemo(
    () => rows.slice(start, start + safePageSize),
    [rows, start, safePageSize],
  );

  // Reset to page 1 only when the underlying row set or page size changes —
  // skip the very first render so we honor a hydrated `?page=N`.
  const initialResetSkipRef = useRef(true);
  useEffect(() => {
    if (initialResetSkipRef.current) {
      initialResetSkipRef.current = false;
      return;
    }
    setPage(1);
  }, [rows, safePageSize]);
  useEffect(() => setPage((p) => Math.min(p, totalPages)), [totalPages]);

  // Mirror page + perPage to the URL.
  useEffect(() => {
    writeUrlParams({
      page: currentPage > 1 ? String(currentPage) : null,
      perPage: safePageSize !== DEFAULT_PAGE_SIZE ? String(safePageSize) : null,
    });
  }, [currentPage, safePageSize]);

  if (rows.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">No questions match filters.</div>
    );
  }

  if (ss.generalLayout === "expanded") {
    return (
      <div className="space-y-3 animate-fade-in">
        <PaginationControls
          page={currentPage}
          totalPages={totalPages}
          pageSize={safePageSize}
          totalItems={rows.length}
          start={start}
          visibleCount={pageRows.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
        {pageRows.map((r, i) => (
          <CollapsibleQuestionCard
            key={`${r.paper.id}-${r.q.id}`}
            question={r.q}
            paper={r.paper}
            index={start + i}
            selection={
              selection && {
                active: selection.active,
                selected: selection.selectedIds.has(`${r.paper.id}:${r.q.id}`),
                onToggle: () => selection.onToggle(`${r.paper.id}:${r.q.id}`),
              }
            }
          />
        ))}
        <PaginationControls
          page={currentPage}
          totalPages={totalPages}
          pageSize={safePageSize}
          totalItems={rows.length}
          start={start}
          visibleCount={pageRows.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          compact
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      <PaginationControls
        page={currentPage}
        totalPages={totalPages}
        pageSize={safePageSize}
        totalItems={rows.length}
        start={start}
        visibleCount={pageRows.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
      <CompactView rows={pageRows} startIndex={start} selection={selection} />
    </div>
  );
}

function CompactView({
  rows,
  startIndex,
  selection,
}: {
  rows: { q: Question; paper: Paper }[];
  startIndex: number;
  selection?: QuestionSelection;
}) {
  const [selIdx, setSelIdx] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const current = rows[selIdx];
  const parsed = current ? parsePaperId(current.paper.id) : null;

  useEffect(() => setSelIdx(0), [rows]);

  return (
    <div
      className={cn(
        "grid gap-3 sm:gap-4 grid-cols-1",
        sidebarOpen ? "md:grid-cols-[260px_1fr]" : "md:grid-cols-[auto_1fr]",
      )}
    >
      {/* Sidebar — full-width row on mobile, fixed sidebar on md+ */}
      <aside className="rounded-3xl border-2 border-border/60 bg-card/60 backdrop-blur overflow-hidden flex flex-col h-auto md:h-[80vh]">
        <div className="px-3 py-2 border-b border-border/40 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Questions {startIndex + 1}–{startIndex + rows.length}
          </span>
          <button
            onClick={() => setSidebarOpen((s) => !s)}
            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-transform hover:scale-105"
            aria-label={sidebarOpen ? "Collapse list" : "Expand list"}
          >
            {sidebarOpen ? "▲" : "▼"}
            <span className="hidden md:inline ml-1">{sidebarOpen ? "◀" : "▶"}</span>
          </button>
        </div>
        {sidebarOpen && (
          <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[40vh] md:max-h-none">
            {rows.map((r, i) => {
              const p = parsePaperId(r.paper.id);
              if (!p) return null;
              const Icon = SUBJECT_ICON[p.subject];
              const colors = SUBJECT_COLORS[p.subject];
              return (
                <button
                  key={r.q.id + i}
                  onClick={() => setSelIdx(i)}
                  className={cn(
                    "w-full text-left px-2 py-2 rounded-xl border-2 transition-all flex items-center gap-2 text-sm cursor-pointer hover:scale-[1.01]",
                    selIdx === i
                      ? "border-primary bg-primary/10 font-bold"
                      : "border-transparent hover:border-border/60 hover:bg-accent/30",
                  )}
                >
                  {selection?.active && (
                    <SelectionCheckbox
                      checked={selection.selectedIds.has(`${r.paper.id}:${r.q.id}`)}
                      onChange={() => selection.onToggle(`${r.paper.id}:${r.q.id}`)}
                      label={`Select question ${r.q.number}`}
                      className="h-6 w-6"
                    />
                  )}
                  <span
                    className={cn(
                      "inline-flex items-center justify-center w-6 h-6 rounded-lg ring-1 shrink-0",
                      colors.soft,
                      colors.ring,
                    )}
                  >
                    <Icon size={10} />
                  </span>
                  <span className="truncate">
                    Q{r.q.number} {p.year} {p.session} {p.variant}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </aside>

      {/* Preview */}
      <section className="rounded-3xl border-2 border-border/60 bg-card/60 backdrop-blur overflow-hidden flex flex-col h-[70vh] md:h-[80vh]">
        <div className="px-3 sm:px-4 py-2 border-b border-border/40 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Preview
          </span>
          {current && (
            <>
              <span className="text-sm font-bold ml-1 sm:ml-2 truncate min-w-0">
                Q{current.q.number}
                {parsed && (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    · {parsed.year} {parsed.session} {parsed.variant}
                  </span>
                )}
              </span>
              <QuestionCardMenu paper={current.paper} qid={current.q.id} className="ml-auto" />
            </>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {current ? (
            <QuestionView key={current.q.id} question={current.q} index={0} />
          ) : (
            <div className="text-center text-muted-foreground py-20">
              Select a question to preview
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function PaginationControls({
  page,
  totalPages,
  pageSize,
  totalItems,
  start,
  visibleCount,
  onPageChange,
  onPageSizeChange,
  compact,
}: {
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  start: number;
  visibleCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  compact?: boolean;
}) {
  const end = start + visibleCount;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-border/50 bg-card/60 backdrop-blur px-3 py-2 shadow-sm transition-all",
        compact && "py-1.5",
      )}
    >
      <div className="text-xs sm:text-sm font-bold text-muted-foreground">
        Showing {start + 1}–{end} of {totalItems}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground">
          Per page
          <input
            type="number"
            min={1}
            max={MAX_PAGE_SIZE}
            value={pageSize}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isFinite(next)) {
                onPageSizeChange(Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(next))));
              }
            }}
            className="h-8 w-16 rounded-full border-2 border-border/50 bg-background px-3 text-center text-xs font-bold outline-none transition focus:border-primary"
            aria-label="Questions per page, maximum 50"
          />
        </label>
        <div className="inline-flex items-center overflow-hidden rounded-full border-2 border-border/60 bg-background/70">
          <PageButton disabled={page <= 1} onClick={() => onPageChange(1)}>
            First
          </PageButton>
          <PageButton disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Prev
          </PageButton>
          <span className="px-3 py-1.5 text-xs font-extrabold text-foreground">
            {page}/{totalPages}
          </span>
          <PageButton disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            Next
          </PageButton>
          <PageButton disabled={page >= totalPages} onClick={() => onPageChange(totalPages)}>
            Last
          </PageButton>
        </div>
      </div>
    </div>
  );
}

function PageButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="px-3 py-1.5 text-xs font-bold transition hover:bg-primary/15 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
