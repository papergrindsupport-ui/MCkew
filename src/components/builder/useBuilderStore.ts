import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Subject } from "@/data/paperData";
import type { BuilderDraft, BuilderItem, BuilderQuestionItem, BuilderSettings } from "./types";
import { makeDefaultSettings } from "./types";
import type { Question } from "@/data/questionData";

function uid(prefix = "it"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

interface BuilderUIState {
  open: boolean;
  collapsed: boolean;
  sidebarCollapsed: boolean;
  selectedItemIds: string[];
}

interface BuilderState extends BuilderUIState {
  draft: BuilderDraft;
  // UI
  setOpen: (v: boolean) => void;
  setCollapsed: (v: boolean) => void;
  setSidebarCollapsed: (v: boolean) => void;
  setSelected: (ids: string[]) => void;
  toggleSelected: (id: string) => void;
  // Draft
  ensureSubject: (subject: Subject | "all") => void;
  setSettings: (patch: Partial<BuilderSettings>) => void;
  setTitle: (title: string) => void;
  // Items
  addQuestionItem: (q: Question, source?: { paperId: string; qid: string }) => void;
  addNote: (text?: string) => void;
  addDivider: (color?: string) => void;
  removeItems: (ids: string[]) => void;
  reorderItems: (fromId: string, toId: string) => void;
  updateItem: (id: string, patch: Partial<BuilderItem>) => void;
  shuffle: () => void;
  // Custom questions
  addCustomQuestion: (q: Question) => void;
  updateCustomQuestion: (q: Question) => void;
  // Updating an in-builder question (snapshot edit)
  updateQuestionSnapshot: (itemId: string, q: Question) => void;
  resetDraft: () => void;
}

function makeDefaultDraft(subject: Subject | "all" = "all"): BuilderDraft {
  return {
    id: uid("draft"),
    subject,
    settings: makeDefaultSettings(),
    items: [],
    customQuestions: [],
    updatedAt: Date.now(),
  };
}

export const useBuilderStore = create<BuilderState>()(
  persist(
    (set, get) => ({
      open: false,
      collapsed: false,
      sidebarCollapsed: false,
      selectedItemIds: [],
      draft: makeDefaultDraft(),

      setOpen: (v) => set({ open: v, collapsed: v ? get().collapsed : false }),
      setCollapsed: (v) => set({ collapsed: v }),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      setSelected: (ids) => set({ selectedItemIds: ids }),
      toggleSelected: (id) =>
        set((s) => ({
          selectedItemIds: s.selectedItemIds.includes(id)
            ? s.selectedItemIds.filter((x) => x !== id)
            : [...s.selectedItemIds, id],
        })),

      ensureSubject: (subject) => {
        const { draft } = get();
        if (draft.subject !== subject) {
          set({ draft: { ...draft, subject, updatedAt: Date.now() } });
        }
      },

      setSettings: (patch) =>
        set((s) => ({
          draft: {
            ...s.draft,
            settings: { ...s.draft.settings, ...patch },
            updatedAt: Date.now(),
          },
        })),

      setTitle: (title) =>
        set((s) => ({
          draft: {
            ...s.draft,
            settings: { ...s.draft.settings, title },
            updatedAt: Date.now(),
          },
        })),

      addQuestionItem: (q, source) =>
        set((s) => {
          // Avoid duplicates of same source question
          if (
            source &&
            s.draft.items.some(
              (it) =>
                it.kind === "question" &&
                it.source?.paperId === source.paperId &&
                it.source?.qid === source.qid,
            )
          ) {
            return s;
          }
          const item: BuilderQuestionItem = {
            id: uid("q"),
            kind: "question",
            source: source ?? null,
            question: q,
          };
          return {
            draft: { ...s.draft, items: [...s.draft.items, item], updatedAt: Date.now() },
          };
        }),

      addNote: (text = "Note") =>
        set((s) => ({
          draft: {
            ...s.draft,
            items: [...s.draft.items, { id: uid("n"), kind: "note", text }],
            updatedAt: Date.now(),
          },
        })),

      addDivider: (color = "hsl(var(--primary))") =>
        set((s) => ({
          draft: {
            ...s.draft,
            items: [...s.draft.items, { id: uid("d"), kind: "divider", color }],
            updatedAt: Date.now(),
          },
        })),

      removeItems: (ids) =>
        set((s) => ({
          draft: {
            ...s.draft,
            items: s.draft.items.filter((it) => !ids.includes(it.id)),
            updatedAt: Date.now(),
          },
          selectedItemIds: s.selectedItemIds.filter((x) => !ids.includes(x)),
        })),

      reorderItems: (fromId, toId) =>
        set((s) => {
          const items = [...s.draft.items];
          const fromIdx = items.findIndex((i) => i.id === fromId);
          const toIdx = items.findIndex((i) => i.id === toId);
          if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return s;
          const [moved] = items.splice(fromIdx, 1);
          items.splice(toIdx, 0, moved);
          return { draft: { ...s.draft, items, updatedAt: Date.now() } };
        }),

      updateItem: (id, patch) =>
        set((s) => ({
          draft: {
            ...s.draft,
            items: s.draft.items.map((it) =>
              it.id === id ? ({ ...it, ...patch } as BuilderItem) : it,
            ),
            updatedAt: Date.now(),
          },
        })),

      shuffle: () =>
        set((s) => {
          const arr = [...s.draft.items];
          for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
          }
          return { draft: { ...s.draft, items: arr, updatedAt: Date.now() } };
        }),

      addCustomQuestion: (q) =>
        set((s) => ({
          draft: {
            ...s.draft,
            customQuestions: [...s.draft.customQuestions, q],
            updatedAt: Date.now(),
          },
        })),

      updateCustomQuestion: (q) =>
        set((s) => ({
          draft: {
            ...s.draft,
            customQuestions: s.draft.customQuestions.map((c) => (c.id === q.id ? q : c)),
            items: s.draft.items.map((it) =>
              it.kind === "question" && it.question.id === q.id ? { ...it, question: q } : it,
            ),
            updatedAt: Date.now(),
          },
        })),

      updateQuestionSnapshot: (itemId, q) =>
        set((s) => ({
          draft: {
            ...s.draft,
            items: s.draft.items.map((it) =>
              it.id === itemId && it.kind === "question" ? { ...it, question: q } : it,
            ),
            updatedAt: Date.now(),
          },
        })),

      resetDraft: () => set({ draft: makeDefaultDraft(get().draft.subject) }),
    }),
    {
      name: "builder-draft-v1",
      partialize: (s) => ({ draft: s.draft }),
    },
  ),
);
