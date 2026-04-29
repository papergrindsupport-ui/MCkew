// Lightweight WYSIWYG that produces RichText (a list of RichBlock | ListBlock)
// compatible with src/data/questionData.ts and renderable by RichTextView.
//
// We use a contentEditable div, render-toolbar over it, and convert HTML <-> RichText
// on every change. Supported features:
//   - paragraphs / line breaks (Enter, Shift+Enter)
//   - bold / italic / underline / strike / sub / sup / highlight / code / muted
//   - headings h1/h2/h3 + alignment
//   - bullet / ordered lists
//   - inline LaTeX (KaTeX) via prompt — stored as a chip element
//
// Simple approach for v1; covers maths, line breaks via Enter, and inline marks.

import { useEffect, useRef, useState } from "react";
import {
  LuBold,
  LuItalic,
  LuUnderline,
  LuStrikethrough,
  LuList,
  LuListOrdered,
  LuHeading1,
  LuHeading2,
  LuHeading3,
  LuAlignLeft,
  LuAlignCenter,
  LuAlignRight,
  LuSuperscript,
  LuSubscript,
  LuHighlighter,
  LuCode,
  LuSigma,
} from "react-icons/lu";
import type { RichText, RichBlock, ListBlock, Run, InlineMark } from "@/data/questionData";
import { cn } from "@/lib/utils";

/* ─────────────── HTML <-> RichText ─────────────── */

const MARK_TO_TAG: Record<InlineMark, string> = {
  bold: "STRONG",
  italic: "EM",
  underline: "U",
  strike: "S",
  sub: "SUB",
  sup: "SUP",
  highlight: "MARK",
  muted: "SPAN",
  code: "CODE",
};

function inlineMarksFromElement(el: HTMLElement): InlineMark[] {
  const marks: InlineMark[] = [];
  let cur: HTMLElement | null = el;
  while (cur && cur.nodeType === 1 && !cur.dataset?.editorRoot) {
    const tag = cur.tagName;
    if (tag === "STRONG" || tag === "B") marks.push("bold");
    else if (tag === "EM" || tag === "I") marks.push("italic");
    else if (tag === "U") marks.push("underline");
    else if (tag === "S" || tag === "STRIKE" || tag === "DEL") marks.push("strike");
    else if (tag === "SUB") marks.push("sub");
    else if (tag === "SUP") marks.push("sup");
    else if (tag === "MARK") marks.push("highlight");
    else if (tag === "CODE") marks.push("code");
    else if (cur.classList?.contains("muted-mark")) marks.push("muted");
    cur = cur.parentElement;
  }
  return Array.from(new Set(marks));
}

function runsFromContainer(container: HTMLElement): Run[] {
  const runs: Run[] = [];
  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (!text) return;
      const parent = node.parentElement;
      const marks = parent ? inlineMarksFromElement(parent) : [];
      runs.push({ type: "text", text, marks: marks.length ? marks : undefined });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    if (el.tagName === "BR") {
      runs.push({ type: "br" });
      return;
    }
    if (el.dataset && el.dataset.editorLatex) {
      runs.push({ type: "latex", tex: el.dataset.tex ?? "" });
      return; // skip descendants
    }
    el.childNodes.forEach(visit);
  };
  container.childNodes.forEach(visit);
  return runs;
}

function nodeToRich(el: HTMLElement): RichBlock | ListBlock | null {
  const tag = el.tagName;
  if (tag === "UL" || tag === "OL") {
    const items: Run[][] = [];
    el.querySelectorAll(":scope > li").forEach((li) => {
      items.push(runsFromContainer(li as HTMLElement));
    });
    return { kind: tag === "UL" ? "ul" : "ol", items };
  }
  if (tag === "H1" || tag === "H2" || tag === "H3" || tag === "P" || tag === "DIV") {
    const runs = runsFromContainer(el);
    // Preserve empty paragraphs so pressing Enter actually adds a blank line.
    const finalRuns = runs.length === 0 ? [{ type: "br" } as Run] : runs;
    const align = el.style.textAlign;
    return {
      kind: tag.toLowerCase() as "h1" | "h2" | "h3" | "p",
      align: align === "center" || align === "right" ? align : undefined,
      runs: finalRuns,
    };
  }
  return null;
}

export function htmlToRich(root: HTMLElement): RichText {
  const out: RichText = [];
  Array.from(root.children).forEach((c) => {
    const block = nodeToRich(c as HTMLElement);
    if (block) out.push(block);
  });
  return out;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function runsToHtml(runs: Run[]): string {
  return runs
    .map((r) => {
      if (r.type === "br") return "<br />";
      if (r.type === "latex") {
        return `<span data-editor-latex="1" data-tex="${escapeHtml(r.tex)}" contenteditable="false" class="inline-block px-1 mx-0.5 rounded bg-primary/15 border border-primary/30 text-primary font-mono text-xs cursor-pointer">∑ ${escapeHtml(r.tex)}</span>`;
      }
      let html = escapeHtml(r.text);
      const marks = r.marks ?? [];
      // Wrap inside-out
      for (const m of marks) {
        const tag = MARK_TO_TAG[m].toLowerCase();
        if (m === "muted") html = `<span class="muted-mark text-muted-foreground">${html}</span>`;
        else html = `<${tag}>${html}</${tag}>`;
      }
      return html;
    })
    .join("");
}

export function richToHtml(rich: RichText): string {
  return rich
    .map((node) => {
      if ("items" in node && (node.kind === "ul" || node.kind === "ol")) {
        const items = node.items.map((runs) => `<li>${runsToHtml(runs) || "<br />"}</li>`).join("");
        return `<${node.kind}>${items}</${node.kind}>`;
      }
      const b = node as RichBlock;
      const tag = b.kind ?? "p";
      const style = b.align ? ` style="text-align:${b.align}"` : "";
      return `<${tag}${style}>${runsToHtml(b.runs) || "<br />"}</${tag}>`;
    })
    .join("");
}

/* ─────────────── Component ─────────────── */

export interface RichTextEditorProps {
  value: RichText;
  onChange: (next: RichText) => void;
  placeholder?: string;
  minimal?: boolean; // hide heading / list / align controls
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minimal,
  className,
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Track the value we last emitted so external "echoes" of our own typing
  // don't reset the editor (and the caret) on every keystroke.
  const lastEmittedValueRef = useRef<RichText | null>(null);
  const initializedRef = useRef(false);
  const [, force] = useState(0);

  // Initial mount: paint once.
  useEffect(() => {
    if (!ref.current || initializedRef.current) return;
    initializedRef.current = true;
    ref.current.innerHTML = richToHtml(value) || "<p><br /></p>";
    lastEmittedValueRef.current = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // External value changes: only re-paint when the incoming value is NOT the
  // one we just emitted (i.e. a real outside-driven change).
  useEffect(() => {
    if (!ref.current || !initializedRef.current) return;
    if (value === lastEmittedValueRef.current) return;
    // Compare structurally as a last resort (parent may have memoized differently).
    try {
      if (JSON.stringify(value) === JSON.stringify(lastEmittedValueRef.current)) return;
    } catch {
      /* fall through to repaint */
    }
    const html = richToHtml(value) || "<p><br /></p>";
    if (html !== ref.current.innerHTML) {
      ref.current.innerHTML = html;
    }
    lastEmittedValueRef.current = value;
  }, [value]);

  function emit() {
    if (!ref.current) return;
    const next = htmlToRich(ref.current);
    lastEmittedValueRef.current = next;
    onChange(next);
  }

  function exec(cmd: string, val?: string) {
    document.execCommand(cmd, false, val);
    emit();
    force((n) => n + 1);
  }

  function setBlock(tag: "p" | "h1" | "h2" | "h3") {
    document.execCommand("formatBlock", false, tag.toUpperCase());
    emit();
  }

  function setAlign(align: "left" | "center" | "right") {
    document.execCommand(`justify${align[0].toUpperCase()}${align.slice(1)}`);
    emit();
  }

  function insertLatex() {
    const tex = window.prompt("Enter LaTeX (e.g. \\frac{1}{2})", "");
    if (!tex) return;
    const span = document.createElement("span");
    span.dataset.editorLatex = "1";
    span.dataset.tex = tex;
    span.contentEditable = "false";
    span.className =
      "inline-block px-1 mx-0.5 rounded bg-primary/15 border border-primary/30 text-primary font-mono text-xs cursor-pointer";
    span.textContent = `∑ ${tex}`;
    insertNode(span);
    emit();
  }

  function insertNode(node: Node) {
    if (!ref.current) return;
    ref.current.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      ref.current.appendChild(node);
      return;
    }
    const range = sel.getRangeAt(0);
    range.insertNode(node);
    range.setStartAfter(node);
    range.setEndAfter(node);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    // Click on inline LaTeX chip = re-edit
    if (e.key === "Backspace") {
      // default is fine
    }
  }

  function onClickEditor(e: React.MouseEvent<HTMLDivElement>) {
    const target = (e.target as HTMLElement).closest("[data-editor-latex]") as HTMLElement | null;
    if (!target) return;
    e.preventDefault();
    const cur = target.dataset.tex ?? "";
    const next = window.prompt("Edit LaTeX:", cur);
    if (next === null) return;
    if (next === "") {
      target.remove();
    } else {
      target.dataset.tex = next;
      target.textContent = `∑ ${next}`;
    }
    emit();
  }

  const Btn = ({
    onClick,
    title,
    active,
    children,
  }: {
    onClick: () => void;
    title: string;
    active?: boolean;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={cn(
        "px-1.5 py-1 rounded text-xs hover:bg-muted transition-colors",
        active && "bg-muted text-foreground",
      )}
    >
      {children}
    </button>
  );

  return (
    <div className={cn("border border-input rounded-md bg-background overflow-hidden", className)}>
      <div className="flex flex-wrap items-center gap-0.5 px-1.5 py-1 border-b border-border bg-muted/40">
        <Btn onClick={() => exec("bold")} title="Bold (Ctrl+B)">
          <LuBold size={13} />
        </Btn>
        <Btn onClick={() => exec("italic")} title="Italic">
          <LuItalic size={13} />
        </Btn>
        <Btn onClick={() => exec("underline")} title="Underline">
          <LuUnderline size={13} />
        </Btn>
        <Btn onClick={() => exec("strikeThrough")} title="Strikethrough">
          <LuStrikethrough size={13} />
        </Btn>
        <Btn onClick={() => exec("superscript")} title="Superscript">
          <LuSuperscript size={13} />
        </Btn>
        <Btn onClick={() => exec("subscript")} title="Subscript">
          <LuSubscript size={13} />
        </Btn>
        <Btn
          onClick={() => document.execCommand("hiliteColor", false, "yellow") && emit()}
          title="Highlight"
        >
          <LuHighlighter size={13} />
        </Btn>
        <Btn onClick={() => exec("formatBlock", "PRE")} title="Code">
          <LuCode size={13} />
        </Btn>
        <span className="w-px h-4 bg-border mx-1" />
        {!minimal && (
          <>
            <Btn onClick={() => setBlock("h1")} title="Heading 1">
              <LuHeading1 size={13} />
            </Btn>
            <Btn onClick={() => setBlock("h2")} title="Heading 2">
              <LuHeading2 size={13} />
            </Btn>
            <Btn onClick={() => setBlock("h3")} title="Heading 3">
              <LuHeading3 size={13} />
            </Btn>
            <Btn onClick={() => setBlock("p")} title="Paragraph">
              P
            </Btn>
            <span className="w-px h-4 bg-border mx-1" />
            <Btn onClick={() => exec("insertUnorderedList")} title="Bullet list">
              <LuList size={13} />
            </Btn>
            <Btn onClick={() => exec("insertOrderedList")} title="Ordered list">
              <LuListOrdered size={13} />
            </Btn>
            <span className="w-px h-4 bg-border mx-1" />
            <Btn onClick={() => setAlign("left")} title="Align left">
              <LuAlignLeft size={13} />
            </Btn>
            <Btn onClick={() => setAlign("center")} title="Align center">
              <LuAlignCenter size={13} />
            </Btn>
            <Btn onClick={() => setAlign("right")} title="Align right">
              <LuAlignRight size={13} />
            </Btn>
            <span className="w-px h-4 bg-border mx-1" />
          </>
        )}
        <Btn onClick={insertLatex} title="Insert LaTeX (math)">
          <LuSigma size={13} />
        </Btn>
      </div>
      <div
        ref={ref}
        data-editor-root="1"
        contentEditable
        dir="ltr"
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        onKeyDown={onKeyDown}
        onClick={onClickEditor}
        data-placeholder={placeholder ?? "Start typing…"}
        style={{ direction: "ltr", unicodeBidi: "plaintext" }}
        className="prose-editor min-h-[80px] px-3 py-2 text-sm focus:outline-none [&_p]:my-1 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_h3]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground"
      />
    </div>
  );
}
