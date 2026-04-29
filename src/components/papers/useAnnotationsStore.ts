// Cross-paper annotations: bookmarks, comments, tags. Persisted to localStorage,
// shared across /smart-solve-* and /smart-solve-papers/* pages.
//
// Keyed by `${paperId}::${qid}` so the same logical question (across smart-solve
// and individual paper pages) shares its annotations.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RichText } from "@/data/questionData";

export interface QuestionTagDef {
  id: string;
  label: string;
  color: string; // hex or oklch — applied via inline style
  builtin?: boolean;
}

export const DEFAULT_TAGS: QuestionTagDef[] = [
  { id: "important", label: "Important", color: "#ef4444", builtin: true },
  { id: "review", label: "Review", color: "#eab308", builtin: true },
  { id: "easy", label: "Easy", color: "#22c55e", builtin: true },
  { id: "hard", label: "Hard", color: "#a855f7", builtin: true },
  { id: "trick", label: "Trick", color: "#f97316", builtin: true },
  { id: "favorite", label: "Favorite", color: "#ec4899", builtin: true },
];

export interface Comment {
  id: string;
  body: RichText;
  createdAt: number;
}

interface AnnotationsState {
  // qkey -> bookmarked
  bookmarks: Record<string, boolean>;
  // qkey -> comments
  comments: Record<string, Comment[]>;
  // qkey -> tagId[]
  tagsByQ: Record<string, string[]>;
  // tag library
  tagLibrary: QuestionTagDef[];

  toggleBookmark: (qkey: string) => void;
  isBookmarked: (qkey: string) => boolean;

  addComment: (qkey: string, body: RichText) => void;
  updateComment: (qkey: string, id: string, body: RichText) => void;
  deleteComment: (qkey: string, id: string) => void;

  addTagToQ: (qkey: string, tagId: string) => void;
  removeTagFromQ: (qkey: string, tagId: string) => void;

  createTag: (label: string, color: string) => QuestionTagDef;
  deleteTag: (tagId: string) => void;
  updateTag: (tagId: string, patch: Partial<Omit<QuestionTagDef, "id" | "builtin">>) => void;
}

export const qkey = (paperId: string, qid: string) => `${paperId}::${qid}`;

let _cid = 0;
const newCid = () => `c-${Date.now()}-${++_cid}`;

export const useAnnotationsStore = create<AnnotationsState>()(
  persist(
    (set, get) => ({
      bookmarks: {},
      comments: {},
      tagsByQ: {},
      tagLibrary: DEFAULT_TAGS,

      toggleBookmark: (qkey) =>
        set((s) => ({ bookmarks: { ...s.bookmarks, [qkey]: !s.bookmarks[qkey] } })),
      isBookmarked: (qkey) => !!get().bookmarks[qkey],

      addComment: (qkey, body) =>
        set((s) => ({
          comments: {
            ...s.comments,
            [qkey]: [...(s.comments[qkey] ?? []), { id: newCid(), body, createdAt: Date.now() }],
          },
        })),
      updateComment: (qkey, id, body) =>
        set((s) => ({
          comments: {
            ...s.comments,
            [qkey]: (s.comments[qkey] ?? []).map((c) => (c.id === id ? { ...c, body } : c)),
          },
        })),
      deleteComment: (qkey, id) =>
        set((s) => ({
          comments: {
            ...s.comments,
            [qkey]: (s.comments[qkey] ?? []).filter((c) => c.id !== id),
          },
        })),

      addTagToQ: (qkey, tagId) =>
        set((s) => {
          const cur = s.tagsByQ[qkey] ?? [];
          if (cur.includes(tagId)) return {};
          return { tagsByQ: { ...s.tagsByQ, [qkey]: [...cur, tagId] } };
        }),
      removeTagFromQ: (qkey, tagId) =>
        set((s) => ({
          tagsByQ: {
            ...s.tagsByQ,
            [qkey]: (s.tagsByQ[qkey] ?? []).filter((t) => t !== tagId),
          },
        })),

      createTag: (label, color) => {
        const tag: QuestionTagDef = { id: `t-${Date.now()}`, label, color };
        set((s) => ({ tagLibrary: [...s.tagLibrary, tag] }));
        return tag;
      },
      deleteTag: (tagId) =>
        set((s) => ({
          tagLibrary: s.tagLibrary.filter((t) => t.id !== tagId || t.builtin),
          tagsByQ: Object.fromEntries(
            Object.entries(s.tagsByQ).map(([k, v]) => [k, v.filter((id) => id !== tagId)]),
          ),
        })),
      updateTag: (tagId, patch) =>
        set((s) => ({
          tagLibrary: s.tagLibrary.map((t) => (t.id === tagId ? { ...t, ...patch } : t)),
        })),
    }),
    { name: "question-annotations-v1" },
  ),
);
