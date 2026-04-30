// Custom dropdown — built from scratch (no Radix). Used everywhere in admin.
// Single-select with icon, label, value list, search, and keyboard navigation.
// Lists render in a fixed portal so ancestor overflow:auto does not clip them.

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LuChevronDown, LuCheck, LuSearch } from "react-icons/lu";
import type { IconType } from "react-icons";
import { cn } from "@/lib/utils";

export interface DropdownOption<V extends string | number = string> {
  value: V;
  label: string;
  hint?: string;
  icon?: IconType;
  disabled?: boolean;
}

interface Props<V extends string | number> {
  value: V;
  onChange: (v: V) => void;
  options: DropdownOption<V>[];
  placeholder?: string;
  icon?: IconType;
  searchable?: boolean;
  className?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}

export function Dropdown<V extends string | number>({
  value,
  onChange,
  options,
  placeholder = "Select…",
  icon: Icon,
  searchable,
  className,
  disabled,
  size = "md",
}: Props<V>) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);
  const id = useId();

  const current = options.find((o) => o.value === value);
  const filtered = searchable
    ? options.filter((o) => o.label.toLowerCase().includes(filter.toLowerCase()))
    : options;

  function measure() {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setBox({ top: r.bottom + 6, left: r.left, width: r.width });
  }

  useLayoutEffect(() => {
    if (!open) {
      setBox(null);
      return;
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open]);

  // Click outside (trigger OR portal panel)
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (open) {
      setHighlight(
        Math.max(
          0,
          filtered.findIndex((o) => o.value === value),
        ),
      );
      requestAnimationFrame(() =>
        panelRef.current
          ?.querySelector<HTMLElement>("[data-active=true]")
          ?.scrollIntoView({ block: "nearest" }),
      );
    } else {
      setFilter("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function pick(o: DropdownOption<V>) {
    if (o.disabled) return;
    onChange(o.value);
    setOpen(false);
  }

  function onKey(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(filtered.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlight]) pick(filtered[highlight]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  const list =
    open &&
    box &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        id={id}
        role="listbox"
        ref={panelRef}
        style={{
          position: "fixed",
          top: box.top,
          left: box.left,
          width: box.width,
          zIndex: 10050,
        }}
        className="rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl shadow-black/10 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
      >
        {searchable && (
          <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border bg-muted/40">
            <LuSearch size={12} className="text-muted-foreground" />
            <input
              autoFocus
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setHighlight(0);
              }}
              placeholder="Search…"
              className="flex-1 bg-transparent border-0 outline-none text-xs"
            />
          </div>
        )}
        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-xs text-muted-foreground text-center">No matches</div>
          )}
          {filtered.map((o, i) => {
            const active = i === highlight;
            const selected = o.value === value;
            const ItemIcon = o.icon;
            return (
              <button
                key={String(o.value)}
                data-active={active}
                role="option"
                aria-selected={selected}
                disabled={o.disabled}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(o)}
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs",
                  active && "bg-primary/10 text-primary",
                  selected && "font-semibold",
                  o.disabled && "opacity-50 cursor-not-allowed",
                )}
              >
                {ItemIcon && <ItemIcon size={13} className="shrink-0" />}
                <span className="flex-1 truncate">{o.label}</span>
                {o.hint && <span className="text-[10px] text-muted-foreground">{o.hint}</span>}
                {selected && <LuCheck size={12} className="text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>,
      document.body,
    );

  return (
    <div ref={wrapRef} className={cn("relative inline-block w-full", className)} onKeyDown={onKey}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          "group w-full inline-flex items-center gap-2 rounded-lg border border-input bg-background hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors text-left",
          size === "sm" ? "h-7 px-2 text-xs" : "h-9 px-3 text-sm",
          disabled && "opacity-50 cursor-not-allowed",
          open && "ring-2 ring-primary/30 border-primary/50",
        )}
      >
        {Icon && <Icon size={size === "sm" ? 12 : 14} className="text-muted-foreground shrink-0" />}
        {current?.icon && !Icon && (
          <current.icon size={size === "sm" ? 12 : 14} className="shrink-0" />
        )}
        <span className={cn("truncate flex-1", !current && "text-muted-foreground")}>
          {current?.label ?? placeholder}
        </span>
        <LuChevronDown
          size={size === "sm" ? 12 : 14}
          className={cn(
            "text-muted-foreground transition-transform shrink-0",
            open && "rotate-180",
          )}
        />
      </button>

      {list}
    </div>
  );
}
