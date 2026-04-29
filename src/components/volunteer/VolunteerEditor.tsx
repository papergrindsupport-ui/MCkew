import { useMemo } from "react";
import { RichTextEditor } from "@/admin/PencilEditor";
import type { RichText } from "@/data/questionData";

interface Props {
  content: RichText | unknown;
  onChange: (value: RichText) => void;
  placeholder?: string;
}

export default function VolunteerEditor({ content, onChange, placeholder }: Props) {
  const normalized = useMemo(() => coerceToRichText(content), [content]);
  const wordCount = useMemo(() => countWords(normalized), [normalized]);

  return (
    <div className="rounded-2xl border-2 border-border bg-card overflow-hidden focus-within:border-primary transition-colors">
      <RichTextEditor value={normalized} onChange={onChange} placeholder={placeholder} />
      <div className="px-4 py-1.5 border-t border-border bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{placeholder || "Tell us why you'd love to volunteer ✨"}</span>
        <span className="tabular-nums">
          {wordCount} word{wordCount === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}

function coerceToRichText(input: unknown): RichText {
  if (Array.isArray(input)) return input as RichText;
  const text = extractTextFromLegacyTipTap(input);
  if (!text) return [];
  return [{ kind: "p", runs: [{ type: "text", text }] }];
}

function extractTextFromLegacyTipTap(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as { type?: string; text?: string; content?: unknown[] };
  if (typeof n.text === "string") return n.text;
  if (!Array.isArray(n.content)) return "";
  const parts = n.content.map(extractTextFromLegacyTipTap).filter(Boolean);
  if (parts.length === 0) return "";
  if (n.type === "paragraph" || n.type === "heading" || n.type === "blockquote") {
    return `${parts.join(" ").trim()}\n`;
  }
  return parts.join(" ").trim();
}

function countWords(value: RichText): number {
  const text = value
    .flatMap((b) => ("runs" in b ? b.runs : b.items.flat()))
    .map((r) => (r.type === "text" ? r.text : ""))
    .filter(Boolean)
    .join(" ")
    .trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}
