// Derived analytics — pure functions over the event log.

import type { AttemptEvent, PaperEvent } from "@/stores/useAnalyticsStore";
import { QUESTIONS, type Question } from "@/data/questionData";
import { getPaperQuestions } from "@/data/paperQuestions";
import { TOPICS, SKILLS, type Difficulty } from "@/data/topics";
import { PAPERS, parsePaperId, SUBJECT_LABEL, type Subject } from "@/data/paperData";
import { getPaperThresholds, gradeFor } from "@/data/gradeThresholds";

/* ========== Question lookup ========== */

const QUESTION_INDEX = new Map<string, Question>();
for (const q of QUESTIONS) QUESTION_INDEX.set(q.id, q);

/** Resolve a question by id — falls back to building paper questions. */
export function getQuestion(id: string): Question | undefined {
  const direct = QUESTION_INDEX.get(id);
  if (direct) return direct;
  // Placeholder questions: id format `q-${paperId}-pad-${num}`
  const m = id.match(/^q-(.+)-pad-\d+$/);
  if (m) {
    const paperQs = getPaperQuestions(m[1]);
    return paperQs.find((q) => q.id === id);
  }
  return undefined;
}

/* ========== Minimum-data thresholds ========== */

export const MIN_ATTEMPTS_FOR_TRENDS = 15;
export const MIN_DAYS_FOR_RATE = 3;
export const MIN_ATTEMPTS_PER_GROUP = 3;

/* ========== Headline counters ========== */

export interface Headline {
  attempted: number;
  correct: number;
  wrong: number;
  accuracy: number; // 0..1
  wrongPct: number; // 0..1
}

export function headline(attempts: AttemptEvent[]): Headline {
  const attempted = attempts.length;
  const correct = attempts.filter((a) => a.isCorrect).length;
  const wrong = attempted - correct;
  return {
    attempted,
    correct,
    wrong,
    accuracy: attempted ? correct / attempted : 0,
    wrongPct: attempted ? wrong / attempted : 0,
  };
}

/* ========== Group-by helpers ========== */

export interface GroupStat {
  key: string;
  label: string;
  attempted: number;
  correct: number;
  accuracy: number; // 0..1
  /** strength score 0..100 — accuracy weighted by sample size */
  strength: number;
}

function strengthScore(correct: number, attempted: number): number {
  if (attempted === 0) return 0;
  const acc = correct / attempted;
  // Wilson-style shrinkage so 1/1 doesn't beat 18/20
  const shrink = attempted / (attempted + 5);
  return Math.round(acc * shrink * 100);
}

function groupBy(
  attempts: AttemptEvent[],
  keyFn: (q: Question) => string[],
  labelMap: Record<string, string>,
): GroupStat[] {
  const counts = new Map<string, { c: number; a: number }>();
  for (const ev of attempts) {
    const q = getQuestion(ev.questionId);
    if (!q) continue;
    for (const k of keyFn(q)) {
      const cur = counts.get(k) ?? { c: 0, a: 0 };
      cur.a += 1;
      if (ev.isCorrect) cur.c += 1;
      counts.set(k, cur);
    }
  }
  return Array.from(counts.entries())
    .map(([k, v]) => ({
      key: k,
      label: labelMap[k] ?? k,
      attempted: v.a,
      correct: v.c,
      accuracy: v.a ? v.c / v.a : 0,
      strength: strengthScore(v.c, v.a),
    }))
    .sort((a, b) => b.attempted - a.attempted);
}

const TOPIC_LABELS: Record<string, string> = Object.fromEntries(
  TOPICS.map((t) => [t.key, t.label]),
);
const LESSON_LABELS: Record<string, string> = Object.fromEntries(
  TOPICS.flatMap((t) => t.lessons.map((l) => [l.key, l.label])),
);
const SKILL_LABELS: Record<string, string> = Object.fromEntries(
  SKILLS.flatMap((s) => s.sub.map((sub) => [sub.key, sub.label])),
);
const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  silly: "Silly",
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  devilish: "Devilish",
};

export const byTopic = (a: AttemptEvent[]) => groupBy(a, (q) => q.topics, TOPIC_LABELS);
export const byLesson = (a: AttemptEvent[]) => groupBy(a, (q) => q.lessons, LESSON_LABELS);
export const bySkill = (a: AttemptEvent[]) => groupBy(a, (q) => q.skills, SKILL_LABELS);
export const byDifficulty = (a: AttemptEvent[]) =>
  groupBy(a, (q) => [q.difficulty], DIFFICULTY_LABELS);
export const bySubject = (a: AttemptEvent[]) =>
  groupBy(
    a,
    (q) => {
      const sub = parsePaperId(q.paperId)?.subject;
      return sub ? [sub] : [];
    },
    SUBJECT_LABEL,
  );

/** Strong = strength >= 60 (with min sample), Weak = strength < 40. */
export function classify(stats: GroupStat[]): { strong: GroupStat[]; weak: GroupStat[] } {
  const eligible = stats.filter((s) => s.attempted >= MIN_ATTEMPTS_PER_GROUP);
  return {
    strong: eligible.filter((s) => s.strength >= 60).sort((a, b) => b.strength - a.strength),
    weak: eligible.filter((s) => s.strength < 40).sort((a, b) => a.strength - b.strength),
  };
}

/* ========== Time series ========== */

export type Bucket = "day" | "week" | "month";

function bucketKey(ts: number, b: Bucket): string {
  const d = new Date(ts);
  if (b === "day") return d.toISOString().slice(0, 10);
  if (b === "month") return d.toISOString().slice(0, 7);
  // week: Mon-anchored
  const day = (d.getUTCDay() + 6) % 7;
  const monday = new Date(d.getTime() - day * 86400000);
  return monday.toISOString().slice(0, 10);
}

export interface TimePoint {
  bucket: string;
  attempted: number;
  correct: number;
  accuracy: number;
}

export function timeSeries(attempts: AttemptEvent[], b: Bucket = "day"): TimePoint[] {
  const map = new Map<string, { a: number; c: number }>();
  for (const ev of attempts) {
    const k = bucketKey(ev.ts, b);
    const cur = map.get(k) ?? { a: 0, c: 0 };
    cur.a += 1;
    if (ev.isCorrect) cur.c += 1;
    map.set(k, cur);
  }
  return Array.from(map.entries())
    .map(([bucket, v]) => ({
      bucket,
      attempted: v.a,
      correct: v.c,
      accuracy: v.a ? v.c / v.a : 0,
    }))
    .sort((x, y) => (x.bucket < y.bucket ? -1 : 1));
}

/** Rolling average over last `window` attempts (chronological). */
export function rollingAccuracy(
  attempts: AttemptEvent[],
  window = 20,
): { i: number; acc: number }[] {
  const sorted = [...attempts].sort((a, b) => a.ts - b.ts);
  const out: { i: number; acc: number }[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = sorted.slice(start, i + 1);
    const c = slice.filter((x) => x.isCorrect).length;
    out.push({ i: i + 1, acc: c / slice.length });
  }
  return out;
}

/* ========== Improvement (linear-regression slope on rolling acc) ========== */

export interface ImprovementInfo {
  /** slope of accuracy per attempt (e.g. +0.005 = 0.5pp per attempt) */
  slope: number;
  direction: "up" | "down" | "flat";
  enoughData: boolean;
}

export function improvement(attempts: AttemptEvent[]): ImprovementInfo {
  const enough = attempts.length >= MIN_ATTEMPTS_FOR_TRENDS;
  if (!enough) return { slope: 0, direction: "flat", enoughData: false };
  const roll = rollingAccuracy(attempts, 10);
  const n = roll.length;
  const meanX = (n + 1) / 2;
  const meanY = roll.reduce((s, p) => s + p.acc, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of roll) {
    num += (p.i - meanX) * (p.acc - meanY);
    den += (p.i - meanX) ** 2;
  }
  const slope = den ? num / den : 0;
  const direction = slope > 0.002 ? "up" : slope < -0.002 ? "down" : "flat";
  return { slope, direction, enoughData: true };
}

/** Per-skill improvement rates. */
export function improvementBySkill(attempts: AttemptEvent[]): Record<string, ImprovementInfo> {
  const out: Record<string, ImprovementInfo> = {};
  const groups = new Map<string, AttemptEvent[]>();
  for (const ev of attempts) {
    const q = getQuestion(ev.questionId);
    if (!q) continue;
    for (const sk of q.skills) {
      if (!groups.has(sk)) groups.set(sk, []);
      groups.get(sk)!.push(ev);
    }
  }
  groups.forEach((evs, sk) => {
    out[sk] = improvement(evs);
  });
  return out;
}

/* ========== Confidence ========== */

export interface ConfidenceInfo {
  /** average answer changes (0 = decisive, higher = hesitant) */
  avgChanges: number;
  /** 0..100 confidence score (100 = no changes) */
  score: number;
  enoughData: boolean;
}

export function confidence(attempts: AttemptEvent[]): ConfidenceInfo {
  const enough = attempts.length >= MIN_ATTEMPTS_PER_GROUP;
  if (!enough) return { avgChanges: 0, score: 0, enoughData: false };
  const avg = attempts.reduce((s, a) => s + a.changes, 0) / attempts.length;
  const score = Math.round(Math.max(0, 100 - avg * 25));
  return { avgChanges: avg, score, enoughData: true };
}

export function confidenceByTopic(attempts: AttemptEvent[]): GroupStat[] {
  const groups = new Map<string, AttemptEvent[]>();
  for (const ev of attempts) {
    const q = getQuestion(ev.questionId);
    if (!q) continue;
    for (const tk of q.topics) {
      if (!groups.has(tk)) groups.set(tk, []);
      groups.get(tk)!.push(ev);
    }
  }
  return Array.from(groups.entries())
    .map(([k, evs]) => {
      const ci = confidence(evs);
      return {
        key: k,
        label: TOPIC_LABELS[k] ?? k,
        attempted: evs.length,
        correct: evs.filter((x) => x.isCorrect).length,
        accuracy: evs.filter((x) => x.isCorrect).length / evs.length,
        strength: ci.score,
      };
    })
    .sort((a, b) => b.strength - a.strength);
}

/* ========== Comfort-zone / Overconfidence ========== */

export type Zone =
  | { kind: "comfort"; reason: string }
  | { kind: "overconfidence"; reason: string }
  | { kind: "balanced"; reason: string }
  | { kind: "insufficient" };

export function detectZone(attempts: AttemptEvent[]): Zone {
  if (attempts.length < MIN_ATTEMPTS_FOR_TRENDS) return { kind: "insufficient" };
  const diffs = byDifficulty(attempts);
  const total = diffs.reduce((s, d) => s + d.attempted, 0);
  const easyShare =
    diffs
      .filter((d) => d.key === "silly" || d.key === "easy")
      .reduce((s, d) => s + d.attempted, 0) / total;
  const hardShare =
    diffs
      .filter((d) => d.key === "hard" || d.key === "devilish")
      .reduce((s, d) => s + d.attempted, 0) / total;
  if (easyShare >= 0.8) {
    return {
      kind: "comfort",
      reason: `${Math.round(easyShare * 100)}% of your attempts are easy/silly. Try harder questions.`,
    };
  }
  if (hardShare >= 0.8) {
    return {
      kind: "overconfidence",
      reason: `${Math.round(hardShare * 100)}% of your attempts are hard/devilish. Reinforce fundamentals.`,
    };
  }
  return { kind: "balanced", reason: "Healthy mix of difficulties." };
}

/* ========== Papers ========== */

export interface PaperResult {
  paperId: string;
  ts: number;
  marks: number;
  total: number;
  pct: number;
  passed: boolean; // pass = >=50%
  difficulty?: Difficulty;
  subject?: Subject;
  grade: string;
}

export function paperResults(papers: PaperEvent[]): PaperResult[] {
  return papers
    .filter((p) => p.kind === "submit")
    .map((p) => {
      const total = p.total ?? 40;
      const marks = p.marks ?? 0;
      const pct = total ? marks / total : 0;
      const meta = PAPERS.find((x) => x.id === p.paperId);
      const th = getPaperThresholds(p.paperId);
      return {
        paperId: p.paperId,
        ts: p.ts,
        marks,
        total,
        pct,
        passed: pct >= 0.5,
        difficulty: meta?.difficulty,
        subject: meta?.subject,
        grade: gradeFor(marks, th, th.letter ? "letter" : "number"),
      };
    })
    .sort((a, b) => b.ts - a.ts);
}

export interface PaperBuckets {
  attempted: number;
  submitted: number;
  passed: number;
  failed: number;
  totalMarks: number;
  byDifficulty: { key: string; attempted: number; passed: number; failed: number }[];
  bySubject: { key: string; label: string; attempted: number; passed: number; failed: number }[];
}

export function paperBuckets(papers: PaperEvent[]): PaperBuckets {
  const attemptedIds = new Set(papers.filter((p) => p.kind === "attempt").map((p) => p.paperId));
  const submits = paperResults(papers);
  const byDiff = new Map<string, { a: number; p: number; f: number }>();
  const bySub = new Map<string, { a: number; p: number; f: number }>();
  for (const id of attemptedIds) {
    const meta = PAPERS.find((x) => x.id === id);
    if (meta?.difficulty) {
      const cur = byDiff.get(meta.difficulty) ?? { a: 0, p: 0, f: 0 };
      cur.a++;
      byDiff.set(meta.difficulty, cur);
    }
    if (meta?.subject) {
      const cur = bySub.get(meta.subject) ?? { a: 0, p: 0, f: 0 };
      cur.a++;
      bySub.set(meta.subject, cur);
    }
  }
  for (const r of submits) {
    if (r.difficulty) {
      const cur = byDiff.get(r.difficulty) ?? { a: 0, p: 0, f: 0 };
      if (r.passed) cur.p++;
      else cur.f++;
      byDiff.set(r.difficulty, cur);
    }
    if (r.subject) {
      const cur = bySub.get(r.subject) ?? { a: 0, p: 0, f: 0 };
      if (r.passed) cur.p++;
      else cur.f++;
      bySub.set(r.subject, cur);
    }
  }
  return {
    attempted: attemptedIds.size,
    submitted: submits.length,
    passed: submits.filter((s) => s.passed).length,
    failed: submits.filter((s) => !s.passed).length,
    totalMarks: submits.reduce((s, r) => s + r.marks, 0),
    byDifficulty: Array.from(byDiff.entries()).map(([key, v]) => ({
      key,
      attempted: v.a,
      passed: v.p,
      failed: v.f,
    })),
    bySubject: Array.from(bySub.entries()).map(([key, v]) => ({
      key,
      label: SUBJECT_LABEL[key as Subject] ?? key,
      attempted: v.a,
      passed: v.p,
      failed: v.f,
    })),
  };
}

/* ========== Subjects to revise ========== */

export function subjectsToRevise(attempts: AttemptEvent[]): {
  weakest: GroupStat[];
  strongest: GroupStat[];
} {
  const subs = bySubject(attempts).filter((s) => s.attempted >= MIN_ATTEMPTS_PER_GROUP);
  const sorted = [...subs].sort((a, b) => a.strength - b.strength);
  return { weakest: sorted.slice(0, 2), strongest: sorted.slice(-2).reverse() };
}

/* ========== Days active ========== */

export function daysActive(attempts: AttemptEvent[]): number {
  return new Set(attempts.map((a) => bucketKey(a.ts, "day"))).size;
}
