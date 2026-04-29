// localStorage-backed planner store, per subject.
// Tracks settings (which years/sessions/variants to show, layout) and which
// (year, session, variant) cells are checked off as completed.

import { useSyncExternalStore } from "react";

export type Subject = "bio" | "chem" | "phys";
export type SessionKey = "mj" | "fm" | "on";
export type Variant = "v1" | "v2" | "v3";
export type Layout =
  | "years-cols_sessions-rows_variants-subrows"
  | "years-cols_sessions-rows_variants-subcols"
  | "years-rows_sessions-cols_variants-subcols"
  | "years-rows_sessions-cols_variants-subrows";

export const ALL_YEARS: number[] = Array.from({ length: 2026 - 2016 + 1 }, (_, i) => 2016 + i);
export const ALL_SESSIONS: SessionKey[] = ["mj", "fm", "on"];
export const ALL_VARIANTS: Variant[] = ["v1", "v2", "v3"];

export const SESSION_LABEL: Record<SessionKey, string> = {
  mj: "May/June",
  fm: "Feb/March",
  on: "Oct/Nov",
};

// Variants supported per session; fm only has v2.
export function variantsForSession(s: SessionKey, enabledVariants: Variant[]): Variant[] {
  if (s === "fm") {
    return enabledVariants.includes("v2") ? ["v2"] : [];
  }
  return ALL_VARIANTS.filter((v) => enabledVariants.includes(v));
}

export type PlannerSettings = {
  years: number[];
  sessions: SessionKey[];
  variants: Variant[];
  layout: Layout;
};

export type PlannerState = {
  settings: PlannerSettings;
  // checked cell ids: `${year}-${session}-${variant}`
  checked: Record<string, true>;
};

const DEFAULT_SETTINGS: PlannerSettings = {
  years: [...ALL_YEARS],
  sessions: [...ALL_SESSIONS],
  variants: [...ALL_VARIANTS],
  layout: "years-cols_sessions-rows_variants-subrows",
};

const DEFAULT_STATE: PlannerState = {
  settings: DEFAULT_SETTINGS,
  checked: {},
};

const keyFor = (subject: Subject) => `planner.${subject}.v1`;
const EVENT = "planner-store-change";

const cache = new Map<string, { raw: string; value: PlannerState }>();

function readState(subject: Subject): PlannerState {
  const k = keyFor(subject);
  if (typeof window === "undefined") {
    const c = cache.get(k);
    if (c) return c.value;
    cache.set(k, { raw: "", value: DEFAULT_STATE });
    return DEFAULT_STATE;
  }
  let raw = "";
  try {
    raw = window.localStorage.getItem(k) ?? "";
  } catch {
    raw = "";
  }
  const c = cache.get(k);
  if (c && c.raw === raw) return c.value;
  let value: PlannerState = DEFAULT_STATE;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<PlannerState>;
      value = {
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
        checked: parsed.checked ?? {},
      };
    } catch {
      value = DEFAULT_STATE;
    }
  }
  cache.set(k, { raw, value });
  return value;
}

function writeState(subject: Subject, value: PlannerState) {
  if (typeof window === "undefined") return;
  const k = keyFor(subject);
  try {
    const raw = JSON.stringify(value);
    window.localStorage.setItem(k, raw);
    cache.set(k, { raw, value });
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { subject } }));
  } catch (e) {
    console.warn("planner write failed", e);
  }
}

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function usePlannerState(subject: Subject): PlannerState {
  return useSyncExternalStore(
    subscribe,
    () => readState(subject),
    () => DEFAULT_STATE,
  );
}

export function updateSettings(subject: Subject, patch: Partial<PlannerSettings>) {
  const cur = readState(subject);
  let nextSettings: PlannerSettings = { ...cur.settings, ...patch };
  // If v2 is removed, auto-remove fm session as it only has v2.
  if (!nextSettings.variants.includes("v2") && nextSettings.sessions.includes("fm")) {
    nextSettings = { ...nextSettings, sessions: nextSettings.sessions.filter((s) => s !== "fm") };
  }
  writeState(subject, { ...cur, settings: nextSettings });
}

export function cellId(year: number, session: SessionKey, variant: Variant) {
  return `${year}-${session}-${variant}`;
}

export function toggleCell(subject: Subject, year: number, session: SessionKey, variant: Variant) {
  const cur = readState(subject);
  const id = cellId(year, session, variant);
  const checked = { ...cur.checked };
  if (checked[id]) delete checked[id];
  else checked[id] = true;
  writeState(subject, { ...cur, checked });
}

// Build the full set of currently-active cell ids based on settings.
export function activeCellIds(settings: PlannerSettings): string[] {
  const ids: string[] = [];
  for (const y of settings.years) {
    for (const s of settings.sessions) {
      for (const v of variantsForSession(s, settings.variants)) {
        ids.push(cellId(y, s, v));
      }
    }
  }
  return ids;
}

export function progress(state: PlannerState): { done: number; total: number; pct: number } {
  const ids = activeCellIds(state.settings);
  const total = ids.length;
  let done = 0;
  for (const id of ids) if (state.checked[id]) done++;
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}
