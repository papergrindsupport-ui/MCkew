// URL <-> state sync helpers for /smart-solve-* pages.
//
// Goals:
//   • Reading the URL on mount lets users share/bookmark a configured page
//     (filters, search, mode, builder open, selected IDs, etc.).
//   • Changes flow back into the URL as `replaceState` (no history pollution).
//   • localStorage continues to hold the "long-term" state via existing
//     persisted zustand stores; URL takes precedence on first load when
//     params are present.
//
// Everything here is best-effort: malformed URLs are silently ignored and
// fall back to defaults / persisted state.

import { useEffect, useRef } from "react";
import type { QuestionFilters } from "@/components/smart-solve/filterQuestions";
import type { GeneratorFilters } from "@/components/papers/Generator";
import type { TriMap } from "@/components/papers/TriCheckbox";

/* ─────────────── tiny TriMap (de)serialization ─────────────── */
// Compact form: "+a,+b,-c" — '+' = true, '-' = false. Missing keys = null.

export function triMapToString(tm: TriMap): string {
  const out: string[] = [];
  for (const k of Object.keys(tm)) {
    const v = tm[k];
    if (v === true) out.push(`+${k}`);
    else if (v === false) out.push(`-${k}`);
  }
  return out.join(",");
}

export function applyTriMapString(base: TriMap, raw: string): TriMap {
  if (!raw) return base;
  const next: TriMap = { ...base };
  for (const tok of raw.split(",")) {
    if (!tok) continue;
    const sign = tok[0];
    const key = tok.slice(1);
    if (!(key in next)) continue;
    next[key] = sign === "+" ? true : sign === "-" ? false : null;
  }
  return next;
}

/* ─────────────── QuestionFilters (de)serialization ─────────────── */

const TRI_KEYS = [
  "subjects",
  "years",
  "sessions",
  "variants",
  "gts",
  "topics",
  "skills",
  "tags",
  "difficulty",
  "priority",
] as const satisfies readonly (keyof QuestionFilters)[];

export function filtersToParams(
  f: QuestionFilters,
  defaults: QuestionFilters,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of TRI_KEYS) {
    const s = triMapToString(f[k] as TriMap);
    const ds = triMapToString(defaults[k] as TriMap);
    if (s !== ds) out[`f_${k}`] = s;
  }
  if (f.sortBy !== defaults.sortBy) out.sortBy = f.sortBy;
  if (f.sortDir !== defaults.sortDir) out.sortDir = f.sortDir;
  if (f.excludeOldSyllabus !== defaults.excludeOldSyllabus)
    out.oldSyl = f.excludeOldSyllabus ? "0" : "1";
  if (f.hideLocked !== defaults.hideLocked) out.locked = f.hideLocked ? "0" : "1";
  return out;
}

export function paramsToFilters(
  defaults: QuestionFilters,
  params: URLSearchParams,
): QuestionFilters {
  const next: QuestionFilters = {
    ...defaults,
    subjects: { ...defaults.subjects },
    years: { ...defaults.years },
    sessions: { ...defaults.sessions },
    variants: { ...defaults.variants },
    gts: { ...defaults.gts },
    topics: { ...defaults.topics },
    skills: { ...defaults.skills },
    tags: { ...defaults.tags },
    difficulty: { ...defaults.difficulty },
    priority: { ...defaults.priority },
  };
  for (const k of TRI_KEYS) {
    const raw = params.get(`f_${k}`);
    if (raw != null)
      (next as unknown as Record<string, unknown>)[k] = applyTriMapString(next[k] as TriMap, raw);
  }
  const sortBy = params.get("sortBy");
  if (sortBy) next.sortBy = sortBy as QuestionFilters["sortBy"];
  const sortDir = params.get("sortDir");
  if (sortDir) next.sortDir = sortDir as QuestionFilters["sortDir"];
  const oldSyl = params.get("oldSyl");
  if (oldSyl != null) next.excludeOldSyllabus = oldSyl === "0";
  const locked = params.get("locked");
  if (locked != null) next.hideLocked = locked === "0";
  return next;
}

/* ─────────────── Generic URL writer ─────────────── */

export function writeUrlParams(updates: Record<string, string | null | undefined>) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(updates)) {
    if (v == null || v === "") url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  }
  // replaceState avoids polluting history; back button still works as the
  // user expects (it leaves the page rather than undoing each filter tweak).
  window.history.replaceState(window.history.state, "", url.toString());
}

export function readUrlParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URL(window.location.href).searchParams;
}

/* ─────────────── Once-per-mount initializer ─────────────── */

/**
 * Calls `init` exactly once on mount with the current URL params. Useful for
 * hydrating zustand stores from the URL on first render. Subsequent renders
 * are no-ops.
 */
export function useHydrateFromUrlOnce(init: (params: URLSearchParams) => void) {
  const ranRef = useRef(false);
  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    init(readUrlParams());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Mirrors a derived value to a URL param whenever it changes. Skips the
 * initial render to avoid clobbering URL params you just hydrated from.
 */
export function useMirrorToUrl(key: string, value: string | null | undefined) {
  const initialRef = useRef(true);
  useEffect(() => {
    if (initialRef.current) {
      initialRef.current = false;
      return;
    }
    writeUrlParams({ [key]: value ?? null });
  }, [key, value]);
}

/* ─────────────── Selected-IDs serialization ─────────────── */

export function selectedIdsToString(ids: Set<string>): string {
  return Array.from(ids).join("|");
}

export function selectedIdsFromString(raw: string | null): Set<string> {
  if (!raw) return new Set();
  return new Set(raw.split("|").filter(Boolean));
}

/* ─────────────── GeneratorFilters (papers index page) ─────────────── */
// Same TriMap shape as QuestionFilters but without excludeOldSyllabus / hideLocked.

const GEN_TRI_KEYS = [
  "subjects",
  "years",
  "sessions",
  "variants",
  "gts",
  "topics",
  "skills",
  "tags",
  "difficulty",
  "priority",
] as const satisfies readonly (keyof GeneratorFilters)[];

export function genFiltersToParams(
  f: GeneratorFilters,
  defaults: GeneratorFilters,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of GEN_TRI_KEYS) {
    const s = triMapToString(f[k] as TriMap);
    const ds = triMapToString(defaults[k] as TriMap);
    if (s !== ds) out[`f_${k}`] = s;
  }
  if (f.sortBy !== defaults.sortBy) out.sortBy = f.sortBy;
  if (f.sortDir !== defaults.sortDir) out.sortDir = f.sortDir;
  return out;
}

export function paramsToGenFilters(
  defaults: GeneratorFilters,
  params: URLSearchParams,
): GeneratorFilters {
  const next: GeneratorFilters = {
    ...defaults,
    subjects: { ...defaults.subjects },
    years: { ...defaults.years },
    sessions: { ...defaults.sessions },
    variants: { ...defaults.variants },
    gts: { ...defaults.gts },
    topics: { ...defaults.topics },
    skills: { ...defaults.skills },
    tags: { ...defaults.tags },
    difficulty: { ...defaults.difficulty },
    priority: { ...defaults.priority },
  };
  for (const k of GEN_TRI_KEYS) {
    const raw = params.get(`f_${k}`);
    if (raw != null) {
      (next as unknown as Record<string, unknown>)[k] = applyTriMapString(next[k] as TriMap, raw);
    }
  }
  const sortBy = params.get("sortBy");
  if (sortBy) next.sortBy = sortBy as GeneratorFilters["sortBy"];
  const sortDir = params.get("sortDir");
  if (sortDir) next.sortDir = sortDir as GeneratorFilters["sortDir"];
  return next;
}

export function hasAnyFilterParam(params: URLSearchParams): boolean {
  for (const k of params.keys()) {
    if (
      k.startsWith("f_") ||
      k === "sortBy" ||
      k === "sortDir" ||
      k === "oldSyl" ||
      k === "locked"
    ) {
      return true;
    }
  }
  return false;
}
