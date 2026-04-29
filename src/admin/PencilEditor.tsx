// PencilEditor — a fully custom block-based rich text editor.
//
// Architecture (built from scratch, not contentEditable on the whole doc):
//   - The document is an array of blocks (paragraph / h1 / h2 / h3 / ul / ol).
//   - Each block (or list item) renders ONE contentEditable line. This makes
//     Enter create a new block (clean line breaks) and Shift+Enter insert a
//     soft break <br /> inside the current line.
//   - Selection-based marks (bold/italic/underline/strike/sub/sup/highlight/
//     code/muted) are toggled by wrapping/unwrapping the current selection
//     inside a styled <span data-mark="bold"> wrapper.
//   - Inline LaTeX is a non-editable chip <span data-tex="…"> that you can
//     click to edit; Backspace at its right edge removes it as one unit.
//   - The toolbar is "live": active marks for the current selection are
//     highlighted, and the heading/list dropdowns show the current block kind.
//
// Output type matches the existing RichText shape from src/data/questionData.ts
// so this is a 1:1 drop-in replacement for the previous RichTextEditor.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LuBold,
  LuItalic,
  LuUnderline,
  LuStrikethrough,
  LuSuperscript,
  LuSubscript,
  LuHighlighter,
  LuCode,
  LuSigma,
  LuType,
  LuList,
  LuListOrdered,
  LuPilcrow,
  LuPlus,
  LuTrash2,
  LuChevronUp,
  LuChevronDown,
  LuQuote,
  LuRotateCcw,
} from "react-icons/lu";
import type { IconType } from "react-icons";
import katexPkg from "katex";
import "katex/dist/katex.min.css";
import type { RichText, Run, RichBlock, ListBlock, InlineMark } from "@/data/questionData";
import { cn } from "@/lib/utils";
import { SymbolPicker } from "./SymbolPicker";

const katex: any = (katexPkg as any).default ?? katexPkg;

/* ================================================================== */
/*                        Mark definitions                              */
/* ================================================================== */

const MARKS: { key: InlineMark; icon: IconType; title: string; render: (s: string) => string }[] = [
  {
    key: "bold",
    icon: LuBold,
    title: "Bold (Ctrl+B)",
    render: (s) => `<span data-mark="bold" class="font-bold">${s}</span>`,
  },
  {
    key: "italic",
    icon: LuItalic,
    title: "Italic (Ctrl+I)",
    render: (s) => `<span data-mark="italic" class="italic">${s}</span>`,
  },
  {
    key: "underline",
    icon: LuUnderline,
    title: "Underline (Ctrl+U)",
    render: (s) => `<span data-mark="underline" class="underline">${s}</span>`,
  },
  {
    key: "strike",
    icon: LuStrikethrough,
    title: "Strikethrough",
    render: (s) => `<span data-mark="strike" class="line-through">${s}</span>`,
  },
  {
    key: "sup",
    icon: LuSuperscript,
    title: "Superscript",
    render: (s) => `<span data-mark="sup" class="align-super text-[0.7em]">${s}</span>`,
  },
  {
    key: "sub",
    icon: LuSubscript,
    title: "Subscript",
    render: (s) => `<span data-mark="sub" class="align-sub text-[0.7em]">${s}</span>`,
  },
  {
    key: "highlight",
    icon: LuHighlighter,
    title: "Highlight",
    render: (s) =>
      `<span data-mark="highlight" class="bg-amber-300/60 dark:bg-amber-500/40 px-0.5 rounded-sm">${s}</span>`,
  },
  {
    key: "code",
    icon: LuCode,
    title: "Inline code",
    render: (s) =>
      `<span data-mark="code" class="font-mono bg-muted px-1 rounded text-[0.85em]">${s}</span>`,
  },
  {
    key: "muted",
    icon: LuQuote,
    title: "Muted",
    render: (s) => `<span data-mark="muted" class="text-muted-foreground">${s}</span>`,
  },
];
const MARK_BY_KEY = new Map(MARKS.map((m) => [m.key, m]));

/* ================================================================== */
/*                        DOM <-> Runs conversion                       */
/* ================================================================== */

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function marksFromAncestors(node: Node, root: Node): InlineMark[] {
  const out: InlineMark[] = [];
  let cur: Node | null = node;
  while (cur && cur !== root) {
    if (cur.nodeType === 1) {
      const el = cur as HTMLElement;
      const m = el.dataset?.mark as InlineMark | undefined;
      if (m && MARK_BY_KEY.has(m)) out.push(m);
    }
    cur = cur.parentNode;
  }
  return out;
}

function runsFromLine(root: HTMLElement): Run[] {
  const runs: Run[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ALL, {
    acceptNode(n) {
      // skip inside latex chips (handled when we enter the chip)
      let p: Node | null = n.parentNode;
      while (p && p !== root) {
        if (p.nodeType === 1 && (p as HTMLElement).dataset.tex !== undefined) {
          return n === p ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
        p = p.parentNode;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n: Node | null = walker.currentNode;
  while ((n = walker.nextNode())) {
    if (n.nodeType === Node.TEXT_NODE) {
      const text = n.textContent ?? "";
      if (!text) continue;
      const marks = marksFromAncestors(n.parentNode!, root);
      runs.push({ type: "text", text, marks: marks.length ? marks : undefined });
    } else if (n.nodeType === Node.ELEMENT_NODE) {
      const el = n as HTMLElement;
      if (el.tagName === "BR") {
        runs.push({ type: "br" });
      } else if (el.dataset.tex !== undefined) {
        runs.push({ type: "latex", tex: el.dataset.tex });
      }
    }
  }
  // Coalesce identical-mark runs
  const merged: Run[] = [];
  for (const r of runs) {
    const last = merged[merged.length - 1];
    if (
      last &&
      last.type === "text" &&
      r.type === "text" &&
      JSON.stringify(last.marks ?? []) === JSON.stringify(r.marks ?? [])
    ) {
      last.text += r.text;
    } else {
      merged.push(r);
    }
  }
  return merged;
}

function runsToHtml(runs: Run[]): string {
  if (runs.length === 0) return "";
  return runs
    .map((r) => {
      if (r.type === "br") return "<br />";
      if (r.type === "latex") return latexChipHtml(r.tex);
      let html = escapeHtml(r.text);
      for (const m of r.marks ?? []) {
        const def = MARK_BY_KEY.get(m);
        if (def) html = def.render(html);
      }
      return html;
    })
    .join("");
}

function latexChipHtml(tex: string): string {
  let inner = "";
  try {
    inner = katex.renderToString(tex, { throwOnError: false, displayMode: false });
  } catch {
    inner = `<span class="font-mono">${escapeHtml(tex)}</span>`;
  }
  return `<span data-tex="${escapeHtml(tex)}" contenteditable="false" class="pencil-tex inline-block align-baseline px-1 mx-0.5 rounded border border-primary/30 bg-primary/10 text-primary cursor-pointer">${inner}</span>`;
}

/* ================================================================== */
/*                        Block model helpers                            */
/* ================================================================== */

type BlockKind = "p" | "h1" | "h2" | "h3";
interface TextEditorBlock {
  type: "text";
  kind: BlockKind;
  align?: "left" | "center" | "right";
  runs: Run[];
  key: string;
}
interface ListEditorBlock {
  type: "list";
  kind: "ul" | "ol";
  items: Run[][];
  keys: string[];
  key: string;
}
type EditorBlock = TextEditorBlock | ListEditorBlock;
const isList = (b: EditorBlock): b is ListEditorBlock => b.type === "list";
const isText = (b: EditorBlock): b is TextEditorBlock => b.type === "text";

let _kid = 0;
const newKey = () => `b${++_kid}`;

function richToBlocks(rich: RichText): EditorBlock[] {
  const out: EditorBlock[] = [];
  for (const node of rich) {
    if ("items" in node && (node.kind === "ul" || node.kind === "ol")) {
      const lb = node as ListBlock;
      out.push({
        type: "list",
        kind: lb.kind,
        items: lb.items.map((x) => x.slice()),
        keys: lb.items.map(() => newKey()),
        key: newKey(),
      });
    } else {
      const rb = node as RichBlock;
      out.push({
        type: "text",
        kind: (rb.kind ?? "p") as BlockKind,
        align: rb.align,
        runs: rb.runs.slice(),
        key: newKey(),
      });
    }
  }
  if (out.length === 0) {
    out.push({ type: "text", kind: "p", runs: [], key: newKey() });
  }
  return out;
}

function blocksToRich(blocks: EditorBlock[]): RichText {
  return blocks.map<RichBlock | ListBlock>((b) => {
    if (isList(b)) {
      return { kind: b.kind, items: b.items };
    }
    return { kind: b.kind, align: b.align, runs: b.runs };
  });
}

/* ================================================================== */
/*                        Math input modal                              */
/* ================================================================== */

function MathModal({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (tex: string) => void;
  onCancel: () => void;
}) {
  const [tex, setTex] = useState(initial);
  const previewRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!previewRef.current) return;
    try {
      previewRef.current.innerHTML = katex.renderToString(tex || "\\:", {
        throwOnError: false,
        displayMode: true,
      });
    } catch (e) {
      previewRef.current.textContent = String(e);
    }
  }, [tex]);

  const samples: { label: string; tex: string }[] = [
    { label: "frac", tex: "\\frac{a}{b}" },
    { label: "x²+y²", tex: "x^2 + y^2" },
    { label: "√x", tex: "\\sqrt{x}" },
    { label: "Σ", tex: "\\sum_{i=0}^{n} i" },
    { label: "∫", tex: "\\int_0^1 x\\,dx" },
    { label: "lim", tex: "\\lim_{x \\to 0} \\frac{\\sin x}{x}" },
    { label: "matrix", tex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}" },
    { label: "vec", tex: "\\vec{v}" },
    { label: "Δ", tex: "\\Delta x" },
    { label: "≤", tex: "\\le" },
    { label: "≥", tex: "\\ge" },
    { label: "≠", tex: "\\ne" },
    { label: "→", tex: "\\to" },
    { label: "⇌", tex: "\\rightleftharpoons" },
    { label: "subscript", tex: "H_2O" },
    { label: "exponent", tex: "10^{-3}" },
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold mb-1 flex items-center gap-2">
          <LuSigma size={14} /> Insert math (LaTeX)
        </h3>
        <p className="text-[11px] text-muted-foreground mb-3">Type LaTeX. Preview updates live.</p>
        <textarea
          autoFocus
          value={tex}
          onChange={(e) => setTex(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="\frac{1}{2}"
        />
        <div className="mt-2 flex flex-wrap gap-1">
          {samples.map((s) => (
            <button
              key={s.tex}
              type="button"
              onClick={() => setTex((cur) => (cur.trim() ? cur + " " + s.tex : s.tex))}
              title={s.tex}
              className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-muted hover:bg-primary/15 hover:text-primary border border-border"
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="mt-3 rounded-lg border border-border bg-background p-3 min-h-[48px] grid place-items-center">
          <div ref={previewRef} />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="h-8 px-3 rounded-md text-xs font-semibold hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(tex.trim())}
            disabled={!tex.trim()}
            className="h-8 px-3 rounded-md text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*                        Editable line                                  */
/* ================================================================== */

interface LineProps {
  initialHtml: string;
  align?: "left" | "center" | "right";
  className?: string;
  placeholder?: string;
  onCommit: (runs: Run[]) => void;
  onEnter: () => void;
  onBackspaceEmpty: () => void;
  onFocus: () => void;
  registerRef: (el: HTMLDivElement | null) => void;
}

function Line({
  initialHtml,
  align,
  className,
  placeholder,
  onCommit,
  onEnter,
  onBackspaceEmpty,
  onFocus,
  registerRef,
}: LineProps) {
  const ref = useRef<HTMLDivElement>(null);
  const lastHtml = useRef<string>(initialHtml);

  // Set initial HTML once + sync on external change ONLY when content changed
  useEffect(() => {
    if (!ref.current) return;
    // Never repaint the active line while the user is typing.
    // Replacing innerHTML during focus resets caret/selection and causes
    // "cursor jumps to start" behavior (especially noticeable after spaces).
    if (document.activeElement === ref.current) return;
    if (initialHtml !== lastHtml.current) {
      ref.current.innerHTML = initialHtml || "";
      lastHtml.current = initialHtml;
    } else if (ref.current.innerHTML === "") {
      ref.current.innerHTML = initialHtml || "";
    }
  }, [initialHtml]);

  function emit() {
    if (!ref.current) return;
    lastHtml.current = ref.current.innerHTML;
    onCommit(runsFromLine(ref.current));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      emit();
      onEnter();
      return;
    }
    if (e.key === "Backspace") {
      const text = ref.current?.textContent ?? "";
      const html = ref.current?.innerHTML ?? "";
      if (text === "" && html.replace(/<br\s*\/?>/g, "") === "") {
        e.preventDefault();
        onBackspaceEmpty();
        return;
      }
    }
  }

  function handleClick(e: React.MouseEvent) {
    const chip = (e.target as HTMLElement).closest("[data-tex]") as HTMLElement | null;
    if (chip) {
      e.preventDefault();
      const cur = chip.dataset.tex ?? "";
      // Use a custom event so the parent can show its modal
      ref.current?.dispatchEvent(
        new CustomEvent("pencil-edit-tex", { bubbles: true, detail: { el: chip, tex: cur } }),
      );
    }
  }

  return (
    <div
      ref={(el) => {
        ref.current = el;
        registerRef(el);
      }}
      contentEditable
      dir="ltr"
      suppressContentEditableWarning
      data-pencil-line
      onInput={emit}
      onBlur={emit}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      onFocus={onFocus}
      data-placeholder={placeholder}
      style={{ textAlign: align ?? "left", direction: "ltr", unicodeBidi: "isolate" }}
      className={cn(
        "outline-none min-h-[1.5em] focus:outline-none",
        "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/60",
        className,
      )}
    />
  );
}

/* ================================================================== */
/*                        Toolbar                                        */
/* ================================================================== */

interface ToolbarProps {
  activeMarks: Set<InlineMark>;
  blockKind: BlockKind | "ul" | "ol";
  align: "left" | "center" | "right";
  onMark: (m: InlineMark) => void;
  onBlock: (k: BlockKind) => void;
  onList: (k: "ul" | "ol") => void;
  onAlign: (a: "left" | "center" | "right") => void;
  onMath: () => void;
  onSymbol: (text: string) => void;
  onClear: () => void;
}

function ToolbarBtn({
  icon: Icon,
  title,
  active,
  onClick,
  label,
}: {
  icon?: IconType;
  title: string;
  active?: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={cn(
        "h-7 min-w-7 px-1.5 rounded-md text-xs font-semibold inline-flex items-center justify-center gap-1 transition-all",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {Icon && <Icon size={13} />}
      {label && <span>{label}</span>}
    </button>
  );
}

function Toolbar({
  activeMarks,
  blockKind,
  align,
  onMark,
  onBlock,
  onList,
  onAlign,
  onMath,
  onSymbol,
  onClear,
}: ToolbarProps) {
  const Sep = () => <span className="w-px h-5 bg-border mx-0.5 self-center" />;
  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-gradient-to-b from-muted/60 to-muted/30">
      {/* Block kind */}
      <div className="flex items-center gap-0.5">
        <ToolbarBtn
          icon={LuPilcrow}
          title="Paragraph"
          active={blockKind === "p"}
          onClick={() => onBlock("p")}
        />
        <ToolbarBtn
          title="Heading 1"
          active={blockKind === "h1"}
          onClick={() => onBlock("h1")}
          label="H1"
        />
        <ToolbarBtn
          title="Heading 2"
          active={blockKind === "h2"}
          onClick={() => onBlock("h2")}
          label="H2"
        />
        <ToolbarBtn
          title="Heading 3"
          active={blockKind === "h3"}
          onClick={() => onBlock("h3")}
          label="H3"
        />
      </div>
      <Sep />

      {/* Marks */}
      {MARKS.map((m) => (
        <ToolbarBtn
          key={m.key}
          icon={m.icon}
          title={m.title}
          active={activeMarks.has(m.key)}
          onClick={() => onMark(m.key)}
        />
      ))}
      <Sep />

      {/* Align */}
      <ToolbarBtn
        title="Align left"
        active={align === "left"}
        onClick={() => onAlign("left")}
        label="L"
      />
      <ToolbarBtn
        title="Align center"
        active={align === "center"}
        onClick={() => onAlign("center")}
        label="C"
      />
      <ToolbarBtn
        title="Align right"
        active={align === "right"}
        onClick={() => onAlign("right")}
        label="R"
      />
      <Sep />

      {/* Lists */}
      <ToolbarBtn
        icon={LuList}
        title="Bulleted list"
        active={blockKind === "ul"}
        onClick={() => onList("ul")}
      />
      <ToolbarBtn
        icon={LuListOrdered}
        title="Numbered list"
        active={blockKind === "ol"}
        onClick={() => onList("ol")}
      />
      <Sep />

      {/* Math + Symbols */}
      <ToolbarBtn icon={LuSigma} title="Insert math (LaTeX)" onClick={onMath} />
      <SymbolPicker onInsert={onSymbol} />
      <div className="flex-1" />
      <ToolbarBtn icon={LuRotateCcw} title="Clear formatting on selection" onClick={onClear} />
    </div>
  );
}

/* ================================================================== */
/*                        Mark wrap/unwrap                               */
/* ================================================================== */

function getCurrentLine(): HTMLElement | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  let n: Node | null = sel.anchorNode;
  while (n && n.nodeType !== 1) n = n.parentNode;
  while (n && n !== document.body) {
    if ((n as HTMLElement).dataset?.pencilLine !== undefined) return n as HTMLElement;
    n = n.parentNode;
  }
  return null;
}

function findMarkAncestor(
  node: Node | null,
  mark: InlineMark,
  root: HTMLElement,
): HTMLElement | null {
  let cur: Node | null = node;
  while (cur && cur !== root) {
    if (cur.nodeType === 1) {
      const el = cur as HTMLElement;
      if (el.dataset?.mark === mark) return el;
    }
    cur = cur.parentNode;
  }
  return null;
}

function toggleMarkOnSelection(mark: InlineMark) {
  const line = getCurrentLine();
  if (!line) return;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return;

  // If selection is fully inside an existing same-mark wrapper, unwrap it.
  const startMark = findMarkAncestor(range.startContainer, mark, line);
  const endMark = findMarkAncestor(range.endContainer, mark, line);
  if (startMark && startMark === endMark) {
    // unwrap the whole wrapper for simplicity
    const parent = startMark.parentNode!;
    while (startMark.firstChild) parent.insertBefore(startMark.firstChild, startMark);
    parent.removeChild(startMark);
    return;
  }

  // Wrap selection
  const def = MARK_BY_KEY.get(mark);
  if (!def) return;
  const frag = range.extractContents();
  const wrap = document.createElement("span");
  wrap.dataset.mark = mark;
  // apply the corresponding class for styling
  const sample = def.render("X");
  const m = sample.match(/class="([^"]+)"/);
  if (m) wrap.className = m[1];
  wrap.appendChild(frag);
  range.insertNode(wrap);
  // Restore selection across the inserted wrapper
  const newRange = document.createRange();
  newRange.selectNodeContents(wrap);
  sel.removeAllRanges();
  sel.addRange(newRange);
}

function clearMarksOnSelection(line: HTMLElement) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return;
  const text = range.toString();
  range.deleteContents();
  range.insertNode(document.createTextNode(text));
}

/* ================================================================== */
/*                        Main component                                 */
/* ================================================================== */

export interface PencilEditorProps {
  value: RichText;
  onChange: (next: RichText) => void;
  placeholder?: string;
  minimal?: boolean; // hide block/list/align controls
  className?: string;
}

export function PencilEditor({
  value,
  onChange,
  placeholder,
  minimal,
  className,
}: PencilEditorProps) {
  // Internal state — driven by `value` prop on mount only; we re-sync if the
  // serialized prop differs from what we last emitted.
  const lastEmitted = useRef<string>("");
  const [blocks, setBlocks] = useState<EditorBlock[]>(() => richToBlocks(value));
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [activeBlockKey, setActiveBlockKey] = useState<string | null>(null);
  const [activeListItemIdx, setActiveListItemIdx] = useState<number>(0);
  const [activeMarks, setActiveMarks] = useState<Set<InlineMark>>(new Set());
  const [mathOpen, setMathOpen] = useState(false);
  const [mathInitial, setMathInitial] = useState("");
  const editingChipRef = useRef<HTMLElement | null>(null);
  const [, force] = useState(0);

  // Sync from external `value` only if it's truly different
  useEffect(() => {
    const serialized = JSON.stringify(value);
    if (serialized !== lastEmitted.current) {
      setBlocks(richToBlocks(value));
      lastEmitted.current = serialized;
    }
  }, [value]);

  const emit = useCallback(
    (next: EditorBlock[]) => {
      const rich = blocksToRich(next);
      const s = JSON.stringify(rich);
      lastEmitted.current = s;
      onChange(rich);
    },
    [onChange],
  );

  function setAndEmit(next: EditorBlock[]) {
    setBlocks(next);
    emit(next);
  }

  /* ---------- Selection / active marks ---------- */
  const refreshActiveMarks = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      setActiveMarks(new Set());
      return;
    }
    const node = sel.anchorNode;
    if (!node || !containerRef.current?.contains(node)) {
      setActiveMarks(new Set());
      return;
    }
    const line = getCurrentLine();
    if (!line) {
      setActiveMarks(new Set());
      return;
    }
    const out = new Set<InlineMark>();
    let cur: Node | null = node;
    while (cur && cur !== line) {
      if (cur.nodeType === 1) {
        const m = (cur as HTMLElement).dataset?.mark as InlineMark | undefined;
        if (m) out.add(m);
      }
      cur = cur.parentNode;
    }
    setActiveMarks(out);
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", refreshActiveMarks);
    return () => document.removeEventListener("selectionchange", refreshActiveMarks);
  }, [refreshActiveMarks]);

  /* ---------- Listen for chip-edit events ---------- */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onEdit(e: Event) {
      const ev = e as CustomEvent<{ el: HTMLElement; tex: string }>;
      editingChipRef.current = ev.detail.el;
      setMathInitial(ev.detail.tex);
      setMathOpen(true);
    }
    el.addEventListener("pencil-edit-tex", onEdit as EventListener);
    return () => el.removeEventListener("pencil-edit-tex", onEdit as EventListener);
  }, []);

  /* ---------- Block ops ---------- */
  function activeIdx() {
    return blocks.findIndex((b) => b.key === activeBlockKey);
  }

  function currentBlock(): EditorBlock | null {
    const i = activeIdx();
    return i >= 0 ? blocks[i] : null;
  }

  function commitBlockRuns(blockKey: string, listItemIdx: number | null, runs: Run[]) {
    const next = blocks.slice();
    const i = next.findIndex((b) => b.key === blockKey);
    if (i < 0) return;
    const b = next[i];
    if (isList(b)) {
      if (listItemIdx === null) return;
      const items = b.items.slice();
      items[listItemIdx] = runs;
      next[i] = { ...b, items };
    } else {
      next[i] = { ...b, runs };
    }
    setBlocks(next);
    // Don't re-emit if structure didn't change visibly (perf), but we always emit.
    emit(next);
  }

  function insertBlockAfter(idx: number, kind: BlockKind = "p") {
    const next = blocks.slice();
    const newBlock: EditorBlock = { type: "text", kind, runs: [], key: newKey() };
    next.splice(idx + 1, 0, newBlock);
    setActiveBlockKey(newBlock.key);
    setAndEmit(next);
    setTimeout(() => lineRefs.current.get(newBlock.key)?.focus(), 0);
  }

  function insertListItemAfter(blockKey: string, itemIdx: number) {
    const next = blocks.slice();
    const i = next.findIndex((b) => b.key === blockKey);
    if (i < 0) return;
    const b = next[i];
    if (!isList(b)) return;
    const items = b.items.slice();
    const keys = b.keys.slice();
    items.splice(itemIdx + 1, 0, []);
    const k = newKey();
    keys.splice(itemIdx + 1, 0, k);
    next[i] = { ...b, items, keys };
    setAndEmit(next);
    setTimeout(() => lineRefs.current.get(`${blockKey}::${k}`)?.focus(), 0);
  }

  function removeBlock(blockKey: string) {
    if (blocks.length <= 1) {
      // Reset to a single empty paragraph
      const single: EditorBlock = { type: "text", kind: "p", runs: [], key: newKey() };
      setActiveBlockKey(single.key);
      setAndEmit([single]);
      return;
    }
    const next = blocks.filter((b) => b.key !== blockKey);
    setAndEmit(next);
    const newActive = next[Math.max(0, blocks.findIndex((b) => b.key === blockKey) - 1)];
    if (newActive) {
      setActiveBlockKey(newActive.key);
      setTimeout(() => lineRefs.current.get(newActive.key)?.focus(), 0);
    }
  }

  function removeListItem(blockKey: string, idx: number) {
    const next = blocks.slice();
    const i = next.findIndex((b) => b.key === blockKey);
    if (i < 0) return;
    const b = next[i];
    if (!isList(b)) return;
    if (b.items.length <= 1) {
      // Convert empty list back to paragraph
      const p: EditorBlock = { type: "text", kind: "p", runs: [], key: newKey() };
      next.splice(i, 1, p);
      setActiveBlockKey(p.key);
      setAndEmit(next);
      setTimeout(() => lineRefs.current.get(p.key)?.focus(), 0);
      return;
    }
    const items = b.items.slice();
    const keys = b.keys.slice();
    items.splice(idx, 1);
    const removedKey = keys.splice(idx, 1)[0];
    next[i] = { ...b, items, keys };
    setAndEmit(next);
    const focusIdx = Math.max(0, idx - 1);
    setTimeout(() => lineRefs.current.get(`${blockKey}::${keys[focusIdx]}`)?.focus(), 0);
    void removedKey;
  }

  function setBlockKind(blockKey: string, kind: BlockKind) {
    const next = blocks.slice();
    const i = next.findIndex((b) => b.key === blockKey);
    if (i < 0) return;
    const b = next[i];
    if (isList(b)) {
      // Convert first item to a single block of `kind`
      const merged: EditorBlock = { type: "text", kind, runs: b.items[0] ?? [], key: newKey() };
      next.splice(i, 1, merged);
      setActiveBlockKey(merged.key);
    } else {
      next[i] = { ...b, kind };
    }
    setAndEmit(next);
  }

  function setBlockToList(blockKey: string, kind: "ul" | "ol") {
    const next = blocks.slice();
    const i = next.findIndex((b) => b.key === blockKey);
    if (i < 0) return;
    const b = next[i];
    if (isList(b)) {
      // Toggle between ul/ol
      next[i] = { ...b, kind };
    } else {
      const list: EditorBlock = {
        type: "list",
        kind,
        items: [b.runs],
        keys: [newKey()],
        key: newKey(),
      };
      next.splice(i, 1, list);
      setActiveBlockKey(list.key);
    }
    setAndEmit(next);
  }

  function setBlockAlign(blockKey: string, align: "left" | "center" | "right") {
    const next = blocks.slice();
    const i = next.findIndex((b) => b.key === blockKey);
    if (i < 0) return;
    const b = next[i];
    if (isList(b)) return;
    next[i] = { ...b, align };
    setAndEmit(next);
  }

  /* ---------- Math ---------- */
  function openMathInsert() {
    editingChipRef.current = null;
    setMathInitial("");
    setMathOpen(true);
  }
  function commitMath(tex: string) {
    if (!tex) {
      setMathOpen(false);
      return;
    }
    if (editingChipRef.current) {
      // Update the chip in place — mutate DOM, then re-emit from line
      const chip = editingChipRef.current;
      const html = latexChipHtml(tex);
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      const newChip = tmp.firstChild as HTMLElement;
      chip.replaceWith(newChip);
      // Find the parent line and re-emit
      let line: HTMLElement | null = newChip.parentElement;
      while (line && line.dataset?.pencilLine === undefined) line = line.parentElement;
      if (line) {
        // Find which block/listitem this is and commit
        line.dispatchEvent(new InputEvent("input", { bubbles: true }));
      }
    } else {
      // Insert at caret in the active line
      const block = currentBlock();
      if (!block) return;
      const lineKey =
        block.kind === "ul" || block.kind === "ol"
          ? `${block.key}::${block.keys[activeListItemIdx]}`
          : block.key;
      const lineEl = lineRefs.current.get(lineKey);
      if (!lineEl) return;
      lineEl.focus();
      const sel = window.getSelection();
      const tmp = document.createElement("div");
      tmp.innerHTML = latexChipHtml(tex);
      const chip = tmp.firstChild as HTMLElement;
      if (sel && sel.rangeCount > 0 && lineEl.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(chip);
        range.setStartAfter(chip);
        range.setEndAfter(chip);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        lineEl.appendChild(chip);
      }
      // Trigger commit
      lineEl.dispatchEvent(new InputEvent("input", { bubbles: true }));
    }
    setMathOpen(false);
    editingChipRef.current = null;
  }

  /* ---------- Plain text insertion (symbols) ---------- */
  function insertTextAtCaret(text: string) {
    if (!text) return;
    // Resolve the active line element (or fall back to current selection's line)
    let lineEl: HTMLElement | null = getCurrentLine();
    if (!lineEl) {
      const block = currentBlock();
      if (block) {
        const lineKey =
          block.kind === "ul" || block.kind === "ol"
            ? `${block.key}::${block.keys[activeListItemIdx]}`
            : block.key;
        lineEl = lineRefs.current.get(lineKey) ?? null;
      }
    }
    if (!lineEl) return;
    lineEl.focus();
    const sel = window.getSelection();
    const node = document.createTextNode(text);
    if (sel && sel.rangeCount > 0 && lineEl.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(node);
      range.setStartAfter(node);
      range.setEndAfter(node);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      lineEl.appendChild(node);
      const range = document.createRange();
      range.selectNodeContents(lineEl);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    lineEl.dispatchEvent(new InputEvent("input", { bubbles: true }));
  }
  const cur = currentBlock();
  const curKind = cur?.kind ?? "p";
  const curAlign = (cur && isText(cur) ? cur.align : undefined) ?? "left";

  return (
    <div
      className={cn(
        "border border-input rounded-xl bg-background overflow-hidden focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 transition-all",
        className,
      )}
      ref={containerRef}
    >
      {!minimal ? (
        <Toolbar
          activeMarks={activeMarks}
          blockKind={curKind}
          align={curAlign}
          onMark={(m) => {
            toggleMarkOnSelection(m);
            // Recompute runs for the active line
            const lineEl = (() => {
              const b = currentBlock();
              if (!b) return null;
              const k =
                b.kind === "ul" || b.kind === "ol"
                  ? `${b.key}::${b.keys[activeListItemIdx]}`
                  : b.key;
              return lineRefs.current.get(k) ?? null;
            })();
            if (lineEl) lineEl.dispatchEvent(new InputEvent("input", { bubbles: true }));
            refreshActiveMarks();
          }}
          onBlock={(k) => activeBlockKey && setBlockKind(activeBlockKey, k)}
          onList={(k) => activeBlockKey && setBlockToList(activeBlockKey, k)}
          onAlign={(a) => activeBlockKey && setBlockAlign(activeBlockKey, a)}
          onMath={openMathInsert}
          onSymbol={insertTextAtCaret}
          onClear={() => {
            const line = getCurrentLine();
            if (line) {
              clearMarksOnSelection(line);
              line.dispatchEvent(new InputEvent("input", { bubbles: true }));
            }
          }}
        />
      ) : (
        // Minimal: just marks + math + symbols
        <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-border bg-muted/40">
          {MARKS.slice(0, 6).map((m) => (
            <ToolbarBtn
              key={m.key}
              icon={m.icon}
              title={m.title}
              active={activeMarks.has(m.key)}
              onClick={() => {
                toggleMarkOnSelection(m.key);
                const lineEl = getCurrentLine();
                lineEl?.dispatchEvent(new InputEvent("input", { bubbles: true }));
                refreshActiveMarks();
              }}
            />
          ))}
          <span className="w-px h-4 bg-border mx-0.5" />
          <ToolbarBtn icon={LuSigma} title="Math" onClick={openMathInsert} />
          <SymbolPicker onInsert={insertTextAtCaret} />
        </div>
      )}

      <div className="px-3 py-2 text-sm leading-relaxed pencil-doc">
        {blocks.map((b, idx) => {
          if (b.kind === "ul" || b.kind === "ol") {
            const ListTag = b.kind === "ul" ? "ul" : "ol";
            return (
              <ListTag
                key={b.key}
                className={cn(
                  b.kind === "ul" ? "list-disc" : "list-decimal",
                  "pl-6 my-1 space-y-0.5",
                )}
              >
                {b.items.map((item, j) => {
                  const lineKey = `${b.key}::${b.keys[j]}`;
                  return (
                    <li key={b.keys[j]}>
                      <Line
                        initialHtml={runsToHtml(item)}
                        placeholder={idx === 0 && j === 0 ? placeholder : undefined}
                        onCommit={(runs) => commitBlockRuns(b.key, j, runs)}
                        onEnter={() => {
                          if (item.length === 0) {
                            // Exit list — turn into paragraph after the list
                            removeListItem(b.key, j);
                            insertBlockAfter(idx, "p");
                          } else {
                            insertListItemAfter(b.key, j);
                          }
                        }}
                        onBackspaceEmpty={() => removeListItem(b.key, j)}
                        onFocus={() => {
                          setActiveBlockKey(b.key);
                          setActiveListItemIdx(j);
                          force((n) => n + 1);
                        }}
                        registerRef={(el) => {
                          if (el) lineRefs.current.set(lineKey, el);
                          else lineRefs.current.delete(lineKey);
                        }}
                      />
                    </li>
                  );
                })}
              </ListTag>
            );
          }
          const tagClass: Record<BlockKind, string> = {
            p: "my-1",
            h1: "text-xl font-bold my-2",
            h2: "text-lg font-bold my-1.5",
            h3: "text-base font-bold my-1",
          };
          const tb = b as TextEditorBlock;
          return (
            <Line
              key={tb.key}
              initialHtml={runsToHtml(tb.runs)}
              align={tb.align}
              className={tagClass[tb.kind]}
              placeholder={idx === 0 ? placeholder : undefined}
              onCommit={(runs) => commitBlockRuns(b.key, null, runs)}
              onEnter={() => insertBlockAfter(idx, "p")}
              onBackspaceEmpty={() => removeBlock(b.key)}
              onFocus={() => {
                setActiveBlockKey(b.key);
                force((n) => n + 1);
              }}
              registerRef={(el) => {
                if (el) lineRefs.current.set(b.key, el);
                else lineRefs.current.delete(b.key);
              }}
            />
          );
        })}
      </div>

      {mathOpen && (
        <MathModal
          initial={mathInitial}
          onSave={commitMath}
          onCancel={() => {
            setMathOpen(false);
            editingChipRef.current = null;
          }}
        />
      )}
    </div>
  );
}

// Backwards-compatibility re-export so existing imports keep working.
export const RichTextEditor = PencilEditor;
