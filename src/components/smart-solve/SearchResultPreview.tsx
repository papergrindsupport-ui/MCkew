// Lightweight result cards used across search UIs (inline dropdown, modal,
// global search, and the full-page results route). All variants are memoized
// and keep the DOM footprint small so they stay fast even with 100+ results.

import { memo } from "react";
import { Link } from "@tanstack/react-router";
import { LuFileText, LuMessageCircleQuestion, LuExternalLink, LuArrowRight } from "react-icons/lu";
import { cn } from "@/lib/utils";
import type { Question } from "@/data/questionData";
import type { Paper } from "@/data/paperData";
import { parsePaperId, SUBJECT_COLORS, SUBJECT_LABEL } from "@/data/paperData";
import { richToString } from "./searchEngine";

/* ---------------- Shared helpers ---------------- */

function snippet(text: string, query: string, len = 110): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const q = query.trim().toLowerCase();
  if (!q) return clean.slice(0, len) + (clean.length > len ? "…" : "");
  const i = clean.toLowerCase().indexOf(q);
  if (i < 0) return clean.slice(0, len) + (clean.length > len ? "…" : "");
  const start = Math.max(0, i - 30);
  const end = Math.min(clean.length, i + q.length + 80);
  return (start > 0 ? "…" : "") + clean.slice(start, end) + (end < clean.length ? "…" : "");
}

function HighlightInline({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const q = query.trim();
  const lower = text.toLowerCase();
  const qLower = q.toLowerCase();
  const parts: React.ReactNode[] = [];
  let i = 0;
  let keyIdx = 0;
  while (i < text.length) {
    const found = lower.indexOf(qLower, i);
    if (found < 0) {
      parts.push(text.slice(i));
      break;
    }
    if (found > i) parts.push(text.slice(i, found));
    parts.push(
      <mark
        key={keyIdx++}
        className="bg-primary/25 text-primary-foreground-none rounded px-0.5 font-bold"
      >
        {text.slice(found, found + q.length)}
      </mark>,
    );
    i = found + q.length;
  }
  return <>{parts}</>;
}

/* ---------------- Question result ---------------- */

export interface QuestionResultProps {
  q: Question;
  paper: Paper;
  query: string;
  /** If provided, clicking the card calls this instead of navigating. */
  onClick?: () => void;
  compact?: boolean;
}

export const QuestionResultCard = memo(function QuestionResultCard({
  q,
  paper,
  query,
  onClick,
  compact,
}: QuestionResultProps) {
  const colors = SUBJECT_COLORS[paper.subject];
  const parsed = parsePaperId(paper.id);
  const where = parsed
    ? `Q${q.number} · ${SUBJECT_LABEL[parsed.subject]} ${parsed.year} ${parsed.session} ${parsed.variant}`
    : `Q${q.number}`;
  const body = snippet(richToString(q.text) || richToString(q.intro), query, compact ? 80 : 140);

  const content = (
    <div
      className={cn(
        "group relative rounded-xl border-2 border-border/60 bg-card/80 hover:bg-card hover:border-primary/60 hover:shadow-md transition p-3 flex gap-3 items-start text-left w-full overflow-hidden",
      )}
    >
      <div
        className={cn("shrink-0 w-8 h-8 rounded-lg flex items-center justify-center", colors.soft)}
      >
        <LuMessageCircleQuestion size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
          <span className={colors.text}>{where}</span>
        </div>
        <p className="text-sm mt-0.5 line-clamp-2 text-foreground/90">
          <HighlightInline text={body} query={query} />
        </p>
      </div>
      <LuArrowRight
        size={14}
        className="shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition mt-1"
      />
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full">
        {content}
      </button>
    );
  }
  return (
    <Link to="/smart-solve-papers/$paperId" params={{ paperId: paper.id }} className="block w-full">
      {content}
    </Link>
  );
});

/* ---------------- Paper result ---------------- */

export const PaperResultCard = memo(function PaperResultCard({
  paper,
  query,
}: {
  paper: Paper;
  query: string;
}) {
  const colors = SUBJECT_COLORS[paper.subject];
  return (
    <Link
      to="/smart-solve-papers/$paperId"
      params={{ paperId: paper.id }}
      className="group relative rounded-xl border-2 border-border/60 bg-card/80 hover:bg-card hover:border-primary/60 hover:shadow-md transition p-3 flex gap-3 items-start w-full overflow-hidden"
    >
      <div
        className={cn("shrink-0 w-8 h-8 rounded-lg flex items-center justify-center", colors.soft)}
      >
        <LuFileText size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-[11px] font-bold uppercase tracking-wider", colors.text)}>
          {SUBJECT_LABEL[paper.subject]}
        </p>
        <p className="text-sm font-bold truncate">
          <HighlightInline text={paper.title} query={query} />
        </p>
        <p className="text-[11px] text-muted-foreground truncate">{paper.id}</p>
      </div>
      <LuArrowRight
        size={14}
        className="shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition mt-1"
      />
    </Link>
  );
});

/* ---------------- Page result ---------------- */

export interface PageResult {
  title: string;
  description: string;
  to: string;
  keywords: string[];
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const PageResultCard = memo(function PageResultCard({
  page,
  query,
}: {
  page: PageResult;
  query: string;
}) {
  const Icon = page.icon;
  return (
    <Link
      to={page.to}
      className="group relative rounded-xl border-2 border-border/60 bg-card/80 hover:bg-card hover:border-primary/60 hover:shadow-md transition p-3 flex gap-3 items-start w-full overflow-hidden"
    >
      <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-primary/15 text-primary">
        <Icon size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Page</p>
        <p className="text-sm font-bold truncate">
          <HighlightInline text={page.title} query={query} />
        </p>
        <p className="text-[11px] text-muted-foreground truncate">{page.description}</p>
      </div>
      <LuExternalLink
        size={13}
        className="shrink-0 text-muted-foreground group-hover:text-primary transition mt-1"
      />
    </Link>
  );
});
