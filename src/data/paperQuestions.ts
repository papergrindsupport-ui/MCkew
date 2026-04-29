// Builds the canonical 40-question list for a paper.
// Uses explicit hardcoded questions from QUESTIONS, then pads with deterministic
// placeholder text-option MCQs. Each paper has exactly 40 questions = 40 marks.

import type { Question, OptionLetter } from "./questionData";
import { QUESTIONS, p, t } from "./questionData";
import { parsePaperId, SUBJECT_LABEL } from "./paperData";
import type { Difficulty, Priority, TargetGrade } from "./topics";

const PAPER_QUESTION_COUNT = 40;
const LETTERS: OptionLetter[] = ["A", "B", "C", "D"];

const DIFFS: Difficulty[] = ["silly", "easy", "medium", "hard", "devilish"];
const PRIOS: Priority[] = ["low", "medium", "high", "critical"];
const GRADES: TargetGrade[] = ["A*", "A", "B", "C", "D", "E"];

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makePlaceholder(paperId: string, num: number): Question {
  const seed = hashStr(`${paperId}-${num}`);
  const correctIdx = seed % 4;
  const subj = parsePaperId(paperId)?.subject;
  const subjLabel = subj ? SUBJECT_LABEL[subj] : "Science";

  const stems = [
    `Which of the following best describes a key concept in ${subjLabel}?`,
    `Identify the correct statement about ${subjLabel.toLowerCase()} from the options below.`,
    `Choose the option that correctly completes the statement.`,
    `Which option represents the most accurate answer?`,
    `Which of the following is true?`,
  ];
  const stem = stems[seed % stems.length];

  const opts = LETTERS.map((letter, i) => ({
    letter,
    content: [p(t(`Option ${letter} — sample answer ${i + 1} for question ${num}.`))],
  }));

  return {
    id: `q-${paperId}-pad-${num}`,
    number: String(num),
    paperId,
    questionType: "text-options",
    intro: [],
    text: [p(t(stem))],
    options: { type: "text-options", layout: "vertical", options: opts },
    topics: [],
    lessons: [],
    skills: [],
    tags: ["placeholder"],
    traps: [],
    difficulty: DIFFS[seed % DIFFS.length],
    priority: PRIOS[(seed >> 3) % PRIOS.length],
    targetGrade: GRADES[(seed >> 5) % GRADES.length],
    repetition: ((seed >> 7) % 12) + 1,
    // Stash correct letter in a side map (see below)
  } as Question & { _correct?: OptionLetter };
}

// Map placeholder question id -> correct letter (for marking dummy questions
// when the JSON answer key has nothing — we use the JSON key first, fall back
// to this deterministic value).
const PLACEHOLDER_CORRECT = new Map<string, OptionLetter>();

export function getPaperCorrectLetter(questionId: string): OptionLetter | undefined {
  return PLACEHOLDER_CORRECT.get(questionId);
}

/**
 * Returns the canonical 40 MCQ questions for a paper.
 * - Real hardcoded MCQs from QUESTIONS come first (renumbered 1..N).
 * - Then deterministic placeholder MCQs fill the remainder up to 40.
 */
export function getPaperQuestions(paperId: string): Question[] {
  const real = QUESTIONS.filter((q) => q.paperId === paperId && q.options !== undefined).slice(
    0,
    PAPER_QUESTION_COUNT,
  );

  const out: Question[] = real.map((q, i) => ({ ...q, number: String(i + 1) }));
  for (let i = out.length + 1; i <= PAPER_QUESTION_COUNT; i++) {
    const placeholder = makePlaceholder(paperId, i);
    const seed = hashStr(`${paperId}-${i}`);
    PLACEHOLDER_CORRECT.set(placeholder.id, LETTERS[seed % 4]);
    out.push(placeholder);
  }
  return out;
}
