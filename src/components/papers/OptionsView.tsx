import { useState, createContext, useContext } from "react";
import { motion } from "framer-motion";
import { LuTriangleAlert, LuScissors, LuCheck, LuX, LuCircleHelp, LuMinus } from "react-icons/lu";
import { cn } from "@/lib/utils";
import type {
  MCQOptions,
  OptionLetter,
  TextOptionsMCQ,
  ImageOptionsMCQ,
  GraphOptionsMCQ,
  TableRowOptionsMCQ,
  TableColOptionsMCQ,
  TableCellOptionsMCQ,
  ImagePositionedMCQ,
  TableBlock,
} from "@/data/questionData";
import { RichTextInline, RichTextView } from "./RichTextView";
import { ChartBlockView } from "./ChartBlockView";

/** Extra tags that appear on options after marking. */
type MarkTag = "student" | "correct" | "wrong" | "unattempted";

interface MarkInfo {
  marked: boolean;
  selected: OptionLetter | null | undefined;
  correct: OptionLetter;
}

function markStateFor(
  letter: OptionLetter,
  m: MarkInfo,
): {
  extraTags: MarkTag[];
  highlight: "green" | "red" | null;
} {
  if (!m.marked) return { extraTags: [], highlight: null };
  const isStudent = m.selected === letter;
  const isCorrect = m.correct === letter;
  const unattempted = m.selected == null;

  if (unattempted) {
    return {
      extraTags: ["unattempted"],
      highlight: isCorrect ? "green" : "red",
    };
  }
  if (isStudent && isCorrect) return { extraTags: ["student", "correct"], highlight: "green" };
  if (isStudent) return { extraTags: ["student", "wrong"], highlight: "red" };
  if (isCorrect) return { extraTags: ["correct"], highlight: "green" };
  return { extraTags: [], highlight: null };
}

/* ------------ Letter badge ------------ */
function LetterBadge({
  letter,
  selected,
  size = "md",
}: {
  letter: OptionLetter;
  selected: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const dim =
    size === "sm" ? "w-7 h-7 text-sm" : size === "lg" ? "w-11 h-11 text-lg" : "w-9 h-9 text-base";
  return (
    <span className={cn("relative inline-flex items-center justify-center shrink-0", dim)}>
      {/* Animated fill that grows from center when selected */}
      <motion.span
        initial={false}
        animate={{
          scale: selected ? 1 : 0,
          opacity: selected ? 1 : 0,
        }}
        transition={{ type: "spring", stiffness: 380, damping: 22 }}
        className="absolute inset-0 rounded-full bg-primary shadow-md"
      />
      {/* Static border ring */}
      <span
        className={cn(
          "absolute inset-0 rounded-full border-2 transition-colors",
          selected ? "border-primary" : "border-border/60 group-hover:border-primary/50",
        )}
      />
      {/* Letter — animates color, never replaced by an icon */}
      <motion.span
        animate={{
          color: selected ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
          scale: selected ? [1, 1.25, 1] : 1,
        }}
        transition={{ duration: 0.35 }}
        className="relative font-extrabold"
      >
        {letter}
      </motion.span>
    </span>
  );
}

/* ------------ Tag chips (compact, inline) ------------ */
function TagChips({
  tags,
  className,
  showHints = true,
}: {
  tags?: string[];
  className?: string;
  /** When false, hide trap/easy-to-eliminate tags (for "show hints off" mode). */
  showHints?: boolean;
}) {
  if (!tags || tags.length === 0) return null;
  const visible = tags.filter((tag) => {
    if (!showHints && (tag === "trap-option" || tag === "easy-to-eliminate")) return false;
    return true;
  });
  if (visible.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-1 print:hidden", className)}>
      {visible.map((tag) => {
        const isTrap = tag === "trap-option";
        const isEasy = tag === "easy-to-eliminate";
        const isStudent = tag === "student";
        const isCorrect = tag === "correct";
        const isWrong = tag === "wrong";
        const isUnattempted = tag === "unattempted";
        return (
          <span
            key={tag}
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold border whitespace-nowrap",
              isTrap &&
                "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/40",
              isEasy && "bg-muted text-muted-foreground border-border",
              isStudent && "bg-primary/15 text-primary border-primary/40",
              isCorrect &&
                "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40",
              isWrong && "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40",
              isUnattempted &&
                "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40",
              !isTrap &&
                !isEasy &&
                !isStudent &&
                !isCorrect &&
                !isWrong &&
                !isUnattempted &&
                "bg-muted text-muted-foreground border-border/40",
            )}
          >
            {isTrap && <LuTriangleAlert size={9} />}
            {isEasy && <LuScissors size={9} />}
            {isCorrect && <LuCheck size={9} />}
            {isWrong && <LuX size={9} />}
            {isUnattempted && <LuCircleHelp size={9} />}
            {tag}
          </span>
        );
      })}
    </div>
  );
}

/* ------------ Variant styling for option cards based on tags ------------ */
function variantClasses(
  tags: string[] | undefined,
  selected: boolean,
  opts?: { showHints?: boolean; mark?: { highlight: "green" | "red" | null } },
): string {
  const showHints = opts?.showHints ?? true;
  const highlight = opts?.mark?.highlight;
  if (highlight === "green")
    return "border-emerald-500/60 bg-emerald-500/10 ring-2 ring-emerald-500/30";
  if (highlight === "red") return "border-red-500/60 bg-red-500/10 ring-2 ring-red-500/30";
  const isTrap = tags?.includes("trap-option");
  const isEasy = tags?.includes("easy-to-eliminate");
  if (selected) {
    return "border-primary bg-primary/5 ring-2 ring-primary/30 shadow-sm";
  }
  if (showHints && isTrap) {
    return "border-orange-500/40 bg-orange-500/5 hover:border-orange-500/60";
  }
  if (showHints && isEasy) {
    return "border-border/60 bg-muted/40 text-muted-foreground hover:border-border";
  }
  return "border-border/60 hover:border-primary/40 hover:bg-accent/30";
}

/* ============ TEXT OPTIONS ============ */
function TextOptionsView({
  opts,
  selected,
  onSelect,
}: {
  opts: TextOptionsMCQ;
  selected: OptionLetter | null | undefined;
  onSelect: (l: OptionLetter) => void;
}) {
  const ctx = useOptionsContext();
  const layout = opts.layout ?? "vertical";
  const containerClass =
    layout === "grid"
      ? "grid grid-cols-1 sm:grid-cols-2 gap-3"
      : layout === "horizontal"
        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
        : "flex flex-col gap-2.5";

  return (
    <div className={containerClass}>
      {opts.options.map((o) => {
        const isSel = selected === o.letter;
        return (
          <motion.button
            key={o.letter}
            type="button"
            data-exam-option="true"
            onClick={() => onSelect(o.letter)}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "group relative text-left rounded-2xl border-2 p-3 sm:p-4 flex items-start gap-3 transition-all bg-card/50 print:bg-card print:border-border print:shadow-none print:break-inside-avoid",
              getVariantClasses(o.tags, isSel, ctx, o.letter),
            )}
          >
            <EliminatorBtn letter={o.letter} />
            <LetterBadge letter={o.letter} selected={isSel} />
            <div className="min-w-0 flex-1 pt-0.5 pr-1">
              <div className={cn("text-sm sm:text-base", isSel && "font-medium")}>
                <RichTextInline rich={o.content} />
              </div>
            </div>
            {
              <TagChips
                tags={ctx?.effectiveTags(o.letter, o.tags) ?? o.tags}
                className="absolute top-2 right-2 max-w-[55%] justify-end"
                showHints={ctx?.showHints ?? true}
              />
            }
          </motion.button>
        );
      })}
    </div>
  );
}

/* ============ IMAGE OPTIONS ============ */
function ImageOptionsView({
  opts,
  selected,
  onSelect,
}: {
  opts: ImageOptionsMCQ;
  selected: OptionLetter | null | undefined;
  onSelect: (l: OptionLetter) => void;
}) {
  const ctx = useOptionsContext();
  const layout = opts.layout ?? "grid";
  const containerClass =
    layout === "horizontal"
      ? "grid grid-cols-2 sm:grid-cols-4 gap-3"
      : layout === "vertical"
        ? "flex flex-col gap-3"
        : "grid grid-cols-1 sm:grid-cols-2 gap-3";

  return (
    <div className={containerClass}>
      {opts.options.map((o) => {
        const isSel = selected === o.letter;
        const isDiagram = o.imageType === "Diagram";
        return (
          <motion.button
            key={o.letter}
            type="button"
            data-exam-option="true"
            onClick={() => onSelect(o.letter)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "group relative rounded-2xl border-2 p-2 flex flex-col gap-2 transition-all bg-card/50 overflow-hidden print:bg-card print:border-border print:shadow-none print:break-inside-avoid",
              getVariantClasses(o.tags, isSel, ctx, o.letter),
            )}
          >
            <div className="flex items-center gap-2 pr-1">
              <EliminatorBtn letter={o.letter} />
              <LetterBadge letter={o.letter} selected={isSel} size="sm" />
              <span className="text-xs font-bold text-muted-foreground">{o.letter}</span>
              {
                <TagChips
                  tags={ctx?.effectiveTags(o.letter, o.tags) ?? o.tags}
                  className="ml-auto"
                  showHints={ctx?.showHints ?? true}
                />
              }
            </div>
            <div
              className={cn(
                "rounded-xl overflow-hidden border border-border/40 bg-background mx-auto w-full",
                o.size === "sm" && "max-w-[200px]",
                o.size === "lg" && "max-w-2xl",
                (!o.size || o.size === "md") && "max-w-sm",
                isDiagram && "diagram-img",
              )}
            >
              <img
                src={o.src}
                alt={o.alt}
                loading="lazy"
                className={cn(
                  "w-full h-auto block",
                  isDiagram && "mix-blend-multiply dark:mix-blend-screen dark:invert",
                )}
              />
            </div>
            {o.caption && (
              <div className="text-xs text-muted-foreground text-center px-1">
                <RichTextInline rich={o.caption} />
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

/* ============ GRAPH OPTIONS ============ */
function GraphOptionsView({
  opts,
  selected,
  onSelect,
}: {
  opts: GraphOptionsMCQ;
  selected: OptionLetter | null | undefined;
  onSelect: (l: OptionLetter) => void;
}) {
  const ctx = useOptionsContext();
  const layout = opts.layout ?? "grid";
  const containerClass =
    layout === "horizontal"
      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
      : layout === "vertical"
        ? "flex flex-col gap-3"
        : "grid grid-cols-1 sm:grid-cols-2 gap-3";

  return (
    <div className={containerClass}>
      {opts.options.map((o) => {
        const isSel = selected === o.letter;
        return (
          <motion.button
            key={o.letter}
            type="button"
            data-exam-option="true"
            onClick={() => onSelect(o.letter)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "group relative rounded-2xl border-2 p-2 flex flex-col gap-1 transition-all bg-card/50 text-left print:bg-card print:border-border print:shadow-none print:break-inside-avoid",
              getVariantClasses(o.tags, isSel, ctx, o.letter),
            )}
          >
            <div className="flex items-center gap-2 px-1 pt-0.5">
              <EliminatorBtn letter={o.letter} />
              <LetterBadge letter={o.letter} selected={isSel} size="sm" />
              <span className="text-xs font-bold text-muted-foreground">{o.letter}</span>
              {
                <TagChips
                  tags={ctx?.effectiveTags(o.letter, o.tags) ?? o.tags}
                  className="ml-auto"
                  showHints={ctx?.showHints ?? true}
                />
              }
            </div>
            <div className="-mt-1 pointer-events-none">
              <ChartBlockView block={o.chart} />
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

/* ============ TABLE OPTIONS — shared renderer ============ */
function TableWithSelection({
  table,
  highlight,
  onClickCell,
  letterFor,
  highlightColor,
}: {
  table: TableBlock;
  highlight: (rowIdx: number, colIdx: number) => boolean;
  onClickCell: (rowIdx: number, colIdx: number) => void;
  /** If a (row,col) is the option-letter cell, return its letter; else null */
  letterFor: (rowIdx: number, colIdx: number) => { letter: OptionLetter; selected: boolean } | null;
  /** Optional per-cell mark color override (green/red after marking) */
  highlightColor?: (rowIdx: number, colIdx: number) => "green" | "red" | null;
}) {
  return (
    <div className="my-2 overflow-x-auto">
      {table.caption && (
        <div className="text-sm text-muted-foreground mb-2">
          <RichTextInline rich={table.caption} />
        </div>
      )}
      <table className="w-full border-collapse text-sm rounded-xl overflow-hidden border-2 border-border/60">
        {table.columnGroups && (
          <thead>
            <tr className="bg-primary/10">
              {table.columnGroups.map((g, gi) => (
                <th
                  key={gi}
                  colSpan={g.span}
                  className="border border-border/40 px-3 py-2 font-bold text-foreground"
                >
                  <RichTextInline rich={g.label} />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri} className={cn(ri === 0 && "bg-muted/40")}>
              {row.map((cell, ci) => {
                const Tag = cell.isHeader ? "th" : "td";
                const hot = highlight(ri, ci);
                const lf = letterFor(ri, ci);
                const mc = highlightColor?.(ri, ci) ?? null;
                return (
                  <Tag
                    key={ci}
                    colSpan={cell.colSpan}
                    rowSpan={cell.rowSpan}
                    onClick={() => onClickCell(ri, ci)}
                    className={cn(
                      "border border-border/40 px-3 py-2 align-middle transition-colors cursor-pointer select-none",
                      cell.isHeader && "font-bold bg-muted/60 text-foreground",
                      cell.align === "center" && "text-center",
                      cell.align === "right" && "text-right",
                      hot && !mc && "bg-primary/15 ring-1 ring-inset ring-primary/40",
                      mc === "green" && "bg-emerald-500/20 ring-1 ring-inset ring-emerald-500/50",
                      mc === "red" && "bg-red-500/20 ring-1 ring-inset ring-red-500/50",
                      "hover:bg-accent/40",
                    )}
                  >
                    {lf ? (
                      <span className="inline-flex items-center justify-center">
                        <LetterBadge letter={lf.letter} selected={lf.selected} size="sm" />
                      </span>
                    ) : (
                      <RichTextInline rich={cell.content} />
                    )}
                  </Tag>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableRowOptionsView({
  opts,
  selected,
  onSelect,
}: {
  opts: TableRowOptionsMCQ;
  selected: OptionLetter | null | undefined;
  onSelect: (l: OptionLetter) => void;
}) {
  const ctx = useOptionsContext();
  // Build map: rowIndex -> letter
  const rowToLetter = new Map<number, OptionLetter>();
  opts.optionRows.forEach((o) => rowToLetter.set(o.rowIndex, o.letter));
  const selectedRow =
    selected != null
      ? (opts.optionRows.find((o) => o.letter === selected)?.rowIndex ?? null)
      : null;

  return (
    <div>
      <TableWithSelection
        table={opts.table}
        highlight={(r) => r === selectedRow}
        highlightColor={(r) => {
          const l = rowToLetter.get(r);
          return l && ctx ? ctx.highlightFor(l) : null;
        }}
        onClickCell={(r) => {
          const l = rowToLetter.get(r);
          if (l) onSelect(l);
        }}
        letterFor={(r, c) => {
          if (c === 0 && rowToLetter.has(r)) {
            const letter = rowToLetter.get(r)!;
            return { letter, selected: selected === letter };
          }
          return null;
        }}
      />
      <TagsForOptions options={opts.optionRows} />
    </div>
  );
}

function TableColOptionsView({
  opts,
  selected,
  onSelect,
}: {
  opts: TableColOptionsMCQ;
  selected: OptionLetter | null | undefined;
  onSelect: (l: OptionLetter) => void;
}) {
  const ctx = useOptionsContext();
  const colToLetter = new Map<number, OptionLetter>();
  opts.optionCols.forEach((o) => colToLetter.set(o.colIndex, o.letter));
  const selectedCol =
    selected != null
      ? (opts.optionCols.find((o) => o.letter === selected)?.colIndex ?? null)
      : null;

  return (
    <div>
      <TableWithSelection
        table={opts.table}
        highlight={(_r, c) => c === selectedCol}
        highlightColor={(_r, c) => {
          const l = colToLetter.get(c);
          return l && ctx ? ctx.highlightFor(l) : null;
        }}
        onClickCell={(_r, c) => {
          const l = colToLetter.get(c);
          if (l) onSelect(l);
        }}
        letterFor={(r, c) => {
          if (r === 0 && colToLetter.has(c)) {
            const letter = colToLetter.get(c)!;
            return { letter, selected: selected === letter };
          }
          return null;
        }}
      />
      <TagsForOptions options={opts.optionCols} />
    </div>
  );
}

function TableCellOptionsView({
  opts,
  selected,
  onSelect,
}: {
  opts: TableCellOptionsMCQ;
  selected: OptionLetter | null | undefined;
  onSelect: (l: OptionLetter) => void;
}) {
  const ctx = useOptionsContext();
  const cellMap = new Map<string, OptionLetter>();
  opts.optionCells.forEach((o) => cellMap.set(`${o.row}:${o.col}`, o.letter));
  const sel = opts.optionCells.find((o) => o.letter === selected);

  return (
    <div>
      <TableWithSelection
        table={opts.table}
        highlight={(r, c) => !!sel && sel.row === r && sel.col === c}
        highlightColor={(r, c) => {
          const l = cellMap.get(`${r}:${c}`);
          return l && ctx ? ctx.highlightFor(l) : null;
        }}
        onClickCell={(r, c) => {
          const l = cellMap.get(`${r}:${c}`);
          if (l) onSelect(l);
        }}
        letterFor={(r, c) => {
          const l = cellMap.get(`${r}:${c}`);
          if (l) return { letter: l, selected: selected === l };
          return null;
        }}
      />
      <TagsForOptions options={opts.optionCells} />
    </div>
  );
}

function TagsForOptions({ options }: { options: { letter: OptionLetter; tags?: string[] }[] }) {
  const ctx = useOptionsContext();
  const withTags = options
    .map((o) => ({ letter: o.letter, tags: ctx?.effectiveTags(o.letter, o.tags) ?? o.tags }))
    .filter((o) => o.tags && o.tags.length);
  if (withTags.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2 print:hidden">
      {withTags.map((o) => (
        <div key={o.letter} className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-muted-foreground">{o.letter}:</span>
          <TagChips tags={o.tags} showHints={ctx?.showHints ?? true} />
        </div>
      ))}
    </div>
  );
}

/* ============ IMAGE-POSITIONED OPTIONS ============ */
function ImagePositionedView({
  opts,
  selected,
  onSelect,
}: {
  opts: ImagePositionedMCQ;
  selected: OptionLetter | null | undefined;
  onSelect: (l: OptionLetter) => void;
}) {
  const ctx = useOptionsContext();
  const isDiagram = opts.imageType === "Diagram";
  const sizeClass =
    opts.size === "sm" ? "max-w-[200px]" : opts.size === "lg" ? "max-w-2xl" : "max-w-sm";
  return (
    <div className={cn("relative mx-auto w-full", sizeClass)}>
      <div
        className={cn(
          "relative rounded-2xl overflow-hidden border-2 border-border/50 bg-card",
          isDiagram && "diagram-img",
        )}
      >
        <img
          src={opts.src}
          alt={opts.alt}
          loading="lazy"
          className={cn(
            "w-full h-auto block",
            isDiagram && "mix-blend-multiply dark:mix-blend-screen dark:invert",
          )}
        />
        {opts.options.map((o) => {
          const isSel = selected === o.letter;
          return (
            <motion.button
              key={o.letter}
              type="button"
              data-exam-option="true"
              onClick={() => onSelect(o.letter)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
              style={{ left: `${o.x}%`, top: `${o.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 group"
            >
              <span
                className={cn(
                  "flex items-center gap-1.5 rounded-full pl-1 pr-2 py-1 backdrop-blur-sm border-2 shadow-lg transition-all",
                  ctx?.mark.marked
                    ? markStateFor(o.letter, ctx.mark).highlight === "green"
                      ? "bg-emerald-500 text-white border-emerald-600 scale-110"
                      : markStateFor(o.letter, ctx.mark).highlight === "red"
                        ? "bg-red-500 text-white border-red-600 scale-110"
                        : "bg-background/90 text-foreground border-border/60"
                    : isSel
                      ? "bg-primary text-primary-foreground border-primary scale-110"
                      : "bg-background/90 text-foreground border-border/60 hover:border-primary/50",
                )}
              >
                <LetterBadge letter={o.letter} selected={isSel} size="sm" />
                {o.label && (
                  <span className="text-xs font-bold whitespace-nowrap">
                    <RichTextInline rich={o.label} />
                  </span>
                )}
              </span>
            </motion.button>
          );
        })}
      </div>
      <TagsForOptions options={opts.options} />
    </div>
  );
}

/* ============ Marking context (drives per-option highlight & extra tags) ============ */
interface OptionsCtx {
  showHints: boolean;
  mark: MarkInfo;
  /** wraps base tags with marking-derived extras */
  effectiveTags: (letter: OptionLetter, baseTags?: string[]) => string[];
  variantFor: (letter: OptionLetter, baseTags?: string[], selected?: boolean) => string;
  /** Eliminator support */
  eliminatorEnabled: boolean;
  eliminated: OptionLetter[];
  toggleEliminate: (letter: OptionLetter) => void;
  /** mark highlight per letter (for table cells) */
  highlightFor: (letter: OptionLetter) => "green" | "red" | null;
}
const OptionsCtxObj = createContext<OptionsCtx | null>(null);
export function useOptionsContext(): OptionsCtx | null {
  return useContext(OptionsCtxObj);
}

/* Re-export the original variantClasses for use inside option renderers — but
   each renderer should switch to ctx.variantFor when available. */
export function getVariantClasses(
  tags: string[] | undefined,
  selected: boolean,
  ctx?: OptionsCtx | null,
  letter?: OptionLetter,
): string {
  if (ctx && letter) {
    const isElim = ctx.eliminated.includes(letter);
    const base = ctx.variantFor(letter, tags, selected);
    if (isElim) return cn(base, "opacity-50 line-through grayscale");
    return base;
  }
  return variantClasses(tags, selected);
}

/* ============ Eliminator minus button (rendered in each renderer) ============ */
export function EliminatorBtn({ letter }: { letter: OptionLetter }) {
  const ctx = useOptionsContext();
  if (!ctx?.eliminatorEnabled || ctx.mark.marked) return null;
  const isElim = ctx.eliminated.includes(letter);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        ctx.toggleEliminate(letter);
      }}
      className={cn(
        "shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full border-2 transition",
        isElim
          ? "border-foreground/40 bg-foreground/10 text-foreground"
          : "border-border/60 text-muted-foreground hover:border-red-500/50 hover:text-red-500 hover:bg-red-500/10",
      )}
      title={isElim ? "Restore option" : "Eliminate option"}
    >
      <LuMinus size={12} />
    </button>
  );
}

/* ============ Public component ============ */
export function OptionsView({
  options,
  selected: selectedProp,
  onSelect: onSelectProp,
  disabled = false,
  marked = false,
  correctLetter,
  showHints = true,
  eliminatorEnabled = false,
  eliminated = [],
  onToggleEliminate,
}: {
  options: MCQOptions;
  selected?: OptionLetter | null;
  onSelect?: (l: OptionLetter) => void;
  disabled?: boolean;
  marked?: boolean;
  correctLetter?: OptionLetter;
  showHints?: boolean;
  eliminatorEnabled?: boolean;
  eliminated?: OptionLetter[];
  onToggleEliminate?: (l: OptionLetter) => void;
}) {
  const [internal, setInternal] = useState<OptionLetter | null>(null);
  const isControlled = selectedProp !== undefined && onSelectProp !== undefined;
  const selected = isControlled ? selectedProp : internal;
  const onSelect = (l: OptionLetter) => {
    if (disabled) return;
    if (eliminated.includes(l)) return;
    if (isControlled) onSelectProp!(l);
    else setInternal((cur) => (cur === l ? null : l));
  };

  const mark: MarkInfo = {
    marked,
    selected: selected ?? null,
    correct: correctLetter ?? "A",
  };

  const ctx: OptionsCtx = {
    showHints,
    mark,
    effectiveTags: (letter, baseTags) => {
      const extra = markStateFor(letter, mark).extraTags;
      return [...(baseTags ?? []), ...extra];
    },
    variantFor: (letter, baseTags, sel) =>
      variantClasses(baseTags, !!sel, {
        showHints,
        mark: marked ? { highlight: markStateFor(letter, mark).highlight } : undefined,
      }),
    eliminatorEnabled: disabled ? false : eliminatorEnabled,
    eliminated,
    toggleEliminate: (l) => onToggleEliminate?.(l),
    highlightFor: (letter) => (marked ? markStateFor(letter, mark).highlight : null),
  };

  const inner = (() => {
    switch (options.type) {
      case "text-options":
        return <TextOptionsView opts={options} selected={selected} onSelect={onSelect} />;
      case "image-options":
        return <ImageOptionsView opts={options} selected={selected} onSelect={onSelect} />;
      case "graph-options":
        return <GraphOptionsView opts={options} selected={selected} onSelect={onSelect} />;
      case "table-options-rows":
        return <TableRowOptionsView opts={options} selected={selected} onSelect={onSelect} />;
      case "table-options-cols":
        return <TableColOptionsView opts={options} selected={selected} onSelect={onSelect} />;
      case "table-options-cells":
        return <TableCellOptionsView opts={options} selected={selected} onSelect={onSelect} />;
      case "image-positioned":
        return <ImagePositionedView opts={options} selected={selected} onSelect={onSelect} />;
    }
  })();

  return <OptionsCtxObj.Provider value={ctx}>{inner}</OptionsCtxObj.Provider>;
}

// Re-export RichTextView so it isn't tree-shaken when only options are imported
export { RichTextView };

/* ============ Public helper: list of option letters (in display order) ============ */
export function optionLetters(options: MCQOptions): OptionLetter[] {
  switch (options.type) {
    case "text-options":
    case "image-options":
    case "graph-options":
    case "image-positioned":
      return options.options.map((o) => o.letter);
    case "table-options-rows":
      return options.optionRows.map((o) => o.letter);
    case "table-options-cols":
      return options.optionCols.map((o) => o.letter);
    case "table-options-cells":
      return options.optionCells.map((o) => o.letter);
  }
}
