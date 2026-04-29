// Persists builder export payloads in sessionStorage (and a small in-memory
// cache) so a freshly-opened /exam-preview tab can load the exact draft state
// regardless of localStorage persistence quirks.

import type { BuilderDraft } from "./types";

const KEY_PREFIX = "builder-export-payload:";

export interface ExportPayload {
  id: string;
  createdAt: number;
  /** "student" | "editor" — affects the preview UI mode. */
  audience: "student" | "editor";
  draft: BuilderDraft;
}

function uid(): string {
  return `pv-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

export function savePayload(
  draft: BuilderDraft,
  audience: "student" | "editor" = "student",
): string {
  const id = uid();
  const payload: ExportPayload = {
    id,
    createdAt: Date.now(),
    audience,
    draft: JSON.parse(JSON.stringify(draft)),
  };
  try {
    // sessionStorage doesn't transfer to a new tab, so use localStorage.
    window.localStorage.setItem(KEY_PREFIX + id, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
  return id;
}

export function loadPayload(id: string): ExportPayload | null {
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + id);
    if (!raw) return null;
    return JSON.parse(raw) as ExportPayload;
  } catch {
    return null;
  }
}

export function setPayloadAudience(id: string, audience: "student" | "editor"): void {
  const p = loadPayload(id);
  if (!p) return;
  p.audience = audience;
  try {
    window.localStorage.setItem(KEY_PREFIX + id, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}
