import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LuX } from "react-icons/lu";
import {
  ALL_YEARS,
  ALL_SESSIONS,
  ALL_VARIANTS,
  SESSION_LABEL,
  updateSettings,
  usePlannerState,
  type Layout,
  type SessionKey,
  type Subject,
  type Variant,
} from "@/lib/plannerStore";
import { cn } from "@/lib/utils";

const LAYOUTS: { id: Layout; label: string; description: string }[] = [
  {
    id: "years-cols_sessions-rows_variants-subrows",
    label: "Years across, variants stacked",
    description: "Years as columns, sessions as rows with variant sub-rows.",
  },
  {
    id: "years-cols_sessions-rows_variants-subcols",
    label: "Years across, variants side-by-side",
    description: "Years as columns split into variant sub-columns.",
  },
  {
    id: "years-rows_sessions-cols_variants-subcols",
    label: "Years down, variants side-by-side",
    description: "Years as rows, sessions as columns split into variants.",
  },
  {
    id: "years-rows_sessions-cols_variants-subrows",
    label: "Years down, variants stacked",
    description: "Years as rows with variant sub-rows, sessions as columns.",
  },
];

function LayoutPreview({ id, active }: { id: Layout; active: boolean }) {
  // tiny abstract preview using divs
  const cell = (k: string) => (
    <div
      key={k}
      className={cn("h-1.5 w-1.5 rounded-sm", active ? "bg-primary" : "bg-muted-foreground/40")}
    />
  );
  const grid = (rows: number, cols: number) => (
    <div
      className="grid gap-0.5"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: rows * cols }).map((_, i) => cell(String(i)))}
    </div>
  );

  // Encode visual hint per layout
  if (id === "years-cols_sessions-rows_variants-subrows") return grid(6, 5);
  if (id === "years-cols_sessions-rows_variants-subcols") return grid(3, 9);
  if (id === "years-rows_sessions-cols_variants-subcols") return grid(5, 9);
  return grid(9, 3);
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <span
        className={cn(
          "h-4 w-4 rounded border-2 grid place-content-center transition",
          checked
            ? "bg-primary border-primary text-primary-foreground"
            : "border-border bg-background",
        )}
      >
        {checked && (
          <svg viewBox="0 0 16 16" className="h-3 w-3">
            <path
              d="M3 8.5l3 3 7-7"
              stroke="currentColor"
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      <span className="text-sm">{label}</span>
    </label>
  );
}

export function PlannerSettingsModal({
  subject,
  open,
  onClose,
}: {
  subject: Subject;
  open: boolean;
  onClose: () => void;
}) {
  const state = usePlannerState(subject);
  const { settings } = state;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const toggleYear = (y: number) => {
    const has = settings.years.includes(y);
    const next = has
      ? settings.years.filter((x) => x !== y)
      : [...settings.years, y].sort((a, b) => a - b);
    updateSettings(subject, { years: next });
  };
  const toggleSession = (s: SessionKey) => {
    const has = settings.sessions.includes(s);
    const next = has ? settings.sessions.filter((x) => x !== s) : [...settings.sessions, s];
    updateSettings(subject, { sessions: next });
  };
  const toggleVariant = (v: Variant) => {
    const has = settings.variants.includes(v);
    const next = has ? settings.variants.filter((x) => x !== v) : [...settings.variants, v];
    updateSettings(subject, { variants: next });
  };
  const setLayout = (id: Layout) => updateSettings(subject, { layout: id });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            className="relative w-full max-w-3xl max-h-[90vh] overflow-auto rounded-2xl border-2 border-border bg-card shadow-2xl"
          >
            <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card/95 backdrop-blur px-5 py-4">
              <div>
                <h2 className="text-lg font-bold">Planner settings</h2>
                <p className="text-xs text-muted-foreground">
                  Customize what's tracked and how it's laid out.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-border hover:bg-muted transition"
                aria-label="Close"
              >
                <LuX size={16} />
              </button>
            </header>

            <div className="p-5 space-y-6">
              {/* Years */}
              <section>
                <h3 className="text-sm font-bold mb-2">Years</h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {ALL_YEARS.map((y) => (
                    <Toggle
                      key={y}
                      checked={settings.years.includes(y)}
                      onChange={() => toggleYear(y)}
                      label={String(y)}
                    />
                  ))}
                </div>
              </section>

              {/* Sessions */}
              <section>
                <h3 className="text-sm font-bold mb-2">Sessions</h3>
                <div className="flex flex-wrap gap-4">
                  {ALL_SESSIONS.map((s) => {
                    const disabled = s === "fm" && !settings.variants.includes("v2");
                    return (
                      <div key={s} className={disabled ? "opacity-50" : ""}>
                        <Toggle
                          checked={settings.sessions.includes(s) && !disabled}
                          onChange={() => !disabled && toggleSession(s)}
                          label={SESSION_LABEL[s]}
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Feb/March is auto-hidden when variant 2 is disabled.
                </p>
              </section>

              {/* Variants */}
              <section>
                <h3 className="text-sm font-bold mb-2">Variants</h3>
                <div className="flex flex-wrap gap-4">
                  {ALL_VARIANTS.map((v) => (
                    <Toggle
                      key={v}
                      checked={settings.variants.includes(v)}
                      onChange={() => toggleVariant(v)}
                      label={v}
                    />
                  ))}
                </div>
              </section>

              {/* Layout */}
              <section>
                <h3 className="text-sm font-bold mb-2">Layout</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {LAYOUTS.map((l) => {
                    const active = settings.layout === l.id;
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setLayout(l.id)}
                        className={cn(
                          "text-left rounded-xl border-2 p-3 transition",
                          active
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        <div className="rounded-md border border-border bg-background p-2 mb-2 h-16 grid place-content-center overflow-hidden">
                          <LayoutPreview id={l.id} active={active} />
                        </div>
                        <div className="text-sm font-bold">{l.label}</div>
                        <div className="text-xs text-muted-foreground">{l.description}</div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <footer className="sticky bottom-0 z-10 border-t border-border bg-card/95 backdrop-blur px-5 py-3 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition"
              >
                Done
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
