import { createContext, useContext, type ReactNode } from "react";
import type { SearchMode } from "./searchEngine";
import { findHighlightRanges } from "./searchEngine";

interface HighlightCtx {
  query: string;
  mode: SearchMode;
}

const Ctx = createContext<HighlightCtx | null>(null);

export function HighlightProvider({
  query,
  mode,
  children,
}: {
  query: string;
  mode: SearchMode;
  children: ReactNode;
}) {
  if (!query.trim()) return <>{children}</>;
  return <Ctx.Provider value={{ query, mode }}>{children}</Ctx.Provider>;
}

/**
 * Wrap a plain string with highlight spans for the active search.
 * Returns the original string node when no active search.
 */
export function HighlightedText({ text }: { text: string }) {
  const ctx = useContext(Ctx);
  if (!ctx || !text) return <>{text}</>;
  const ranges = findHighlightRanges(text, ctx.query, ctx.mode);
  if (ranges.length === 0) return <>{text}</>;
  const out: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((r, i) => {
    if (r.start > cursor) out.push(text.slice(cursor, r.start));
    out.push(
      <mark
        key={i}
        className="bg-yellow-300/80 dark:bg-yellow-400/40 text-foreground rounded px-0.5"
      >
        {text.slice(r.start, r.end)}
      </mark>,
    );
    cursor = r.end;
  });
  if (cursor < text.length) out.push(text.slice(cursor));
  return <>{out}</>;
}
