import type { Question } from "@/data/questionData";
import type { Subject } from "@/data/paperData";

export type BuilderItemKind = "question" | "note" | "divider";

export interface BuilderQuestionItem {
  id: string;
  kind: "question";
  /** When the question came from a real paper. */
  source: { paperId: string; qid: string } | null;
  /** A snapshot of the question (so edits don't mutate the real paper). */
  question: Question;
  /** Per-item override for marks. Defaults to question.marks ?? 1. */
  marks?: number;
}

export interface BuilderNoteItem {
  id: string;
  kind: "note";
  /** Plaintext fallback for older drafts. */
  text: string;
  /** Optional rich body (preferred when present). */
  rich?: import("@/data/questionData").RichText;
}

export interface BuilderDividerItem {
  id: string;
  kind: "divider";
  color: string; // e.g. "hsl(var(--primary))" or "#fff"
  label?: string;
}

export type BuilderItem = BuilderQuestionItem | BuilderNoteItem | BuilderDividerItem;

export type DocType = "exam" | "worksheet" | "homework";

export interface FeedbackScale {
  enabled: boolean;
  labels: string[]; // default ["Failed", "Not bad", "Good", "Outstanding"]
}

export interface BuilderStyles {
  bgColor: string | null; // null = default
  textColor: string | null;
  fontFamily: string | null;
  fontSize: string | null; // e.g. "14px"
}

export interface BuilderSettings {
  title: string;
  docType: DocType;
  studentFields: {
    askName: boolean;
    askCenter: boolean;
    askSignature: boolean;
    askDate: boolean;
  };
  schoolLogo: string | null; // data url
  schoolName: string;
  teacherName: string;
  intro: string; // legacy plain-text fallback (older drafts)
  instructions: string; // legacy plain-text fallback (older drafts)
  /** WYSIWYG-authored intro. Preferred when present. */
  introRich?: import("@/data/questionData").RichText | null;
  /** WYSIWYG-authored instructions. Preferred when present. */
  instructionsRich?: import("@/data/questionData").RichText | null;
  styles: BuilderStyles;
  overallMark: { enabled: boolean; total: number };
  feedbackScale: FeedbackScale;
  deadline: string | null; // ISO datetime
  allowAfterDeadline: boolean;
  latePenalty: number;
  questionsPerPage: number;
  /** When false, hide the per-question header (subject icon, paper id, tags) and show only an inline question number. */
  showQuestionHeaders?: boolean;
}

export interface BuilderDraft {
  id: string;
  subject: Subject | "all";
  settings: BuilderSettings;
  items: BuilderItem[];
  /** User-created custom MCQs available in the sidebar. */
  customQuestions: Question[];
  updatedAt: number;
}

export const DEFAULT_FEEDBACK_LABELS = ["Failed", "Not bad", "Good", "Outstanding"];

export function makeDefaultSettings(): BuilderSettings {
  return {
    title: "Untitled Exam",
    docType: "exam",
    studentFields: {
      askName: true,
      askCenter: false,
      askSignature: false,
      askDate: true,
    },
    schoolLogo: null,
    schoolName: "",
    teacherName: "",
    intro: "",
    instructions: "",
    introRich: null,
    instructionsRich: null,
    styles: { bgColor: null, textColor: null, fontFamily: null, fontSize: null },
    overallMark: { enabled: false, total: 40 },
    feedbackScale: { enabled: false, labels: [...DEFAULT_FEEDBACK_LABELS] },
    deadline: null,
    allowAfterDeadline: true,
    latePenalty: 0,
    questionsPerPage: 5,
    showQuestionHeaders: true,
  };
}

export function itemMarks(item: BuilderItem): number {
  if (item.kind !== "question") return 0;
  return item.marks ?? 1;
}

/**
 * Resolve a possibly-legacy plain-text intro/instructions field into RichText.
 * Returns null when both inputs are empty so callers can skip rendering.
 */
export function resolveRichOrLegacy(
  rich: import("@/data/questionData").RichText | null | undefined,
  legacy: string | undefined,
): import("@/data/questionData").RichText | null {
  if (rich && rich.length > 0) return rich;
  const text = (legacy ?? "").trim();
  if (!text) return null;
  // Convert plain text → paragraphs (split on blank lines, keep line breaks).
  const paragraphs = text.split(/\n{2,}/);
  return paragraphs.map((para) => ({
    type: "p" as const,
    runs: para.split("\n").flatMap((line, i, arr) => {
      const run: import("@/data/questionData").Run = { type: "text", text: line };
      return i < arr.length - 1
        ? [run, { type: "br" as const } as import("@/data/questionData").Run]
        : [run];
    }),
  }));
}

export function totalMarks(items: BuilderItem[]): number {
  return items.reduce((s, it) => s + itemMarks(it), 0);
}
