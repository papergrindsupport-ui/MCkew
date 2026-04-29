import { useEffect, useMemo, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { LuChevronLeft, LuChevronRight, LuGripVertical, LuPlus, LuSearch } from "react-icons/lu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Question } from "@/data/questionData";
import { useBuilderStore } from "./useBuilderStore";

export interface AvailableEntry {
  /** Stable id for dnd; also the question id when source. */
  id: string;
  question: Question;
  source: { paperId: string; qid: string } | null;
  title: string;
}

interface Props {
  available: AvailableEntry[];
  onCustomClick: () => void;
}

export function BuilderSidebar({ available, onCustomClick }: Props) {
  const collapsed = useBuilderStore((s) => s.sidebarCollapsed);
  const setCollapsed = useBuilderStore((s) => s.setSidebarCollapsed);
  const addQuestionItem = useBuilderStore((s) => s.addQuestionItem);
  const items = useBuilderStore((s) => s.draft.items);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  // Hide questions already added (by source) so the sidebar reflects what's "available"
  const used = useMemo(
    () =>
      new Set(
        items
          .filter((it) => it.kind === "question" && it.source)
          .map((it) =>
            it.kind === "question" && it.source ? `${it.source.paperId}:${it.source.qid}` : "",
          ),
      ),
    [items],
  );
  const filtered = useMemo(
    () =>
      available.filter((a) => {
        const key = a.source ? `${a.source.paperId}:${a.source.qid}` : a.id;
        if (used.has(key)) return false;
        if (!filter) return true;
        return a.title.toLowerCase().includes(filter.toLowerCase());
      }),
    [available, used, filter],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Reset page if filter / list shrinks below current page
  useEffect(() => {
    if (page > pageCount - 1) setPage(0);
  }, [pageCount, page]);
  const pageItems = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  if (collapsed) {
    return (
      <div className="w-12 shrink-0 border-r border-border/60 bg-card/40 flex flex-col items-center py-3">
        <button
          onClick={() => setCollapsed(false)}
          className="w-8 h-8 rounded-lg border border-border hover:bg-accent inline-flex items-center justify-center"
          aria-label="Expand sidebar"
        >
          <LuChevronRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-72 shrink-0 border-r border-border/60 bg-card/40 flex flex-col">
      <div className="p-3 border-b border-border/60">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-sm">Available ({filtered.length})</h3>
          <button
            onClick={() => setCollapsed(true)}
            className="w-7 h-7 rounded-md hover:bg-accent inline-flex items-center justify-center"
            aria-label="Collapse sidebar"
          >
            <LuChevronLeft size={14} />
          </button>
        </div>
        <button
          onClick={onCustomClick}
          className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border-2 border-dashed border-primary/40 text-primary text-sm font-bold hover:bg-primary/5 transition"
        >
          <LuPlus size={14} /> Custom
        </button>
        <div className="relative mt-2">
          <LuSearch
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(0);
            }}
            placeholder="Search…"
            className="h-8 pl-7 text-sm"
          />
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground px-2 py-6 text-center">
            No questions available.
          </p>
        )}
        {pageItems.map((entry) => (
          <SidebarCard
            key={entry.id}
            entry={entry}
            onAdd={() => addQuestionItem(entry.question, entry.source ?? undefined)}
          />
        ))}
      </div>
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border/60 bg-card/40">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            <LuChevronLeft size={14} />
          </button>
          <span className="text-[11px] font-bold text-muted-foreground">
            Page {page + 1} / {pageCount}
          </span>
          <button
            type="button"
            disabled={page >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            <LuChevronRight size={14} />
          </button>
        </div>
      )}
    </aside>
  );
}

function SidebarCard({ entry, onAdd }: { entry: AvailableEntry; onAdd: () => void }) {
  const draggable = useDraggable({
    id: `available:${entry.id}`,
    data: { kind: "available", question: entry.question, source: entry.source },
  });
  return (
    <div
      ref={draggable.setNodeRef}
      className={cn(
        "flex items-center gap-1.5 p-2 rounded-lg border border-border/60 bg-background hover:border-primary/50 transition",
        draggable.isDragging && "opacity-50",
      )}
    >
      <button
        type="button"
        {...draggable.attributes}
        {...draggable.listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground touch-none"
        aria-label="Drag to add"
      >
        <LuGripVertical size={14} />
      </button>
      <span className="flex-1 text-xs font-medium truncate">{entry.title}</span>
      <button
        onClick={onAdd}
        className="w-6 h-6 rounded-md hover:bg-primary/10 text-primary inline-flex items-center justify-center"
        aria-label="Add to builder"
        title="Add"
      >
        <LuPlus size={14} />
      </button>
    </div>
  );
}
