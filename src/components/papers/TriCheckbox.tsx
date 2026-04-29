// Three-state checkbox: true (tick) -> false (cross) -> null (blank) -> true ...
import { LuCheck, LuX } from "react-icons/lu";
import { cn } from "@/lib/utils";

export type TriState = true | false | null;

export function nextTri(v: TriState): TriState {
  if (v === true) return false;
  if (v === false) return null;
  return true;
}

export function TriCheckbox({
  value,
  onChange,
  label,
  className,
}: {
  value: TriState;
  onChange: (v: TriState) => void;
  label?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(nextTri(value))}
      className={cn("flex items-center gap-2 group select-none text-left w-full", className)}
    >
      <span
        className={cn(
          "h-4 w-4 rounded border-2 grid place-content-center transition-all shrink-0",
          value === true && "bg-primary border-primary text-primary-foreground",
          value === false && "bg-destructive border-destructive text-destructive-foreground",
          value === null && "bg-background border-border",
          "group-hover:scale-110",
        )}
      >
        {value === true && <LuCheck size={12} strokeWidth={3} />}
        {value === false && <LuX size={12} strokeWidth={3} />}
      </span>
      {label && <span className="text-sm">{label}</span>}
    </button>
  );
}

export type TriMap = Record<string, TriState>;

export function buildTriMap(keys: string[], v: TriState = null): TriMap {
  return Object.fromEntries(keys.map((k) => [k, v]));
}

export function activeKeys(map: TriMap): string[] {
  return Object.entries(map)
    .filter(([, v]) => v === true)
    .map(([k]) => k);
}
export function excludedKeys(map: TriMap): string[] {
  return Object.entries(map)
    .filter(([, v]) => v === false)
    .map(([k]) => k);
}

export function applyTriFilter<T>(items: T[], map: TriMap, getKeys: (item: T) => string[]): T[] {
  const inc = activeKeys(map);
  const exc = excludedKeys(map);
  if (inc.length === 0 && exc.length === 0) return items;
  return items.filter((it) => {
    const ks = getKeys(it);
    if (exc.some((e) => ks.includes(e))) return false;
    if (inc.length === 0) return true;
    return inc.some((i) => ks.includes(i));
  });
}

export function FilterControls({
  onAll,
  onReset,
  onRandom,
}: {
  onAll: () => void;
  onReset: () => void;
  onRandom: () => void;
}) {
  return (
    <div className="flex gap-1.5 mb-3 flex-wrap">
      <button
        type="button"
        onClick={onAll}
        className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/15 text-primary hover:bg-primary/25 transition"
      >
        All
      </button>
      <button
        type="button"
        onClick={onRandom}
        className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-accent text-accent-foreground hover:bg-accent/70 transition"
      >
        Random
      </button>
      <button
        type="button"
        onClick={onReset}
        className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground hover:bg-muted/70 transition"
      >
        Reset
      </button>
    </div>
  );
}

export function randomTriMap(keys: string[]): TriMap {
  const count = Math.max(1, Math.floor(Math.random() * keys.length));
  const shuffled = [...keys].sort(() => Math.random() - 0.5).slice(0, count);
  return Object.fromEntries(keys.map((k) => [k, shuffled.includes(k) ? true : null]));
}

export function allTriMap(keys: string[]): TriMap {
  return Object.fromEntries(keys.map((k) => [k, true]));
}
