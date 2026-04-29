// Merge published localStorage admin overrides + backend admin overrides
// on top of the built-in static catalog.
//
// Priority (highest wins):
//   1. Local admin "published" cache (instant feedback for the editor user)
//   2. Backend `papers-overrides` snapshot (loaded by AdminStoreHydrator)
//   3. Built-in PAPERS / paperQuestions

import { PAPERS, type Paper, parsePaperId } from "@/data/paperData";
import type { OptionLetter, Question } from "@/data/questionData";
import { getPaperQuestions as getBuiltinQuestions } from "@/data/paperQuestions";
import { getPublishedAnswerKeys, getPublishedPapers, getPublishedQuestions } from "./store";

// --- Backend overrides snapshot (set by AdminStoreHydrator) ---
type RemoteSnapshot = {
  papers: Record<string, Partial<Paper> & { id: string }>;
  questionsByPaper: Record<string, Question[]>;
  answerKeys: Record<string, OptionLetter[]>;
};
let _remote: RemoteSnapshot = { papers: {}, questionsByPaper: {}, answerKeys: {} };
let _remoteVersion = 0;

export function _setRemoteOverrides(snap: RemoteSnapshot) {
  _remote = snap;
  _remoteVersion++;
  // Notify subscribers (admin store change channel piggybacks here).
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("admin-store-change", { detail: { key: "remote" } }));
  }
}
export function _getRemoteVersion() {
  return _remoteVersion;
}

let _mergedPapersCache: {
  overridesRef: unknown;
  remoteVersion: number;
  value: Paper[];
} | null = null;

export function getMergedPapers(): Paper[] {
  const overrides = getPublishedPapers();
  if (
    _mergedPapersCache &&
    _mergedPapersCache.overridesRef === overrides &&
    _mergedPapersCache.remoteVersion === _remoteVersion
  ) {
    return _mergedPapersCache.value;
  }
  const result: Paper[] = [];
  const seen = new Set<string>();

  // Apply on top of built-in PAPERS
  for (const p of PAPERS) {
    seen.add(p.id);
    const remoteOv = _remote.papers[p.id];
    const localOv = overrides[p.id];
    if (!remoteOv && !localOv) {
      result.push(p);
      continue;
    }
    result.push({ ...p, ...remoteOv, ...localOv, id: p.id });
  }

  // Brand-new papers (only in overrides, not built-in)
  const allOverrideIds = new Set([...Object.keys(overrides), ...Object.keys(_remote.papers)]);
  for (const id of allOverrideIds) {
    if (seen.has(id)) continue;
    const remoteOv = _remote.papers[id];
    const localOv = overrides[id];
    const merged = { ...remoteOv, ...localOv };
    const parsed = parsePaperId(id);
    if (!parsed) continue;
    result.push({
      subject: parsed.subject,
      year: parsed.year,
      session: parsed.session,
      variant: parsed.variant,
      title: merged.title ?? `${parsed.year} ${parsed.session} ${parsed.variant}`,
      locked: false,
      gradeThresholds: merged.gradeThresholds ?? [],
      tags: merged.tags ?? [],
      topics: merged.topics ?? [],
      lessons: merged.lessons ?? [],
      skills: merged.skills ?? [],
      questionIds: merged.questionIds ?? [],
      bentoSize: merged.bentoSize ?? "md",
      ...merged,
      id,
    } as Paper);
  }

  _mergedPapersCache = { overridesRef: overrides, remoteVersion: _remoteVersion, value: result };
  return result;
}

export function getMergedPaperById(id: string): Paper | undefined {
  return getMergedPapers().find((p) => p.id === id);
}

export function getMergedQuestionsForPaper(paperId: string): Question[] {
  // Local published wins, then remote, then built-in.
  const localOv = getPublishedQuestions()[paperId];
  if (localOv && localOv.length > 0) {
    return localOv.map((q, i) => ({ ...q, number: String(i + 1) }));
  }
  const remoteOv = _remote.questionsByPaper[paperId];
  if (remoteOv && remoteOv.length > 0) {
    return remoteOv.map((q, i) => ({ ...q, number: String(i + 1) }));
  }
  return getBuiltinQuestions(paperId);
}

export function getMergedAnswerKeyForPaper(paperId: string): OptionLetter[] | null {
  const local = getPublishedAnswerKeys()[paperId];
  if (local && local.length === 40) return local;
  const remote = _remote.answerKeys[paperId];
  if (remote && remote.length === 40) return remote;
  return null;
}
