// Centralized taxonomy: topics, lessons, skills, tags, traps, target grades.
// Imported by both questionData.ts and paperData.ts so they stay in sync.

import type { Subject } from "./paperData";

export type Difficulty = "silly" | "easy" | "medium" | "hard" | "devilish";
export type Priority = "low" | "medium" | "high" | "critical";
export type GradeThreshold = "highest" | "lowest" | "average" | "high" | "low";
export type TargetGrade = "A*" | "A" | "B" | "C" | "D" | "E";

export const DIFFICULTIES: Difficulty[] = ["silly", "easy", "medium", "hard", "devilish"];
export const PRIORITIES: Priority[] = ["low", "medium", "high", "critical"];
export const GRADE_THRESHOLDS: GradeThreshold[] = ["highest", "lowest", "average", "high", "low"];
export const TARGET_GRADES: TargetGrade[] = ["A*", "A", "B", "C", "D", "E"];

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  silly: "bg-pink-500/15 text-pink-600 dark:text-pink-300 border-pink-400/40",
  easy: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-400/40",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-400/40",
  hard: "bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-400/40",
  devilish: "bg-red-500/15 text-red-600 dark:text-red-300 border-red-400/40",
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: "bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-400/40",
  medium: "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-400/40",
  high: "bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-400/40",
  critical: "bg-red-500/15 text-red-600 dark:text-red-300 border-red-400/40",
};

export const TOPICS: {
  key: string;
  label: string;
  subject: Subject;
  lessons: { key: string; label: string }[];
}[] = [
  {
    key: "cells",
    label: "Cell Biology",
    subject: "bio",
    lessons: [
      { key: "membrane", label: "Cell Membrane" },
      { key: "organelles", label: "Organelles" },
      { key: "transport", label: "Transport" },
    ],
  },
  {
    key: "genetics",
    label: "Genetics",
    subject: "bio",
    lessons: [
      { key: "dna", label: "DNA & RNA" },
      { key: "inheritance", label: "Inheritance" },
    ],
  },
  {
    key: "plants",
    label: "Plant Biology",
    subject: "bio",
    lessons: [
      { key: "photosynthesis", label: "Photosynthesis" },
      { key: "transport-plants", label: "Plant Transport" },
    ],
  },
  {
    key: "organic",
    label: "Organic Chemistry",
    subject: "chem",
    lessons: [
      { key: "alkanes", label: "Alkanes" },
      { key: "alcohols", label: "Alcohols" },
      { key: "esters", label: "Esters" },
    ],
  },
  {
    key: "inorganic",
    label: "Inorganic Chemistry",
    subject: "chem",
    lessons: [
      { key: "acids", label: "Acids & Bases" },
      { key: "redox", label: "Redox" },
    ],
  },
  {
    key: "mechanics",
    label: "Mechanics",
    subject: "phys",
    lessons: [
      { key: "kinematics", label: "Kinematics" },
      { key: "forces", label: "Forces" },
      { key: "energy", label: "Energy" },
    ],
  },
  {
    key: "waves",
    label: "Waves & Optics",
    subject: "phys",
    lessons: [
      { key: "interference", label: "Interference" },
      { key: "diffraction", label: "Diffraction" },
    ],
  },
];

export const SKILLS: { key: string; label: string; sub: { key: string; label: string }[] }[] = [
  {
    key: "analysis",
    label: "Analysis",
    sub: [
      { key: "calculation", label: "Calculation" },
      { key: "extrapolation", label: "Extrapolation" },
      { key: "interpretation", label: "Interpretation" },
    ],
  },
  {
    key: "experimental",
    label: "Experimental",
    sub: [
      { key: "design", label: "Experiment Design" },
      { key: "errors", label: "Error Analysis" },
    ],
  },
  {
    key: "recall",
    label: "Recall",
    sub: [
      { key: "definitions", label: "Definitions" },
      { key: "diagrams", label: "Diagrams" },
    ],
  },
];

export const TAG_GROUPS: { label: string; tags: string[] }[] = [
  { label: "Importance", tags: ["important", "exam-favourite", "low-yield"] },
  { label: "Style", tags: ["wordy", "data-heavy", "diagram-heavy"] },
  { label: "Other", tags: ["tricky", "long", "short", "classic", "spicy"] },
];

export const ALL_TAGS = TAG_GROUPS.flatMap((g) => g.tags);

export const TRAPS: { key: string; label: string }[] = [
  { key: "unit-mixup", label: "Unit Mix-up" },
  { key: "axis-mislabel", label: "Axis Mislabel" },
  { key: "sig-figs", label: "Sig. Figs" },
  { key: "double-negative", label: "Double Negative Wording" },
  { key: "cause-vs-correlation", label: "Cause vs Correlation" },
  { key: "off-by-one", label: "Off-by-one Reading" },
];

export const ALL_TRAPS = TRAPS.map((t) => t.key);
