// Answer key loader. Maps paperId → array of 40 letters ("A"|"B"|"C"|"D").
// Falls back to a deterministic dummy key when the source JSON has nothing.

import raw from "./answerKey.json";
import type { OptionLetter } from "./questionData";
import type { Subject, SessionKey, Variant } from "./paperData";

type Sess = "m" | "s" | "w"; // Feb=m, June=s, Oct=w
type RawSession = (string | null)[]; // 3 entries (variants V1..V3)
type RawShape = Record<string, Record<string, Record<Sess, RawSession>>>;

const DATA = raw as RawShape;

const SUBJECT_KEY: Record<Subject, string> = {
  bio: "Biology",
  chem: "Chemistry",
  phys: "Physics",
};
const SESSION_KEY: Record<SessionKey, Sess> = { Feb: "m", June: "s", Oct: "w" };
const VARIANT_INDEX: Record<Variant, number> = { V1: 0, V2: 1, V3: 2 };

const LETTERS: OptionLetter[] = ["A", "B", "C", "D"];

function dummyKey(seed: string): OptionLetter[] {
  // Deterministic pseudo-random key from string seed
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const out: OptionLetter[] = [];
  for (let i = 0; i < 40; i++) {
    h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
    out.push(LETTERS[(h >>> 0) % 4]);
  }
  return out;
}

export function getAnswerKey(paperId: string): OptionLetter[] {
  // paperId: subject-year-session-variant, e.g. "bio-2024-June-V2"
  const parts = paperId.split("-");
  if (parts.length !== 4) return dummyKey(paperId);
  const [sub, yearStr, sessLabel, variant] = parts as [Subject, string, SessionKey, Variant];

  const subjectKey = SUBJECT_KEY[sub];
  const sessKey = SESSION_KEY[sessLabel];
  const vIdx = VARIANT_INDEX[variant];
  if (!subjectKey || !sessKey || vIdx === undefined) return dummyKey(paperId);

  const subjBlock = DATA[subjectKey];
  const yearBlock = subjBlock?.[yearStr];
  const sessArr = yearBlock?.[sessKey];
  const str = sessArr?.[vIdx];

  if (typeof str === "string" && str.length >= 40) {
    const k = str.slice(0, 40).toUpperCase().split("");
    if (k.every((c) => c === "A" || c === "B" || c === "C" || c === "D")) {
      return k as OptionLetter[];
    }
  }
  return dummyKey(paperId);
}
