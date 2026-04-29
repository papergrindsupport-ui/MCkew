// localStorage-backed admin DRAFT store + backend publish.
// Drafts live in localStorage (only the editor user touches them); when the
// admin clicks "Publish", the change is pushed to the database via the API.
// The published cache mirror is also kept in localStorage so the UI updates
// instantly, but the source of truth is the backend (see admin/merge.ts which
// hydrates `getPublishedPapers` etc. from /api/papers-overrides on app boot).

import type { Paper } from "@/data/paperData";
import type { OptionLetter, Question } from "@/data/questionData";
import type { PaperThresholds } from "@/data/gradeThresholds";
import type { ApiClient } from "@/lib/apiClient";

// Injected by AdminStoreHydrator (rendered at the root). When null, publish
// operations only update the local published cache.
let _api: ApiClient | null = null;
export function _setAdminApi(api: ApiClient | null) {
  _api = api;
}

const PAPER_DRAFTS_KEY = "admin.paperDrafts.v1";
const PAPER_PUBLISHED_KEY = "admin.papersPublished.v1";
const QUESTION_DRAFTS_KEY = "admin.questionDrafts.v1";
const QUESTION_PUBLISHED_KEY = "admin.questionsPublished.v1";
const THRESHOLD_DRAFTS_KEY = "admin.thresholdsDrafts.v1";
const THRESHOLD_PUBLISHED_KEY = "admin.thresholdsPublished.v1";
const ANSWER_KEY_DRAFTS_KEY = "admin.answerKeyDrafts.v1";
const ANSWER_KEY_PUBLISHED_KEY = "admin.answerKeyPublished.v1";

export type PaperDraft = Partial<Paper> & {
  id: string; // required, format: subject-year-session-variant
  title?: string;
};

export type QuestionDraft = Question;
export type AnswerKeyDraft = OptionLetter[];

// Snapshot cache so useSyncExternalStore gets stable references between
// renders unless the underlying localStorage string actually changed.
const snapshotCache = new Map<string, { raw: string; value: unknown }>();

function readMap<T>(key: string): Record<string, T> {
  if (typeof window === "undefined") {
    const cached = snapshotCache.get(key);
    if (cached) return cached.value as Record<string, T>;
    const empty: Record<string, T> = {};
    snapshotCache.set(key, { raw: "", value: empty });
    return empty;
  }
  let raw = "";
  try {
    raw = window.localStorage.getItem(key) ?? "";
  } catch {
    raw = "";
  }
  const cached = snapshotCache.get(key);
  if (cached && cached.raw === raw) return cached.value as Record<string, T>;
  let value: Record<string, T> = {};
  if (raw) {
    try {
      value = JSON.parse(raw) as Record<string, T>;
    } catch {
      value = {};
    }
  }
  snapshotCache.set(key, { raw, value });
  return value;
}

function writeMap<T>(key: string, val: Record<string, T>) {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.stringify(val);
    window.localStorage.setItem(key, raw);
    snapshotCache.set(key, { raw, value: val });
    // notify any in-page listeners (storage event only fires across tabs)
    window.dispatchEvent(new CustomEvent("admin-store-change", { detail: { key } }));
  } catch (e) {
    console.warn("admin store write failed", e);
  }
}

/* ─────────────── Paper drafts / published ─────────────── */

export function getPaperDrafts(): Record<string, PaperDraft> {
  return readMap<PaperDraft>(PAPER_DRAFTS_KEY);
}
export function getPublishedPapers(): Record<string, PaperDraft> {
  return readMap<PaperDraft>(PAPER_PUBLISHED_KEY);
}
export function savePaperDraft(draft: PaperDraft) {
  const all = getPaperDrafts();
  all[draft.id] = draft;
  writeMap(PAPER_DRAFTS_KEY, all);
}
export function deletePaperDraft(id: string) {
  const all = getPaperDrafts();
  delete all[id];
  writeMap(PAPER_DRAFTS_KEY, all);
}
/**
 * Publishes a paper. Synchronously updates the local published cache so the
 * UI reflects immediately, and asynchronously pushes the change to the
 * backend (admin only). Returns a promise that resolves when the backend
 * round-trip completes; resolves to `{ ok: true, remote: false }` if no
 * authenticated admin client is available.
 */
export async function publishPaper(
  id: string,
): Promise<{ ok: boolean; remote: boolean; error?: string }> {
  const drafts = getPaperDrafts();
  const qDrafts = getQuestionDrafts();
  const tDrafts = getThresholdDrafts();
  const kDrafts = getAnswerKeyDrafts();
  const draft = drafts[id];
  if (!draft) return { ok: false, remote: false, error: "No draft for paper" };

  // Local cache write (instant UI update)
  const published = getPublishedPapers();
  published[id] = draft;
  writeMap(PAPER_PUBLISHED_KEY, published);
  const qPub = getPublishedQuestions();
  qPub[id] = qDrafts[id] ?? [];
  writeMap(QUESTION_PUBLISHED_KEY, qPub);
  if (tDrafts[id]) {
    const tPub = getPublishedThresholds();
    tPub[id] = tDrafts[id];
    writeMap(THRESHOLD_PUBLISHED_KEY, tPub);
  }
  if (kDrafts[id] && kDrafts[id].length > 0) {
    const kPub = getPublishedAnswerKeys();
    kPub[id] = kDrafts[id];
    writeMap(ANSWER_KEY_PUBLISHED_KEY, kPub);
  }

  // Backend write
  if (!_api) return { ok: true, remote: false };
  try {
    await _api.upsertPaper({ ...draft, id, published: true });
    if (qDrafts[id] && qDrafts[id].length > 0) {
      await _api.putPaperQuestions(id, qDrafts[id]);
    }
    if (kDrafts[id] && kDrafts[id].length === 40) {
      await _api.putPaperAnswerKey(id, kDrafts[id].join(""));
    }
    if (tDrafts[id]) {
      await _api.putPaperThresholds(id, tDrafts[id] as { letter?: unknown; number?: unknown });
    }
    return { ok: true, remote: true };
  } catch (e) {
    const msg = (e as { error?: string })?.error || (e as Error).message || "publish failed";
    // eslint-disable-next-line no-console
    console.error("[admin] publish failed:", msg);
    return { ok: true, remote: false, error: msg };
  }
}

export async function unpublishPaper(
  id: string,
): Promise<{ ok: boolean; remote: boolean; error?: string }> {
  const published = getPublishedPapers();
  delete published[id];
  writeMap(PAPER_PUBLISHED_KEY, published);
  const qPub = getPublishedQuestions();
  delete qPub[id];
  writeMap(QUESTION_PUBLISHED_KEY, qPub);
  const tPub = getPublishedThresholds();
  delete tPub[id];
  writeMap(THRESHOLD_PUBLISHED_KEY, tPub);
  const kPub = getPublishedAnswerKeys();
  delete kPub[id];
  writeMap(ANSWER_KEY_PUBLISHED_KEY, kPub);
  if (!_api) return { ok: true, remote: false };
  try {
    await _api.upsertPaper({ id, published: false });
    return { ok: true, remote: true };
  } catch (e) {
    const msg = (e as { error?: string })?.error || (e as Error).message || "unpublish failed";
    return { ok: true, remote: false, error: msg };
  }
}

export async function deletePaperEverywhere(
  id: string,
): Promise<{ ok: boolean; remote: boolean; error?: string }> {
  const drafts = getPaperDrafts();
  delete drafts[id];
  writeMap(PAPER_DRAFTS_KEY, drafts);
  const published = getPublishedPapers();
  delete published[id];
  writeMap(PAPER_PUBLISHED_KEY, published);
  const qDrafts = getQuestionDrafts();
  delete qDrafts[id];
  writeMap(QUESTION_DRAFTS_KEY, qDrafts);
  const qPub = getPublishedQuestions();
  delete qPub[id];
  writeMap(QUESTION_PUBLISHED_KEY, qPub);
  const tDrafts = getThresholdDrafts();
  delete tDrafts[id];
  writeMap(THRESHOLD_DRAFTS_KEY, tDrafts);
  const tPub = getPublishedThresholds();
  delete tPub[id];
  writeMap(THRESHOLD_PUBLISHED_KEY, tPub);
  const kDrafts = getAnswerKeyDrafts();
  delete kDrafts[id];
  writeMap(ANSWER_KEY_DRAFTS_KEY, kDrafts);
  const kPub = getPublishedAnswerKeys();
  delete kPub[id];
  writeMap(ANSWER_KEY_PUBLISHED_KEY, kPub);
  if (!_api) return { ok: true, remote: false };
  try {
    await _api.deletePaper(id);
    return { ok: true, remote: true };
  } catch (e) {
    const msg = (e as { error?: string })?.error || (e as Error).message || "delete failed";
    return { ok: true, remote: false, error: msg };
  }
}

/* ─────────────── Question drafts / published ─────────────── */

export function getQuestionDrafts(): Record<string, QuestionDraft[]> {
  return readMap<QuestionDraft[]>(QUESTION_DRAFTS_KEY);
}
export function getPublishedQuestions(): Record<string, QuestionDraft[]> {
  return readMap<QuestionDraft[]>(QUESTION_PUBLISHED_KEY);
}
const EMPTY_QS: QuestionDraft[] = [];
export function getDraftQuestionsForPaper(paperId: string): QuestionDraft[] {
  return getQuestionDrafts()[paperId] ?? EMPTY_QS;
}
export function saveDraftQuestions(paperId: string, questions: QuestionDraft[]) {
  const all = getQuestionDrafts();
  all[paperId] = questions;
  writeMap(QUESTION_DRAFTS_KEY, all);
}

/* ─────────────── Grade thresholds drafts / published ─────────────── */

export function getThresholdDrafts(): Record<string, PaperThresholds> {
  return readMap<PaperThresholds>(THRESHOLD_DRAFTS_KEY);
}
export function getPublishedThresholds(): Record<string, PaperThresholds> {
  return readMap<PaperThresholds>(THRESHOLD_PUBLISHED_KEY);
}
export function saveDraftThresholds(paperId: string, t: PaperThresholds) {
  const all = getThresholdDrafts();
  all[paperId] = t;
  writeMap(THRESHOLD_DRAFTS_KEY, all);
}

/* ─────────────── Answer key drafts / published ─────────────── */
export function getAnswerKeyDrafts(): Record<string, AnswerKeyDraft> {
  return readMap<AnswerKeyDraft>(ANSWER_KEY_DRAFTS_KEY);
}
export function getPublishedAnswerKeys(): Record<string, AnswerKeyDraft> {
  return readMap<AnswerKeyDraft>(ANSWER_KEY_PUBLISHED_KEY);
}
export function getDraftAnswerKeyForPaper(paperId: string): AnswerKeyDraft | undefined {
  return getAnswerKeyDrafts()[paperId];
}
export function saveDraftAnswerKey(paperId: string, key: AnswerKeyDraft) {
  const all = getAnswerKeyDrafts();
  all[paperId] = key.slice(0, 40);
  writeMap(ANSWER_KEY_DRAFTS_KEY, all);
}

/* ─────────────── React subscribe helper ─────────────── */
export function subscribeAdminStore(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener("admin-store-change", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("admin-store-change", handler);
    window.removeEventListener("storage", handler);
  };
}
