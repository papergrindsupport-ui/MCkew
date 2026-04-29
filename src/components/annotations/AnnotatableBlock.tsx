// AnnotatableBlock renders a single text block (paragraph / heading / list-item)
// and overlays user-created selection annotations: highlight, underline, blur,
// tag-circle, comment-circle. The runs are originally produced by
// RichTextView; we walk the runs to build a flat plaintext + boundary index
// so annotations expressed as [start, end) char ranges in the plaintext can
// be projected back onto rendered React nodes.
//
// Render strategy: ignore the run boundaries during overlay rendering and
// instead render plain text segments split at every annotation boundary.
// We preserve inline marks (bold/italic/etc.) by also splitting runs and
// merging marks at each char position.

import { Fragment, useEffect, useMemo, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Run, InlineMark } from "@/data/questionData";
import { HighlightedText } from "@/components/smart-solve/HighlightContext";
import {
  useSelectionAnnotationsStore,
  type SelectionAnnotation,
} from "./useSelectionAnnotationsStore";
import { useSelectionAnnotationCtx } from "./SelectionAnnotationContext";
import { AnnotationCircle } from "./AnnotationCircle";

const MARK_CLASSES: Record<InlineMark, string> = {
  bold: "font-bold",
  italic: "italic",
  underline: "underline underline-offset-2",
  strike: "line-through opacity-70",
  sub: "align-sub text-[0.75em]",
  sup: "align-super text-[0.75em]",
  highlight: "bg-yellow-300/60 dark:bg-yellow-400/30 px-0.5 rounded",
  muted: "text-muted-foreground",
  code: "font-mono text-[0.9em] bg-muted px-1 py-0.5 rounded",
};

/** Per-character record (only for text runs). non-text runs are passed through. */
interface CharInfo {
  ch: string;
  marks: InlineMark[];
}

/** Token in the linearized stream (text chars or atomic non-text run). */
type StreamToken = { kind: "char"; info: CharInfo } | { kind: "atom"; node: ReactNode };

function buildStream(runs: Run[]): { tokens: StreamToken[]; plaintext: string } {
  const tokens: StreamToken[] = [];
  let plaintext = "";
  for (const r of runs) {
    if (r.type === "br") {
      tokens.push({ kind: "atom", node: <br /> });
    } else if (r.type === "latex") {
      // LaTeX is atomic; do not include in plaintext offsets so selection in text isn't confused.
      tokens.push({ kind: "atom", node: <LatexAtom run={r} /> });
    } else {
      const marks = r.marks ?? [];
      for (const ch of r.text) {
        tokens.push({ kind: "char", info: { ch, marks } });
        plaintext += ch;
      }
    }
  }
  return { tokens, plaintext };
}

function LatexAtom({ run }: { run: Extract<Run, { type: "latex" }> }) {
  // Lazy import via re-using RichTextView's logic would create a cycle; render
  // a minimal placeholder. In practice latex sits in non-question RichText too;
  // we just emit a styled span. RichTextView still handles the standard path
  // when annotations aren't requested.
  return (
    <span className="inline-block align-middle font-mono text-[0.9em] bg-muted px-1 rounded">
      {run.tex}
    </span>
  );
}

function applyMarks(node: ReactNode, marks: InlineMark[]): ReactNode {
  if (marks.length === 0) return node;
  const className = marks.map((m) => MARK_CLASSES[m]).join(" ");
  if (marks.includes("sub")) return <sub className={className}>{node}</sub>;
  if (marks.includes("sup")) return <sup className={className}>{node}</sup>;
  return <span className={className}>{node}</span>;
}

/** Active per-position annotation flags + circle anchors. */
interface PosFlags {
  highlight: boolean;
  underline: boolean;
  blur: boolean;
  /** Annotations whose end-of-last-word lands at this position (anchor circles after this char). */
  anchorTags: SelectionAnnotation[];
  anchorComments: SelectionAnnotation[];
}

function computePosFlags(plaintext: string, anns: SelectionAnnotation[]): PosFlags[] {
  const flags: PosFlags[] = Array.from({ length: plaintext.length }, () => ({
    highlight: false,
    underline: false,
    blur: false,
    anchorTags: [],
    anchorComments: [],
  }));
  for (const a of anns) {
    const s = Math.max(0, Math.min(plaintext.length, a.start));
    const e = Math.max(s, Math.min(plaintext.length, a.end));
    if (a.type === "highlight" || a.type === "underline" || a.type === "blur") {
      for (let i = s; i < e; i++) flags[i][a.type] = true;
    } else if (a.type === "tags" || a.type === "comment") {
      // Anchor at the last non-whitespace char of the range (so circle sits
      // after the last *word* of the selection).
      let anchorIdx = e - 1;
      while (anchorIdx > s && /\s/.test(plaintext[anchorIdx])) anchorIdx--;
      const arr = a.type === "tags" ? "anchorTags" : "anchorComments";
      if (anchorIdx >= 0 && anchorIdx < flags.length) flags[anchorIdx][arr].push(a);
    }
  }
  return flags;
}

function flagsClassName(f: { highlight: boolean; underline: boolean; blur: boolean }): string {
  return cn(
    f.highlight && "bg-primary/25 dark:bg-primary/30 rounded-[2px]",
    f.underline && "underline decoration-2 underline-offset-[3px] decoration-primary/70",
    f.blur && "anno-blur",
  );
}

function flagsKey(f: { highlight: boolean; underline: boolean; blur: boolean }): string {
  return `${f.highlight ? 1 : 0}${f.underline ? 1 : 0}${f.blur ? 1 : 0}`;
}

export function AnnotatableBlock({
  runs,
  blockPath,
  className,
  as: Tag = "span",
  align,
}: {
  runs: Run[];
  blockPath: string;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
  align?: "left" | "center" | "right";
}) {
  const ctx = useSelectionAnnotationCtx();
  const blockKey = ctx ? ctx.buildBlockKey(blockPath) : "";
  const annotations = useSelectionAnnotationsStore((s) =>
    blockKey ? s.byBlock[blockKey] : undefined,
  );

  const { tokens, plaintext } = useMemo(() => buildStream(runs), [runs]);
  const posFlags = useMemo(
    () => computePosFlags(plaintext, annotations ?? []),
    [plaintext, annotations],
  );

  // Listen for circle-hover events and toggle a hover-highlight class on
  // any span within this block whose [data-anno-start, data-anno-end) range
  // overlaps the hovered annotation's range.
  const tagRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!blockKey) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { blockKey: string; start: number; end: number; on: boolean }
        | undefined;
      if (!detail || detail.blockKey !== blockKey) return;
      const root = tagRef.current;
      if (!root) return;
      const spans = root.querySelectorAll<HTMLElement>("[data-anno-start]");
      spans.forEach((s) => {
        const start = Number(s.dataset.annoStart);
        const end = Number(s.dataset.annoEnd);
        const overlaps = start < detail.end && end > detail.start;
        if (overlaps) s.classList.toggle("anno-hover-highlight", detail.on);
      });
    };
    document.addEventListener("anno-hover", handler);
    return () => document.removeEventListener("anno-hover", handler);
  }, [blockKey]);

  // If no context (rendered outside a question), fall back to plain rendering.
  if (!ctx) {
    return (
      <Tag
        className={cn(
          className,
          align === "center" && "block text-center",
          align === "right" && "block text-right",
        )}
      >
        {tokens.map((t, i) =>
          t.kind === "atom" ? (
            <Fragment key={i}>{t.node}</Fragment>
          ) : (
            <Fragment key={i}>
              {applyMarks(<HighlightedText text={t.info.ch} />, t.info.marks)}
            </Fragment>
          ),
        )}
      </Tag>
    );
  }

  // Walk tokens producing rendered children. We accumulate consecutive chars
  // sharing the same (marks signature + flags signature) into a single span so
  // we don't emit one element per character.
  const children: ReactNode[] = [];
  let charIdx = 0; // counts only "char" tokens
  let buf = "";
  let bufMarks: InlineMark[] = [];
  let bufFlagKey = "";
  let bufFlagClass = "";
  let segStart = 0;
  let segEnd = 0;

  const flushBuf = () => {
    if (buf.length === 0) return;
    const dataAttrs = {
      "data-anno-start": String(segStart),
      "data-anno-end": String(segEnd),
    } as Record<string, string>;
    const inner = <HighlightedText text={buf} />;
    const withMarks = applyMarks(inner, bufMarks);
    if (bufFlagClass) {
      children.push(
        <span key={`s-${children.length}`} className={bufFlagClass} {...dataAttrs}>
          {withMarks}
        </span>,
      );
    } else {
      // Even unannotated runs need data-anno offsets so selection mapping works.
      children.push(
        <span key={`s-${children.length}`} {...dataAttrs}>
          {withMarks}
        </span>,
      );
    }
    buf = "";
  };

  const marksSig = (m: InlineMark[]) => m.join("|");

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind === "atom") {
      flushBuf();
      children.push(<Fragment key={`a-${i}`}>{t.node}</Fragment>);
      continue;
    }
    const f = posFlags[charIdx];
    const fKey = flagsKey(f);
    const fClass = flagsClassName(f);
    const mSig = marksSig(t.info.marks);
    if (buf.length === 0 || fKey !== bufFlagKey || mSig !== marksSig(bufMarks)) {
      flushBuf();
      bufMarks = t.info.marks;
      bufFlagKey = fKey;
      bufFlagClass = fClass;
      segStart = charIdx;
    }
    buf += t.info.ch;
    segEnd = charIdx + 1;

    // After this char, emit any tag/comment circle anchors.
    if (f.anchorTags.length > 0 || f.anchorComments.length > 0) {
      flushBuf();
      for (const ann of f.anchorTags) {
        children.push(<AnnotationCircle key={`tg-${ann.id}`} annotation={ann} />);
      }
      for (const ann of f.anchorComments) {
        children.push(<AnnotationCircle key={`cm-${ann.id}`} annotation={ann} />);
      }
    }
    charIdx++;
  }
  flushBuf();

  const TagAny = Tag as unknown as React.ElementType;
  return (
    <TagAny
      ref={(el: HTMLElement | null) => {
        tagRef.current = el;
      }}
      className={cn(
        className,
        align === "center" && "block text-center",
        align === "right" && "block text-right",
      )}
      data-annotation-block={blockKey}
      data-annotation-text={plaintext}
    >
      {children}
    </TagAny>
  );
}
