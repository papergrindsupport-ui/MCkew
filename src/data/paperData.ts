// Paper data — papers are derived from questions in `questionData.ts`.
// Hierarchy: Subject -> Year -> Session -> Variant.
// A paperId encodes everything: `${subject}-${year}-${session}-${variant}`
// e.g. "bio-2024-June-V2".
//
// Paper-level props (difficulty, priority, topics, lessons, skills, gradeThresholds)
// are auto-derived from the linked Question[] using mode/union.
// Falls back to deterministic dummy values when no questions exist for a paper.

import {
  type Difficulty,
  type Priority,
  type GradeThreshold,
  DIFFICULTIES,
  PRIORITIES,
  GRADE_THRESHOLDS,
  ALL_TAGS,
  TOPICS,
  SKILLS,
  DIFFICULTY_COLORS,
  PRIORITY_COLORS,
} from "./topics";

export {
  DIFFICULTIES,
  PRIORITIES,
  GRADE_THRESHOLDS,
  TOPICS,
  SKILLS,
  ALL_TAGS,
  DIFFICULTY_COLORS,
  PRIORITY_COLORS,
};
export type { Difficulty, Priority, GradeThreshold };
export { TAG_GROUPS } from "./topics";

import { QUESTIONS } from "./questionData";

export type Subject = "bio" | "chem" | "phys";
export type SessionKey = "Feb" | "June" | "Oct";
export type Variant = "V1" | "V2" | "V3";

export const SUBJECTS: { key: Subject; label: string; short: string }[] = [
  { key: "bio", label: "Biology", short: "Bio" },
  { key: "chem", label: "Chemistry", short: "Chem" },
  { key: "phys", label: "Physics", short: "Phys" },
];

export const SUBJECT_COLORS: Record<
  Subject,
  { bg: string; ring: string; text: string; soft: string }
> = {
  bio: {
    bg: "bg-[hsl(var(--card-green))]",
    ring: "ring-emerald-400/40",
    text: "text-emerald-700 dark:text-emerald-300",
    soft: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  chem: {
    bg: "bg-[hsl(var(--card-purple))]",
    ring: "ring-violet-400/40",
    text: "text-violet-700 dark:text-violet-300",
    soft: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  },
  phys: {
    bg: "bg-[hsl(var(--card-blue))]",
    ring: "ring-sky-400/40",
    text: "text-sky-700 dark:text-sky-300",
    soft: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  },
};

export const SUBJECT_LABEL: Record<Subject, string> = {
  bio: "Biology",
  chem: "Chemistry",
  phys: "Physics",
};

export const YEARS: number[] = Array.from({ length: 11 }, (_, i) => 2016 + i);
export const UNLOCKED_YEARS = new Set([2022, 2023, 2024, 2025, 2026]);

export const SESSIONS: { key: SessionKey; label: string }[] = [
  { key: "Feb", label: "Feb/March" },
  { key: "June", label: "May/June" },
  { key: "Oct", label: "Oct/Nov" },
];
export const SESSION_LABEL: Record<SessionKey, string> = {
  Feb: "Feb/March",
  June: "May/June",
  Oct: "Oct/Nov",
};

export const SESSION_VARIANTS: Record<SessionKey, Variant[]> = {
  Feb: ["V2"],
  June: ["V1", "V2", "V3"],
  Oct: ["V1", "V2", "V3"],
};

export interface Paper {
  id: string; // "bio-2024-June-V2"
  subject: Subject;
  year: number;
  session: SessionKey;
  variant: Variant;
  title: string;
  locked: boolean;
  difficulty?: Difficulty;
  priority?: Priority;
  gradeThresholds: GradeThreshold[];
  tags: string[];
  topics: string[];
  lessons: string[];
  skills: string[];
  questionIds: string[];
  bentoSize: "sm" | "md" | "lg" | "xl";
  /** External resource links (optional). Buttons render disabled when missing. */
  qpLink?: string;
  msLink?: string;
  gtLink?: string;
}

/* ============== ID parsing ============== */

export function parsePaperId(id: string): {
  subject: Subject;
  year: number;
  session: SessionKey;
  variant: Variant;
} | null {
  const parts = id.split("-");
  if (parts.length !== 4) return null;
  const [subject, yearStr, session, variant] = parts;
  const year = Number(yearStr);
  if (!["bio", "chem", "phys"].includes(subject)) return null;
  if (!["Feb", "June", "Oct"].includes(session)) return null;
  if (!["V1", "V2", "V3"].includes(variant)) return null;
  if (Number.isNaN(year)) return null;
  return {
    subject: subject as Subject,
    year,
    session: session as SessionKey,
    variant: variant as Variant,
  };
}

/* ============== Stat helpers ============== */

function mode<T extends string>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  const counts = new Map<T, number>();
  arr.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  let best: T | undefined;
  let max = -1;
  counts.forEach((c, k) => {
    if (c > max) {
      max = c;
      best = k;
    }
  });
  return best;
}

function pickDeterministic<T>(arr: T[], seed: number, count: number): T[] {
  const out: T[] = [];
  const used = new Set<number>();
  let s = seed;
  while (out.length < Math.min(count, arr.length)) {
    s = (s * 9301 + 49297) % 233280;
    const idx = s % arr.length;
    if (!used.has(idx)) {
      used.add(idx);
      out.push(arr[idx]);
    }
  }
  return out;
}

const BENTO_SIZES: Paper["bentoSize"][] = ["sm", "md", "lg", "xl", "md", "sm"];

/* ============== Paper construction ============== */

function buildPaper(
  subject: Subject,
  year: number,
  session: SessionKey,
  variant: Variant,
  seed: number,
): Paper {
  const id = `${subject}-${year}-${session}-${variant}`;
  const qs = QUESTIONS.filter((q) => q.paperId === id);

  const derivedDifficulty = mode(qs.map((q) => q.difficulty));
  const derivedPriority = mode(qs.map((q) => q.priority));
  const derivedTopics = Array.from(new Set(qs.flatMap((q) => q.topics)));
  const derivedLessons = Array.from(new Set(qs.flatMap((q) => q.lessons)));
  const derivedSkills = Array.from(new Set(qs.flatMap((q) => q.skills)));
  const derivedTags = Array.from(new Set(qs.flatMap((q) => q.tags)));

  // Fallback to deterministic dummy when no questions exist for that paper
  const fallbackDiff = DIFFICULTIES[(seed * 13) % DIFFICULTIES.length];
  const fallbackPrio = PRIORITIES[(seed * 17) % PRIORITIES.length];
  const fallbackGTs = pickDeterministic(GRADE_THRESHOLDS, seed + 5, (seed % 3) + 1);
  const fallbackTags = pickDeterministic(ALL_TAGS, seed + 11, seed % 4);
  const fallbackTopics = pickDeterministic(
    TOPICS.map((t) => t.key),
    seed + 19,
    (seed % 2) + 1,
  );
  const fallbackSkills = pickDeterministic(
    SKILLS.flatMap((s) => s.sub.map((x) => x.key)),
    seed + 23,
    (seed % 3) + 1,
  );

  return {
    id,
    subject,
    year,
    session,
    variant,
    title: `${year} ${session} ${variant}`,
    locked: !UNLOCKED_YEARS.has(year),
    difficulty: derivedDifficulty ?? (((seed * 7) % 100) / 100 < 0.7 ? fallbackDiff : undefined),
    priority: derivedPriority ?? (((seed * 7 + 21) % 100) / 100 < 0.55 ? fallbackPrio : undefined),
    gradeThresholds: fallbackGTs, // grade thresholds come from the paper, not questions
    tags: derivedTags.length ? derivedTags : fallbackTags,
    topics: derivedTopics.length ? derivedTopics : fallbackTopics,
    lessons: derivedLessons,
    skills: derivedSkills.length ? derivedSkills : fallbackSkills,
    questionIds: qs.map((q) => q.id),
    bentoSize: BENTO_SIZES[seed % BENTO_SIZES.length],
  };
}

export const PAPERS: Paper[] = (() => {
  return [
    buildPaper("bio", 2026, "Feb", "V2", 101),
    buildPaper("bio", 2025, "June", "V1", 102),
    buildPaper("bio", 2025, "Oct", "V3", 103),
  ];
})();

export function getPaperById(id: string): Paper | undefined {
  return PAPERS.find((p) => p.id === id);
}
