// Derives "recent papers" state (attempted / submitted, progress %) from the
// data already persisted by PaperSession (`<paperId>:sel`, `<paperId>:status`)
// and analytics paper events. localStorage-only — no backend.
//
// A paper is:
//   • "attempted" when at least one question has a selected answer (per
//     PaperSession's `:sel` map) and is NOT submitted.
//   • "submitted" when analytics has recorded a paper-submit event for it.
//
// We expose a small subscribe helper so React components can re-render when
// localStorage changes (analytics persists via zustand → fires "storage" event
// across tabs and we also dispatch a custom event on writes from this tab).

import { useSyncExternalStore } from "react";
import { useAnalyticsStore } from "@/stores/useAnalyticsStore";

export type RecentStatus = "attempted" | "submitted";

export interface RecentPaperEntry {
  paperId: string;
  status: RecentStatus;
  /** number of answered questions (selected ≠ undefined) */
  answered: number;
  /** total questions stored under :status (proxy for paper length) */
  total: number;
  /** 0..1 — answered / total */
  progress: number;
  /** marks earned (only present if submitted) */
  marks?: number;
  /** epoch ms — last interaction time */
  lastTs: number;
}

const SEL_SUFFIX = ":sel";
const STATUS_SUFFIX = ":status";
const TS_KEY = "recent-papers:lastTs:v1";

/* ─────────── tiny per-paper "lastTs" tracker ─────────── */

type TsMap = Record<string, number>;

function readTsMap(): TsMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(TS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeTsMap(map: TsMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TS_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota errors */
  }
}

/** Call this whenever the user interacts with a paper (PaperSession does it for us). */
export function touchRecentPaper(paperId: string) {
  const map = readTsMap();
  map[paperId] = Date.now();
  writeTsMap(map);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("recent-papers-change"));
  }
}

/* ─────────── snapshot reading from raw localStorage ─────────── */

interface SessionSnapshot {
  selected: Record<string, string | undefined>;
  status: Record<string, "unanswered" | "answered" | "submitted">;
}

function readSession(paperId: string): SessionSnapshot {
  if (typeof window === "undefined") return { selected: {}, status: {} };
  try {
    const sel = JSON.parse(window.localStorage.getItem(paperId + SEL_SUFFIX) ?? "{}");
    const status = JSON.parse(window.localStorage.getItem(paperId + STATUS_SUFFIX) ?? "{}");
    return { selected: sel, status };
  } catch {
    return { selected: {}, status: {} };
  }
}

/** Has the user selected any answer for this paper? */
export function hasAttemptedPaper(paperId: string): boolean {
  const { selected } = readSession(paperId);
  return Object.values(selected).some((v) => v != null);
}

/** Is this paper marked as submitted (via analytics paper-submit event)? */
export function hasSubmittedPaper(paperId: string): boolean {
  const events = useAnalyticsStore.getState().papers;
  return events.some((e) => e.paperId === paperId && e.kind === "submit");
}

/** Compute recent-paper entries by scanning all known paperIds in localStorage. */
export function getRecentPapers(): RecentPaperEntry[] {
  if (typeof window === "undefined") return [];
  const tsMap = readTsMap();
  const seen = new Set<string>(Object.keys(tsMap));

  // NOTE: Previously we scanned ALL localStorage keys ending in :sel here.
  // That iterated the full storage on every render and became a perf/crash
  // hazard once profile, planner, analytics etc. were added. Disabled — we
  // now rely entirely on the touchRecentPaper() ts map + analytics events.

  const submitEvents = useAnalyticsStore.getState().papers.filter((e) => e.kind === "submit");
  for (const e of submitEvents) seen.add(e.paperId);

  const out: RecentPaperEntry[] = [];
  for (const paperId of seen) {
    // Skip synthetic smart-solve-* session ids — those aren't real papers and
    // shouldn't appear in the Recent Papers list.
    if (paperId.startsWith("smart-solve-")) continue;
    if (paperId.startsWith("exam-preview:")) continue;

    const { selected, status } = readSession(paperId);
    const answered = Object.values(selected).filter((v) => v != null).length;
    const total = Math.max(answered, Object.keys(status).length, 40); // 40 MCQs default
    const submitEvent = submitEvents.find((e) => e.paperId === paperId);
    const isSubmitted = !!submitEvent;
    if (!isSubmitted && answered === 0) continue;

    out.push({
      paperId,
      status: isSubmitted ? "submitted" : "attempted",
      answered,
      total,
      progress: total > 0 ? answered / total : 0,
      marks: submitEvent?.marks,
      lastTs: Math.max(tsMap[paperId] ?? 0, submitEvent?.ts ?? 0),
    });
  }
  out.sort((a, b) => b.lastTs - a.lastTs);
  return out;
}

/* ─────────── React subscribe helper ─────────── */

const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  const fire = () => listeners.forEach((cb) => cb());
  window.addEventListener("storage", fire);
  window.addEventListener("recent-papers-change", fire);
  // Also hook into analytics changes so submitted status flips immediately.
  useAnalyticsStore.subscribe(fire);
}

export function subscribeRecentPapers(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

let _cache: { entries: RecentPaperEntry[]; sig: string } | null = null;
function snapshot(): RecentPaperEntry[] {
  const entries = getRecentPapers();
  const sig = entries
    .map((e) => `${e.paperId}|${e.status}|${e.answered}|${e.lastTs}|${e.marks ?? ""}`)
    .join(";");
  if (_cache && _cache.sig === sig) return _cache.entries;
  _cache = { entries, sig };
  return entries;
}

export function useRecentPapers(): RecentPaperEntry[] {
  return useSyncExternalStore(subscribeRecentPapers, snapshot, snapshot);
}
