import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SearchMode, QuestionScope, PaperScope } from "./searchEngine";

interface State {
  query: string;
  mode: SearchMode;
  questionScope: QuestionScope;
  paperScope: PaperScope;
  considerFilters: boolean;
  inlineOpen: boolean;
  modalOpen: boolean;
  active: boolean; // true once user has submitted a non-empty search
  setQuery: (q: string) => void;
  setMode: (m: SearchMode) => void;
  setQuestionScope: (s: QuestionScope) => void;
  setPaperScope: (s: PaperScope) => void;
  setConsiderFilters: (v: boolean) => void;
  setInlineOpen: (v: boolean) => void;
  setModalOpen: (v: boolean) => void;
  submit: () => void;
  clear: () => void;
}

export const useSmartSolveSearchStore = create<State>()(
  persist(
    (set, get) => ({
      query: "",
      mode: "broad",
      questionScope: "everything",
      paperScope: "papersAndQuestions",
      considerFilters: true,
      inlineOpen: false,
      modalOpen: false,
      active: false,
      setQuery: (query) => set({ query }),
      setMode: (mode) => set({ mode }),
      setQuestionScope: (questionScope) => set({ questionScope }),
      setPaperScope: (paperScope) => set({ paperScope }),
      setConsiderFilters: (considerFilters) => set({ considerFilters }),
      setInlineOpen: (inlineOpen) => set({ inlineOpen }),
      setModalOpen: (modalOpen) => set({ modalOpen }),
      submit: () => set({ active: get().query.trim().length > 0 }),
      clear: () => set({ query: "", active: false, modalOpen: false }),
    }),
    {
      name: "smart-solve-search-store-v1",
      // Don't persist transient UI flags (open modals)
      partialize: (s) => ({
        query: s.query,
        mode: s.mode,
        questionScope: s.questionScope,
        paperScope: s.paperScope,
        considerFilters: s.considerFilters,
        active: s.active,
      }),
    },
  ),
);
