import {
  LuLock,
  LuFlame,
  LuStar,
  LuTag,
  LuCircleCheck,
  LuClock4,
  LuEllipsis,
  LuPin,
  LuPinOff,
  LuHardDriveDownload,
} from "react-icons/lu";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { type Paper, SUBJECT_COLORS, DIFFICULTY_COLORS, PRIORITY_COLORS } from "@/data/paperData";
import { useLayoutStore } from "@/stores/useLayoutStore";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SelectionCheckbox } from "@/components/smart-solve/SelectionCheckbox";
import { useRecentPapers } from "@/lib/recentPapers";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeskStore } from "@/stores/useDeskStore";
import { SaveToDeskModal } from "@/components/desk/SaveToDeskModal";
import { toast } from "sonner";

interface TagDef {
  key: string;
  node: React.ReactNode;
}

export function PaperCard({
  paper,
  className,
  compact = false,
  selection,
}: {
  paper: Paper;
  className?: string;
  compact?: boolean;
  selection?: {
    active: boolean;
    selected: boolean;
    onToggle: () => void;
  };
}) {
  const colors = SUBJECT_COLORS[paper.subject];
  const hideTags = useLayoutStore((s) => s.hideTags);

  // Status badge: attempted vs submitted (localStorage-derived).
  // Use the cached snapshot variant — the raw getRecentPapers() returns a new
  // array on each call, which makes useSyncExternalStore loop infinitely.
  const recents = useRecentPapers();
  const recentEntry = recents.find((r) => r.paperId === paper.id);

  const tags: TagDef[] = [];
  if (recentEntry?.status === "submitted") {
    tags.push({
      key: "status-submitted",
      node: (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 whitespace-nowrap">
          <LuCircleCheck size={10} /> Submitted
        </span>
      ),
    });
  } else if (recentEntry?.status === "attempted") {
    tags.push({
      key: "status-attempted",
      node: (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 whitespace-nowrap">
          <LuClock4 size={10} /> In progress
        </span>
      ),
    });
  }
  if (paper.difficulty) {
    tags.push({
      key: `d-${paper.difficulty}`,
      node: (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap",
            DIFFICULTY_COLORS[paper.difficulty],
          )}
        >
          <LuFlame size={10} /> {paper.difficulty}
        </span>
      ),
    });
  }
  if (paper.priority) {
    tags.push({
      key: `p-${paper.priority}`,
      node: (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap",
            PRIORITY_COLORS[paper.priority],
          )}
        >
          <LuStar size={10} /> {paper.priority}
        </span>
      ),
    });
  }
  paper.gradeThresholds.forEach((gt) => {
    tags.push({
      key: `gt-${gt}`,
      node: (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-background/70 text-foreground/80 border-border whitespace-nowrap">
          {gt} GTs
        </span>
      ),
    });
  });
  paper.tags.forEach((t) => {
    tags.push({
      key: `t-${t}`,
      node: (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-background/70 text-foreground/70 border border-border/50 whitespace-nowrap">
          <LuTag size={9} /> {t}
        </span>
      ),
    });
  });

  const isPinned = useDeskStore((s) => s.pinnedPapers.includes(paper.id));
  const togglePin = useDeskStore((s) => s.togglePinPaper);
  const [saveOpen, setSaveOpen] = useState(false);

  const inner = (
    <>
      {paper.locked && (
        <div className="absolute top-2 right-2 bg-background/80 backdrop-blur rounded-full p-1.5 z-10">
          <LuLock size={14} className="text-muted-foreground" />
        </div>
      )}

      {/* Floating menu / pin badge — sits above the link */}
      {!paper.locked && (
        <div
          className="absolute top-2 right-2 z-20 flex items-center gap-1"
          onClick={(e) => {
            // Prevent the surrounding <Link> from navigating when the menu opens.
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {isPinned && (
            <span
              title="Pinned to top"
              className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40"
            >
              <LuPin size={12} />
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Paper menu"
                className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-border/60 bg-background/80 backdrop-blur hover:border-primary/60 hover:text-primary transition cursor-pointer"
              >
                <LuEllipsis size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onSelect={() => {
                  togglePin(paper.id);
                  toast.success(isPinned ? "Unpinned" : "Pinned to top");
                }}
                className="text-xs"
              >
                {isPinned ? <LuPinOff size={12} /> : <LuPin size={12} />}
                {isPinned ? "Unpin paper" : "Pin paper"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSaveOpen(true)} className="text-xs">
                <LuHardDriveDownload size={12} /> Save to desk
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div className="flex items-start justify-between gap-2 min-w-0">
        {selection?.active && (
          <SelectionCheckbox
            checked={selection.selected}
            onChange={selection.onToggle}
            label={`Select ${paper.title}`}
            className="mt-0.5"
          />
        )}
        <div className="min-w-0 flex-1 pr-16">
          <p className={cn("text-[10px] uppercase tracking-wider font-bold truncate", colors.text)}>
            {paper.subject === "bio"
              ? "Biology"
              : paper.subject === "chem"
                ? "Chemistry"
                : "Physics"}
          </p>
          <h3 className={cn("font-bold leading-tight truncate", compact ? "text-base" : "text-lg")}>
            {paper.title}
          </h3>
        </div>
      </div>

      {!hideTags && tags.length > 0 && <TagRow tags={tags} />}
    </>
  );

  const baseClass = cn(
    "relative rounded-2xl border-2 border-border/60 p-3 flex flex-col gap-2 overflow-hidden text-left w-full h-full block",
    colors.bg,
    paper.locked ? "opacity-70 cursor-not-allowed" : "cursor-pointer hover:border-foreground/40",
    selection?.active &&
      selection.selected &&
      "border-primary/70 ring-2 ring-primary/20 shadow-lg shadow-primary/10",
    className,
  );

  return (
    <TooltipProvider delayDuration={200}>
      {paper.locked ? (
        <div className={baseClass}>{inner}</div>
      ) : (
        <Link
          to="/smart-solve-papers/$paperId"
          params={{ paperId: paper.id }}
          className={baseClass}
        >
          <motion.div
            whileHover={{ y: -4, rotate: -0.5 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 320, damping: 20 }}
            className="contents"
          >
            {inner}
          </motion.div>
        </Link>
      )}
      <SaveToDeskModal
        open={saveOpen}
        onOpenChange={setSaveOpen}
        target={{ kind: "paper", paperId: paper.id }}
      />
    </TooltipProvider>
  );
}

function TagRow({ tags }: { tags: TagDef[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(tags.length);

  useLayoutEffect(() => {
    let raf = 0;
    let lastWidth = -1;
    const measure = () => {
      const c = containerRef.current;
      const m = measureRef.current;
      if (!c || !m) return;
      const maxWidth = c.clientWidth;
      const children = Array.from(m.children) as HTMLElement[];
      let used = 0;
      const gap = 6;
      const reserve = 28; // for "+N" pill
      let count = 0;
      for (let i = 0; i < children.length; i++) {
        const w = children[i].offsetWidth + (i > 0 ? gap : 0);
        const remaining = children.length - (i + 1);
        const needsReserve = remaining > 0 ? reserve + gap : 0;
        if (used + w + needsReserve > maxWidth) break;
        used += w;
        count++;
      }
      const next = Math.max(count, 0);
      setVisibleCount((cur) => (cur === next ? cur : next));
    };
    measure();
    const ro = new ResizeObserver((entries) => {
      // Only react to container width changes; coalesce via rAF to avoid
      // RO loops when our own state update reflows children.
      const w = entries[0]?.contentRect.width ?? 0;
      if (w === lastWidth) return;
      lastWidth = w;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [tags.length]);

  const hidden = tags.slice(visibleCount);

  return (
    <div className="mt-auto min-w-0">
      {/* Hidden measurer */}
      <div
        ref={measureRef}
        className="invisible absolute pointer-events-none flex gap-1.5"
        aria-hidden
      >
        {tags.map((t) => (
          <span key={`m-${t.key}`}>{t.node}</span>
        ))}
      </div>
      <div ref={containerRef} className="flex gap-1.5 flex-nowrap overflow-hidden items-center">
        {tags.slice(0, visibleCount).map((t) => (
          <span key={t.key} className="shrink-0">
            {t.node}
          </span>
        ))}
        {hidden.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-foreground/10 text-foreground border border-border whitespace-nowrap cursor-help">
                +{hidden.length}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="flex flex-wrap gap-1.5 max-w-[260px] p-2">
              {hidden.map((t) => (
                <span key={`h-${t.key}`}>{t.node}</span>
              ))}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
