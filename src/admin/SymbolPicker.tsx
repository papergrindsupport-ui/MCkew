// Symbol palette dropdown for the PencilEditor toolbar.
// Inserts a plain text character at the current selection in the active
// contentEditable line. Grouped for readability.

import { useEffect, useRef, useState } from "react";
import { LuOmega, LuChevronDown } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";
interface Group {
  label: string;
  items: { ch: string; name: string }[];
}

const GROUPS: Group[] = [
  {
    label: "Arrows",
    items: [
      { ch: "→", name: "right arrow" },
      { ch: "←", name: "left arrow" },
      { ch: "↑", name: "up arrow" },
      { ch: "↓", name: "down arrow" },
      { ch: "⇌", name: "reversible (equilibrium)" },
      { ch: "⇋", name: "reversible (alt)" },
      { ch: "⇄", name: "harpoons right-left" },
      { ch: "⇒", name: "implies" },
      { ch: "⇐", name: "implied by" },
      { ch: "⇔", name: "iff" },
      { ch: "↔", name: "left-right" },
      { ch: "↦", name: "maps to" },
      { ch: "⟶", name: "long right" },
      { ch: "⟵", name: "long left" },
    ],
  },
  {
    label: "Maths",
    items: [
      { ch: "×", name: "times" },
      { ch: "÷", name: "divide" },
      { ch: "±", name: "plus-minus" },
      { ch: "∓", name: "minus-plus" },
      { ch: "·", name: "middle dot" },
      { ch: "≈", name: "approx" },
      { ch: "≠", name: "not equal" },
      { ch: "≤", name: "≤" },
      { ch: "≥", name: "≥" },
      { ch: "∞", name: "infinity" },
      { ch: "√", name: "sqrt" },
      { ch: "∝", name: "proportional" },
      { ch: "Δ", name: "Delta" },
      { ch: "Σ", name: "Sigma" },
      { ch: "π", name: "pi" },
      { ch: "θ", name: "theta" },
      { ch: "λ", name: "lambda" },
      { ch: "μ", name: "mu" },
      { ch: "α", name: "alpha" },
      { ch: "β", name: "beta" },
      { ch: "°", name: "degree" },
    ],
  },
  {
    label: "Chemistry",
    items: [
      { ch: "⇌", name: "reversible reaction" },
      { ch: "→", name: "yields" },
      { ch: "Δ", name: "heat" },
      { ch: "(s)", name: "solid" },
      { ch: "(l)", name: "liquid" },
      { ch: "(g)", name: "gas" },
      { ch: "(aq)", name: "aqueous" },
      { ch: "⁻", name: "superscript minus" },
      { ch: "⁺", name: "superscript plus" },
      { ch: "²", name: "²" },
      { ch: "³", name: "³" },
      { ch: "₂", name: "₂" },
      { ch: "₃", name: "₃" },
      { ch: "₄", name: "₄" },
    ],
  },
  {
    label: "Misc",
    items: [
      { ch: "✓", name: "check" },
      { ch: "✗", name: "cross" },
      { ch: "•", name: "bullet" },
      { ch: "—", name: "em dash" },
      { ch: "–", name: "en dash" },
      { ch: "…", name: "ellipsis" },
      { ch: "“", name: "open quote" },
      { ch: "”", name: "close quote" },
      { ch: "‘", name: "open single" },
      { ch: "’", name: "close single" },
    ],
  },
];

interface Props {
  /** Called with the chosen text to insert. */
  onInsert: (text: string) => void;
}

export function SymbolPicker({ onInsert }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative inline-block z-[99]">
      <button
        type="button"
        title="Insert symbol"
        onMouseDown={(e) => {
          // Prevent stealing focus from the contentEditable so caret stays put.
          e.preventDefault();
          setOpen((o) => !o);
        }}
        className={cn(
          "h-7 px-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1 transition-all",
          open
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <LuOmega size={13} />
        <LuChevronDown size={11} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open &&
        createPortal(
          <div
            className="fixed z-[9999] w-72 max-h-[60vh] overflow-y-auto rounded-xl border border-border bg-popover shadow-2xl p-2"
            style={{
              top: wrapRef.current?.getBoundingClientRect().bottom ?? 0,
              left: wrapRef.current?.getBoundingClientRect().left ?? 0,
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {GROUPS.map((g) => (
              <div key={g.label} className="mb-2 last:mb-0">
                <div className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {g.label}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {g.items.map((it) => (
                    <button
                      key={`${g.label}-${it.ch}`}
                      type="button"
                      title={it.name}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onInsert(it.ch);
                      }}
                      className="h-8 grid place-items-center rounded-md text-sm hover:bg-primary/15 hover:text-primary border border-transparent hover:border-primary/30"
                    >
                      {it.ch}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
