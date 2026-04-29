// SSR-safe contentEditable bio editor (no tiptap).
// Emits HTML strings to keep API-compatibility with the existing UserProfile.bio
// field and the /profile/$username renderer (which uses dangerouslySetInnerHTML).

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Undo2,
  Redo2,
  Heading2,
} from "lucide-react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const btnBase =
  "h-8 w-8 inline-flex items-center justify-center rounded-md text-foreground/70 hover:text-foreground hover:bg-muted transition-colors";
const btnActive = "bg-primary/15 text-primary";

export default function BioEditor({ value, onChange, placeholder }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmittedRef = useRef<string>("");
  const initializedRef = useRef(false);
  const [, force] = useState(0);

  // Initial paint (client-only — contentEditable is not SSR-friendly)
  useEffect(() => {
    if (!ref.current || initializedRef.current) return;
    initializedRef.current = true;
    ref.current.innerHTML = value || "<p><br /></p>";
    lastEmittedRef.current = ref.current.innerHTML;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // External value updates (e.g. reset)
  useEffect(() => {
    if (!ref.current || !initializedRef.current) return;
    if (value === lastEmittedRef.current) return;
    const next = value || "<p><br /></p>";
    if (ref.current.innerHTML !== next) {
      ref.current.innerHTML = next;
      lastEmittedRef.current = next;
    }
  }, [value]);

  function emit() {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    lastEmittedRef.current = html;
    onChange(html);
    force((n) => n + 1);
  }

  function exec(cmd: string, val?: string) {
    if (typeof document === "undefined") return;
    document.execCommand(cmd, false, val);
    ref.current?.focus();
    emit();
  }

  function isActive(cmd: string): boolean {
    if (typeof document === "undefined") return false;
    try {
      return document.queryCommandState(cmd);
    } catch {
      return false;
    }
  }

  function isBlock(tag: string): boolean {
    if (typeof document === "undefined") return false;
    try {
      return document.queryCommandValue("formatBlock").toLowerCase() === tag.toLowerCase();
    } catch {
      return false;
    }
  }

  const Btn = ({
    onClick,
    active,
    children,
    label,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    label: string;
  }) => (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.08 }}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      aria-label={label}
      title={label}
      className={`${btnBase} ${active ? btnActive : ""}`}
    >
      {children}
    </motion.button>
  );

  return (
    <div className="rounded-2xl border-2 border-border bg-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b-2 border-border bg-muted/40">
        <Btn label="Bold" onClick={() => exec("bold")} active={isActive("bold")}>
          <Bold size={14} />
        </Btn>
        <Btn label="Italic" onClick={() => exec("italic")} active={isActive("italic")}>
          <Italic size={14} />
        </Btn>
        <Btn label="Underline" onClick={() => exec("underline")} active={isActive("underline")}>
          <UnderlineIcon size={14} />
        </Btn>
        <Btn
          label="Strike"
          onClick={() => exec("strikeThrough")}
          active={isActive("strikeThrough")}
        >
          <Strikethrough size={14} />
        </Btn>
        <span className="mx-1 h-5 w-px bg-border" />
        <Btn label="Heading" onClick={() => exec("formatBlock", "H2")} active={isBlock("h2")}>
          <Heading2 size={14} />
        </Btn>
        <Btn
          label="Bullet list"
          onClick={() => exec("insertUnorderedList")}
          active={isActive("insertUnorderedList")}
        >
          <List size={14} />
        </Btn>
        <Btn
          label="Numbered list"
          onClick={() => exec("insertOrderedList")}
          active={isActive("insertOrderedList")}
        >
          <ListOrdered size={14} />
        </Btn>
        <Btn
          label="Quote"
          onClick={() => exec("formatBlock", "BLOCKQUOTE")}
          active={isBlock("blockquote")}
        >
          <Quote size={14} />
        </Btn>
        <span className="mx-1 h-5 w-px bg-border" />
        <Btn label="Undo" onClick={() => exec("undo")}>
          <Undo2 size={14} />
        </Btn>
        <Btn label="Redo" onClick={() => exec("redo")}>
          <Redo2 size={14} />
        </Btn>
      </div>
      <div
        ref={ref}
        contentEditable
        dir="ltr"
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        data-placeholder={placeholder ?? "Tell people about yourself..."}
        style={{ direction: "ltr", unicodeBidi: "plaintext" }}
        className="bio-editor prose prose-sm max-w-none focus:outline-none min-h-32 px-4 py-3 text-foreground"
      />
      <style>{`
        .bio-editor:empty::before,
        .bio-editor p:only-child:empty::before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
        .bio-editor:focus { outline: none; }
        .bio-editor p { margin: 0.25rem 0; }
        .bio-editor h2 { font-size: 1.1rem; font-weight: 700; margin: 0.5rem 0; }
        .bio-editor ul { list-style: disc; padding-left: 1.25rem; }
        .bio-editor ol { list-style: decimal; padding-left: 1.25rem; }
        .bio-editor blockquote { border-left: 3px solid hsl(var(--primary)); padding-left: 0.75rem; color: hsl(var(--muted-foreground)); }
      `}</style>
    </div>
  );
}
