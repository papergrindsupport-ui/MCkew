// Collapsible section with icon, title, optional badge, and action slot.
// Used across the admin builder for every panel. Persists open state in
// sessionStorage so toggles survive re-renders.

import { useEffect, useState } from "react";
import { LuChevronDown } from "react-icons/lu";
import type { IconType } from "react-icons";
import { cn } from "@/lib/utils";

interface Props {
  id?: string; // optional persistence key
  icon?: IconType;
  iconClass?: string;
  title: string;
  hint?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  tone?: "default" | "primary" | "warn" | "ok";
  className?: string;
}

const TONE: Record<NonNullable<Props["tone"]>, string> = {
  default: "border-border bg-card",
  primary: "border-primary/30 bg-primary/5",
  warn: "border-amber-500/30 bg-amber-500/5",
  ok: "border-emerald-500/30 bg-emerald-500/5",
};

const TONE_ICON: Record<NonNullable<Props["tone"]>, string> = {
  default: "bg-muted text-foreground",
  primary: "bg-primary/15 text-primary",
  warn: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  ok: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
};

export function Section({
  id,
  icon: Icon,
  iconClass,
  title,
  hint,
  badge,
  action,
  defaultOpen = true,
  children,
  tone = "default",
  className,
}: Props) {
  const storageKey = id ? `admin-sec:${id}` : null;
  const [open, setOpen] = useState<boolean>(() => {
    if (!storageKey || typeof window === "undefined") return defaultOpen;
    const v = window.sessionStorage.getItem(storageKey);
    return v === null ? defaultOpen : v === "1";
  });
  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    window.sessionStorage.setItem(storageKey, open ? "1" : "0");
  }, [open, storageKey]);

  return (
    <section className={cn("rounded-2xl border overflow-hidden shadow-sm", TONE[tone], className)}>
      <header
        className={cn(
          "flex items-center gap-3 px-4 py-3 cursor-pointer select-none group",
          open && "border-b border-border/60",
        )}
        onClick={() => setOpen((o) => !o)}
      >
        {Icon && (
          <div
            className={cn(
              "h-8 w-8 rounded-lg grid place-items-center shrink-0",
              TONE_ICON[tone],
              iconClass,
            )}
          >
            <Icon size={15} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold leading-tight truncate">{title}</h3>
          {hint && <p className="text-[11px] text-muted-foreground truncate">{hint}</p>}
        </div>
        {badge}
        {action && (
          <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5">
            {action}
          </div>
        )}
        <LuChevronDown
          size={16}
          className={cn(
            "text-muted-foreground transition-transform shrink-0",
            open && "rotate-180",
            "group-hover:text-foreground",
          )}
        />
      </header>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </section>
  );
}
