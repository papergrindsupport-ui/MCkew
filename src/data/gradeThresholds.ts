// Grade thresholds (out of 40) per paper, plus per-subject min/max/avg aggregates.
// Two grade formats supported:
//   - "letter" (A*, A, B, C, D, E, F, G, U)  ← O-Level / IGCSE letter style
//   - "number" (9, 8, 7, 6, 5, 4, 3, 2, 1, U) ← GCSE 9–1 style
// Some papers may only expose one of the two formats (the other is undefined).

import type { Subject } from "./paperData";

export type GradeFormat = "letter" | "number";

export type LetterGrade = "A*" | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "U";
export type NumberGrade = "9" | "8" | "7" | "6" | "5" | "4" | "3" | "2" | "1" | "U";

export type Thresholds<G extends string> = Record<G, number>; // marks needed (out of 40)

export interface PaperThresholds {
  letter?: Thresholds<LetterGrade>;
  number?: Thresholds<NumberGrade>;
}

export type AggregateKind = "specific" | "highest" | "lowest" | "average";

const LETTER_ORDER: LetterGrade[] = ["A*", "A", "B", "C", "D", "E", "F", "G", "U"];
const NUMBER_ORDER: NumberGrade[] = ["9", "8", "7", "6", "5", "4", "3", "2", "1", "U"];

/* ───────── Deterministic generators (so every paper has unique values) ───────── */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildLetter(seed: number): Thresholds<LetterGrade> {
  // Pattern: A* high, descending. Cap & spread by seed.
  const aStar = 33 + (seed % 4); // 33..36
  const step = 3 + ((seed >> 3) % 2); // 3..4
  const out: Partial<Thresholds<LetterGrade>> = { U: 0 };
  let cur = aStar;
  for (const g of LETTER_ORDER) {
    if (g === "U") continue;
    out[g] = Math.max(1, cur);
    cur -= step - ((seed >> g.charCodeAt(0)) % 2);
  }
  return out as Thresholds<LetterGrade>;
}

function buildNumber(seed: number): Thresholds<NumberGrade> {
  const nine = 34 + (seed % 4); // 34..37
  const step = 3;
  const out: Partial<Thresholds<NumberGrade>> = { U: 0 };
  let cur = nine;
  for (const g of NUMBER_ORDER) {
    if (g === "U") continue;
    out[g] = Math.max(1, cur);
    cur -= step + ((seed >> Number(g)) % 2);
  }
  return out as Thresholds<NumberGrade>;
}

export function getPaperThresholds(paperId: string): PaperThresholds {
  const seed = hash(paperId);
  // ~70% of papers offer both, ~15% only letter, ~15% only number.
  const variant = seed % 100;
  if (variant < 70) return { letter: buildLetter(seed), number: buildNumber(seed ^ 0x9e3779b9) };
  if (variant < 85) return { letter: buildLetter(seed) };
  return { number: buildNumber(seed) };
}

/* ───────── Subject-level aggregates (min/max/avg) ───────── */
function aggregate(
  papers: PaperThresholds[],
  kind: "highest" | "lowest" | "average",
): PaperThresholds {
  const out: PaperThresholds = {};
  // Letter
  const letters = papers.map((p) => p.letter).filter(Boolean) as Thresholds<LetterGrade>[];
  if (letters.length) {
    const t = {} as Thresholds<LetterGrade>;
    for (const g of LETTER_ORDER) {
      const vals = letters.map((l) => l[g]);
      t[g] =
        kind === "highest"
          ? Math.max(...vals)
          : kind === "lowest"
            ? Math.min(...vals)
            : Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
    }
    out.letter = t;
  }
  const numbers = papers.map((p) => p.number).filter(Boolean) as Thresholds<NumberGrade>[];
  if (numbers.length) {
    const t = {} as Thresholds<NumberGrade>;
    for (const g of NUMBER_ORDER) {
      const vals = numbers.map((l) => l[g]);
      t[g] =
        kind === "highest"
          ? Math.max(...vals)
          : kind === "lowest"
            ? Math.min(...vals)
            : Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
    }
    out.number = t;
  }
  return out;
}

const SUBJECT_AGG_CACHE = new Map<
  Subject,
  { highest: PaperThresholds; lowest: PaperThresholds; average: PaperThresholds }
>();

export function getSubjectAggregates(
  subject: Subject,
  allPaperIds: string[],
): {
  highest: PaperThresholds;
  lowest: PaperThresholds;
  average: PaperThresholds;
} {
  const cached = SUBJECT_AGG_CACHE.get(subject);
  if (cached) return cached;
  const subjPapers = allPaperIds
    .filter((id) => id.startsWith(`${subject}-`))
    .map((id) => getPaperThresholds(id));
  const result = {
    highest: aggregate(subjPapers, "highest"),
    lowest: aggregate(subjPapers, "lowest"),
    average: aggregate(subjPapers, "average"),
  };
  SUBJECT_AGG_CACHE.set(subject, result);
  return result;
}

export function pickThresholds(
  paperId: string,
  subject: Subject,
  allPaperIds: string[],
  kind: AggregateKind,
): PaperThresholds {
  if (kind === "specific") return getPaperThresholds(paperId);
  return getSubjectAggregates(subject, allPaperIds)[kind];
}

export function gradeFor(marks: number, thresholds: PaperThresholds, format: GradeFormat): string {
  const t = format === "letter" ? thresholds.letter : thresholds.number;
  if (!t) return "—";
  const order = format === "letter" ? LETTER_ORDER : NUMBER_ORDER;
  for (const g of order) {
    if (marks >= (t as Record<string, number>)[g]) return g;
  }
  return "U";
}

export function availableFormats(p: PaperThresholds): GradeFormat[] {
  const out: GradeFormat[] = [];
  if (p.letter) out.push("letter");
  if (p.number) out.push("number");
  return out;
}

export { LETTER_ORDER, NUMBER_ORDER };
