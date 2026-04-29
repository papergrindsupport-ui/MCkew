// Exam session countdown store — hardcoded exam dates per (subject, session),
// plus user-settable display preferences (font, color, format, ...).

import { useSyncExternalStore } from "react";

export type CdSubject = "bio" | "chem" | "phys";
export type CdSessionId =
  | "mj-2026"
  | "on-2026"
  | "fm-2027"
  | "mj-2027"
  | "on-2027"
  | "fm-2028"
  | "mj-2028"
  | "on-2028";

export const SESSION_LIST: { id: CdSessionId; label: string }[] = [
  { id: "mj-2026", label: "May/June 2026" },
  { id: "on-2026", label: "Oct/Nov 2026" },
  { id: "fm-2027", label: "Feb/March 2027" },
  { id: "mj-2027", label: "May/June 2027" },
  { id: "on-2027", label: "Oct/Nov 2027" },
  { id: "fm-2028", label: "Feb/March 2028" },
  { id: "mj-2028", label: "May/June 2028" },
  { id: "on-2028", label: "Oct/Nov 2028" },
];

// Hardcoded exam dates — unique per (subject, session), all after 2026-06-01,
// all at midnight (00:00 local).
// Dates chosen to spread across the session windows.
export const EXAM_DATES: Record<CdSessionId, Record<CdSubject, string>> = {
  "mj-2026": { bio: "2026-06-04T00:00", chem: "2026-06-09T00:00", phys: "2026-06-15T00:00" },
  "on-2026": { bio: "2026-10-12T00:00", chem: "2026-10-19T00:00", phys: "2026-10-26T00:00" },
  "fm-2027": { bio: "2027-02-22T00:00", chem: "2027-02-25T00:00", phys: "2027-03-02T00:00" },
  "mj-2027": { bio: "2027-06-07T00:00", chem: "2027-06-11T00:00", phys: "2027-06-17T00:00" },
  "on-2027": { bio: "2027-10-11T00:00", chem: "2027-10-18T00:00", phys: "2027-10-25T00:00" },
  "fm-2028": { bio: "2028-02-21T00:00", chem: "2028-02-24T00:00", phys: "2028-03-01T00:00" },
  "mj-2028": { bio: "2028-06-05T00:00", chem: "2028-06-09T00:00", phys: "2028-06-16T00:00" },
  "on-2028": { bio: "2028-10-09T00:00", chem: "2028-10-16T00:00", phys: "2028-10-23T00:00" },
};

export const SUBJECT_LABEL: Record<CdSubject, string> = {
  bio: "Biology",
  chem: "Chemistry",
  phys: "Physics",
};

export type CountdownFormat = {
  days: boolean;
  hours: boolean;
  minutes: boolean;
  seconds: boolean;
};

export type CountdownPrefs = {
  subject: CdSubject;
  session: CdSessionId;
  background: string;
  fontColor: string;
  fontFamily: string;
  fontSize: number;
  format: CountdownFormat;
};

const DEFAULT_PREFS: CountdownPrefs = {
  subject: "bio",
  session: "mj-2026",
  background: "hsl(var(--card))",
  fontColor: "hsl(var(--foreground))",
  fontFamily: "Fredoka, system-ui, sans-serif",
  fontSize: 64,
  format: { days: true, hours: true, minutes: true, seconds: true },
};

const KEY = "planner.countdown.v1";
const EVENT = "planner-countdown-change";

let cache: { raw: string; value: CountdownPrefs } | null = null;

function read(): CountdownPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  let raw = "";
  try {
    raw = window.localStorage.getItem(KEY) ?? "";
  } catch {
    raw = "";
  }
  if (cache && cache.raw === raw) return cache.value;
  let value = DEFAULT_PREFS;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      value = {
        ...DEFAULT_PREFS,
        ...parsed,
        format: { ...DEFAULT_PREFS.format, ...(parsed.format ?? {}) },
      };
    } catch {
      value = DEFAULT_PREFS;
    }
  }
  cache = { raw, value };
  return value;
}

function write(value: CountdownPrefs) {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.stringify(value);
    window.localStorage.setItem(KEY, raw);
    cache = { raw, value };
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {}
}

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const h = () => cb();
  window.addEventListener(EVENT, h);
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener(EVENT, h);
    window.removeEventListener("storage", h);
  };
}

export function useCountdownPrefs(): CountdownPrefs {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_PREFS);
}

export function updateCountdownPrefs(patch: Partial<CountdownPrefs>) {
  const cur = read();
  write({ ...cur, ...patch, format: { ...cur.format, ...(patch.format ?? {}) } });
}
