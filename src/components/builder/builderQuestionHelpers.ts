import type { Question, OptionLetter } from "@/data/questionData";

/** Synthetic paperId used for builder-local custom questions. */
export const BUILDER_PAPER_ID = "builder-custom";

/**
 * Builder-local correct-letter map keyed by question.id. We can't extend
 * Question, and the real answer key is per-paper. For builder questions
 * (custom or paper snapshots) we keep our own letter store in localStorage.
 */
const STORAGE_KEY = "builder-correct-letters-v1";

function readMap(): Record<string, OptionLetter> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, OptionLetter>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function getBuilderCorrectLetter(qid: string): OptionLetter {
  return readMap()[qid] ?? "A";
}

export function setBuilderCorrectLetter(qid: string, letter: OptionLetter | null) {
  const map = readMap();
  if (letter === null) delete map[qid];
  else map[qid] = letter;
  writeMap(map);
}

export function uidLocal(prefix = "cq"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
