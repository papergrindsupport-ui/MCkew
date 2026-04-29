// Smart search engine for SmartSolve pages.
// Modes: broad | strict | fuzzy | wholeWord | strictest
// Scopes: stem | options | tagsMeta | paperInfo | everything (questions)
//         paperOnly | papersAndQuestions (papers page)
//
// Returns boolean match + provides a highlighter that wraps matched substrings.

import type { Question, RichText, RichNode, Run, ListBlock, RichBlock } from "@/data/questionData";
import { parsePaperId, type Paper } from "@/data/paperData";

export type SearchMode = "broad" | "strict" | "fuzzy" | "wholeWord" | "strictest" | "lenient";

export const SEARCH_MODE_LABELS: Record<SearchMode, string> = {
  broad: "Broad",
  strict: "Strict",
  fuzzy: "Fuzzy",
  wholeWord: "Whole word",
  strictest: "Strictest",
  lenient: "Lenient",
};

export const SEARCH_MODE_HELP: Record<SearchMode, string> = {
  broad:
    "Finds your words in any order, even if they're embedded in larger words. e.g. 'wet spoon' matches 'spoons are wet'.",
  strict:
    "Finds your exact phrase, in the same order, ignoring punctuation/spacing. e.g. 'wet spoon' matches 'wetspoon', 'wet spoon', 'wet-spoon'.",
  fuzzy: "Ignores all spaces and punctuation. 'wet spoon' matches 'we tspoon' and 'wetspoon'.",
  wholeWord:
    "Matches whole words only, in any order. 'wet spoon' matches 'wet' and 'spoon' but ignores 'wetter' and 'spoons'.",
  strictest: "Finds your exact text — same words, same order, same spacing. Case-insensitive only.",
  lenient:
    "Super-loose mode (used for image search). Finds at least 2 of your words appearing in the same order, ignoring filler, and tolerates minor typos. e.g. 'spon are weet' finds 'spoon is very wet'.",
};

export type QuestionScope = "stem" | "options" | "tagsMeta" | "paperInfo" | "everything";
export const QUESTION_SCOPE_LABELS: Record<QuestionScope, string> = {
  stem: "Question text (stem)",
  options: "Answer options (A–D)",
  tagsMeta: "Topics, skills & tags",
  paperInfo: "Paper info (year/session/variant/Q#)",
  everything: "Everything",
};

export type PaperScope = "paperOnly" | "papersAndQuestions";
export const PAPER_SCOPE_LABELS: Record<PaperScope, string> = {
  paperOnly: "Only papers",
  papersAndQuestions: "Papers and questions inside",
};

/* ---------------- text extraction ---------------- */

function runText(r: Run): string {
  if (r.type === "text") return r.text;
  if (r.type === "latex") return r.tex;
  return " ";
}
function blockText(b: RichBlock): string {
  return b.runs.map(runText).join("");
}
function listText(l: ListBlock): string {
  return l.items.map((items) => items.map(runText).join("")).join("\n");
}
export function richToString(rich: RichText | undefined): string {
  if (!rich) return "";
  return rich
    .map((n: RichNode) =>
      (n as ListBlock).kind === "ul" || (n as ListBlock).kind === "ol"
        ? listText(n as ListBlock)
        : blockText(n as RichBlock),
    )
    .join("\n");
}

function optionsText(q: Question): string {
  const opts = q.options;
  if (!opts) return "";
  switch (opts.type) {
    case "text-options":
      return opts.options.map((o) => richToString(o.content)).join(" | ");
    case "image-options":
      return opts.options
        .map((o) => `${o.alt} ${o.caption ? richToString(o.caption) : ""}`)
        .join(" | ");
    case "graph-options":
      return opts.options
        .map(
          (o) =>
            `${o.chart.title ? richToString(o.chart.title) : ""} ${o.chart.xLabel ?? ""} ${o.chart.yLabel ?? ""}`,
        )
        .join(" | ");
    case "image-positioned":
      return opts.alt;
    case "table-options-rows":
    case "table-options-cols":
    case "table-options-cells":
      return opts.table.rows
        .flat()
        .map((c) => richToString(c.content))
        .join(" | ");
  }
}

function tagsMetaText(q: Question): string {
  return [
    ...q.topics,
    ...q.lessons,
    ...q.skills,
    ...q.tags,
    ...q.traps,
    q.difficulty,
    q.priority,
    q.targetGrade,
  ].join(" ");
}

function paperInfoText(q: Question): string {
  const parsed = parsePaperId(q.paperId);
  if (!parsed) return `Q${q.number}`;
  return `Q${q.number} ${parsed.year} ${parsed.session} ${parsed.variant} ${parsed.subject}`;
}

export function questionScopeText(q: Question, scope: QuestionScope): string {
  switch (scope) {
    case "stem":
      return [richToString(q.intro), richToString(q.text)].join("\n");
    case "options":
      return optionsText(q);
    case "tagsMeta":
      return tagsMetaText(q);
    case "paperInfo":
      return paperInfoText(q);
    case "everything":
      return [
        richToString(q.intro),
        richToString(q.text),
        optionsText(q),
        tagsMetaText(q),
        paperInfoText(q),
      ].join("\n");
  }
}

export function paperInfoString(p: Paper): string {
  return `${p.title} ${p.id} ${p.subject} ${p.year} ${p.session} ${p.variant} ${p.tags.join(" ")} ${p.topics.join(" ")} ${p.skills.join(" ")}`;
}

/* ---------------- core matching ---------------- */

const PUNCT_RE = /[\s\p{P}]+/gu;
const NONALNUM_RE = /[^\p{L}\p{N}]+/gu;

function normalize(s: string): string {
  return s.toLowerCase();
}
function stripPunct(s: string): string {
  return normalize(s).replace(PUNCT_RE, "");
}
function stripAllNonAlnum(s: string): string {
  return normalize(s).replace(NONALNUM_RE, "");
}
function tokenize(s: string): string[] {
  return normalize(s).split(PUNCT_RE).filter(Boolean);
}

/**
 * Returns true iff `text` matches `query` under `mode`.
 * Empty query => always true.
 */
export function textMatches(text: string, query: string, mode: SearchMode): boolean {
  const q = query.trim();
  if (!q) return true;
  if (!text) return false;

  switch (mode) {
    case "strictest":
      return normalize(text).includes(normalize(q));
    case "strict":
      return stripPunct(text).includes(stripPunct(q));
    case "fuzzy":
      return stripAllNonAlnum(text).includes(stripAllNonAlnum(q));
    case "broad": {
      const hay = normalize(text);
      return tokenize(q).every((w) => hay.includes(w));
    }
    case "wholeWord": {
      const haystack = new Set(tokenize(text));
      return tokenize(q).every((w) => haystack.has(w));
    }
    case "lenient":
      return lenientMatches(text, q);
  }
}

/* ---------------- lenient (image-search) matching ---------------- */

// Damerau-Levenshtein distance, capped early for speed.
function editDistance(a: string, b: string, cap = 2): number {
  if (a === b) return 0;
  const la = a.length,
    lb = b.length;
  if (Math.abs(la - lb) > cap) return cap + 1;
  if (la === 0) return lb;
  if (lb === 0) return la;
  let prevPrev: number[] = [];
  let prev: number[] = new Array(lb + 1).fill(0).map((_, i) => i);
  let cur: number[] = new Array(lb + 1).fill(0);
  for (let i = 1; i <= la; i++) {
    cur[0] = i;
    let rowMin = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        cur[j] = Math.min(cur[j], prevPrev[j - 2] + 1);
      }
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > cap) return cap + 1;
    prevPrev = prev;
    prev = cur;
    cur = new Array(lb + 1).fill(0);
  }
  return prev[lb];
}

// Permissive token similarity: equal, edit-distance ≤ tolerance, or one is a
// near-substring of the other (handles "spon" ~ "spoon", "weet" ~ "wet").
function tokenSimilar(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length < 3 || b.length < 3) {
    return a === b || a.startsWith(b) || b.startsWith(a);
  }
  const cap = Math.max(1, Math.floor(Math.min(a.length, b.length) / 4));
  const tol = Math.min(2, cap);
  if (editDistance(a, b, tol) <= tol) return true;
  // substring tolerance for stem-like matches
  if (a.length >= 4 && b.includes(a)) return true;
  if (b.length >= 4 && a.includes(b)) return true;
  return false;
}

/**
 * Lenient mode: succeeds if at least 2 query tokens appear in the text in the
 * same relative order, with minor-typo tolerance per token. If the query has
 * only 1 token, fall back to a single fuzzy token match.
 */
function lenientMatches(text: string, query: string): boolean {
  const qToks = tokenize(query);
  const tToks = tokenize(text);
  if (qToks.length === 0 || tToks.length === 0) return false;

  if (qToks.length === 1) {
    return tToks.some((t) => tokenSimilar(qToks[0], t));
  }

  // Find the longest in-order subsequence of qToks that fuzzy-matches tToks.
  // We need at least 2 in-order matches to succeed.
  // Greedy two-pointer with backtracking is overkill — DP on (i,j) where
  // i over qToks, j over tToks, value = longest in-order match length.
  const m = qToks.length,
    n = tToks.length;
  // dp[j] after processing i = best length using first i query toks and first j text toks
  const prev = new Array(n + 1).fill(0);
  const cur = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.max(prev[j], cur[j - 1]);
      if (tokenSimilar(qToks[i - 1], tToks[j - 1])) {
        cur[j] = Math.max(cur[j], prev[j - 1] + 1);
      }
    }
    for (let j = 0; j <= n; j++) prev[j] = cur[j];
  }
  return prev[n] >= 2;
}

/* ---------------- highlighter ---------------- */

export interface HighlightRange {
  start: number;
  end: number;
}

/**
 * Returns sorted, non-overlapping match ranges within `text` for the given query+mode.
 * Used by RichTextView to wrap matched substrings with a highlight span.
 *
 * For modes that ignore spaces/punctuation (fuzzy, strict), we still highlight the
 * literal token chunks where they appear (best-effort word-level highlighting).
 */
export function findHighlightRanges(
  text: string,
  query: string,
  mode: SearchMode,
): HighlightRange[] {
  const q = query.trim();
  if (!q || !text) return [];
  const lower = text.toLowerCase();
  const ranges: HighlightRange[] = [];

  const pushAll = (needle: string) => {
    if (!needle) return;
    let idx = 0;
    while (idx < lower.length) {
      const found = lower.indexOf(needle, idx);
      if (found < 0) break;
      ranges.push({ start: found, end: found + needle.length });
      idx = found + needle.length;
    }
  };

  const pushWordBoundary = (word: string) => {
    if (!word) return;
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(word)}(?![\\p{L}\\p{N}])`, "giu");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      ranges.push({ start: m.index, end: m.index + m[0].length });
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  };

  switch (mode) {
    case "strictest":
      pushAll(q.toLowerCase());
      break;
    case "strict":
    case "fuzzy":
      // Highlight individual tokens of the query — best-effort visual cue.
      tokenize(q).forEach(pushAll);
      break;
    case "broad":
      tokenize(q).forEach(pushAll);
      break;
    case "wholeWord":
      tokenize(q).forEach(pushWordBoundary);
      break;
    case "lenient":
      {
        const qToks = tokenize(q);
        const re = /[\p{L}\p{N}]+/giu;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
          const word = m[0].toLowerCase();
          if (qToks.some((qt) => tokenSimilar(qt, word))) {
            ranges.push({ start: m.index, end: m.index + m[0].length });
          }
          if (m.index === re.lastIndex) re.lastIndex++;
        }
      }
      break;
  }

  return mergeRanges(ranges);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mergeRanges(ranges: HighlightRange[]): HighlightRange[] {
  if (ranges.length === 0) return ranges;
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const out: HighlightRange[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1];
    const cur = sorted[i];
    if (cur.start <= last.end) last.end = Math.max(last.end, cur.end);
    else out.push(cur);
  }
  return out;
}

/* ---------------- top-level question/paper match ---------------- */

export function questionMatches(
  q: Question,
  query: string,
  mode: SearchMode,
  scope: QuestionScope,
): boolean {
  return textMatches(questionScopeText(q, scope), query, mode);
}

export function paperMatches(p: Paper, query: string, mode: SearchMode): boolean {
  return textMatches(paperInfoString(p), query, mode);
}
