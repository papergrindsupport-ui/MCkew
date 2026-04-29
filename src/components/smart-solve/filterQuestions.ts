// Question-level filter logic for /smart-solve-{subject} pages.
// Mirrors paper-level GeneratorFilters but operates on Question[] joined with their Paper.

import type { Question } from "@/data/questionData";
import { type Paper, parsePaperId, type Subject } from "@/data/paperData";
import { type TriMap, buildTriMap, applyTriFilter } from "@/components/papers/TriCheckbox";
import {
  SUBJECTS,
  YEARS,
  SESSIONS,
  SESSION_VARIANTS,
  GRADE_THRESHOLDS,
  TOPICS,
  SKILLS,
  ALL_TAGS,
  DIFFICULTIES,
  PRIORITIES,
} from "@/data/paperData";

export type SortKey =
  | "year"
  | "session"
  | "variant"
  | "subject"
  | "qNumber"
  | "difficulty"
  | "priority";
export type SortDir = "asc" | "desc" | "shuffle";

export interface QuestionFilters {
  subjects: TriMap;
  years: TriMap;
  sessions: TriMap;
  variants: TriMap;
  gts: TriMap;
  topics: TriMap;
  skills: TriMap;
  tags: TriMap;
  difficulty: TriMap;
  priority: TriMap;
  sortBy: SortKey;
  sortDir: SortDir;
  excludeOldSyllabus: boolean; // true => hide questions from papers before 2020
  hideLocked: boolean;
}

const ALL_VARIANTS = Array.from(new Set(Object.values(SESSION_VARIANTS).flat()));
const ALL_TOPIC_KEYS = TOPICS.map((t) => t.key);
const ALL_SKILL_KEYS = SKILLS.flatMap((s) => s.sub.map((x) => x.key));

export function makeDefaultQuestionFilters(restrictSubject?: Subject): QuestionFilters {
  const subjMap = buildTriMap(SUBJECTS.map((s) => s.key));
  if (restrictSubject) subjMap[restrictSubject] = true;
  return {
    subjects: subjMap,
    years: buildTriMap(YEARS.map(String)),
    sessions: buildTriMap(SESSIONS.map((s) => s.key)),
    variants: buildTriMap(ALL_VARIANTS),
    gts: buildTriMap(GRADE_THRESHOLDS),
    topics: buildTriMap(ALL_TOPIC_KEYS),
    skills: buildTriMap(ALL_SKILL_KEYS),
    tags: buildTriMap(ALL_TAGS),
    difficulty: buildTriMap(DIFFICULTIES),
    priority: buildTriMap(PRIORITIES),
    sortBy: "year",
    sortDir: "desc",
    excludeOldSyllabus: false,
    hideLocked: true,
  };
}

export interface QWithPaper {
  q: Question;
  paper: Paper;
}

export function applyQuestionFilters(rows: QWithPaper[], f: QuestionFilters): QWithPaper[] {
  let out = rows;

  if (f.hideLocked) out = out.filter((r) => !r.paper.locked);
  if (f.excludeOldSyllabus) out = out.filter((r) => r.paper.year >= 2020);

  out = applyTriFilter(out, f.subjects, (r) => [r.paper.subject]);
  out = applyTriFilter(out, f.years, (r) => [String(r.paper.year)]);
  out = applyTriFilter(out, f.sessions, (r) => [r.paper.session]);
  out = applyTriFilter(out, f.variants, (r) => [r.paper.variant]);
  out = applyTriFilter(out, f.gts, (r) => r.paper.gradeThresholds);
  out = applyTriFilter(out, f.topics, (r) => r.q.topics);
  out = applyTriFilter(out, f.skills, (r) => r.q.skills);
  out = applyTriFilter(out, f.tags, (r) => r.q.tags);
  out = applyTriFilter(out, f.difficulty, (r) => (r.q.difficulty ? [r.q.difficulty] : []));
  out = applyTriFilter(out, f.priority, (r) => (r.q.priority ? [r.q.priority] : []));

  const dir = f.sortDir;
  if (dir === "shuffle") {
    out = [...out].sort(() => Math.random() - 0.5);
  } else {
    const m = dir === "asc" ? 1 : -1;
    const get = (r: QWithPaper): string | number => {
      switch (f.sortBy) {
        case "year":
          return r.paper.year;
        case "session":
          return r.paper.session;
        case "variant":
          return r.paper.variant;
        case "subject":
          return r.paper.subject;
        case "qNumber":
          return Number(r.q.number) || 0;
        case "difficulty":
          return r.q.difficulty ?? "";
        case "priority":
          return r.q.priority ?? "";
      }
    };
    out = [...out].sort((a, b) => {
      const av = get(a),
        bv = get(b);
      if (av < bv) return -1 * m;
      if (av > bv) return 1 * m;
      return 0;
    });
  }
  return out;
}

/** Flatten merged papers + their questions into rows. */
export function buildQuestionRows(
  papers: Paper[],
  questionsForPaper: (id: string) => Question[],
): QWithPaper[] {
  const rows: QWithPaper[] = [];
  for (const p of papers) {
    const qs = questionsForPaper(p.id);
    for (const q of qs) rows.push({ q, paper: p });
  }
  return rows;
}

export function questionTitle(r: QWithPaper): string {
  const parsed = parsePaperId(r.paper.id);
  if (!parsed) return `Q${r.q.number}`;
  const sess = parsed.session === "June" ? "June" : parsed.session === "Feb" ? "Feb" : "Oct";
  return `Q${r.q.number} ${parsed.year} ${sess} ${parsed.variant}`;
}
