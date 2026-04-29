// Selection-level annotations (highlight, underline, blur, tags, comment).
// Local-only (localStorage). Keyed by `${qkey}::${blockKey}` where blockKey
// uniquely identifies a text block within a question (e.g. "intro:0:p",
// "text:1:li:2"). Each annotation has character offsets [start, end) relative
// to the concatenated plain-text of that block (as produced by
// AnnotatableBlock).

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RichText } from "@/data/questionData";

export type SelectionAnnotationType = "highlight" | "underline" | "blur" | "tags" | "comment";

export interface SelectionAnnotation {
  id: string;
  blockKey: string; // `${qkey}::${blockPath}`
  start: number;
  end: number;
  text: string; // snapshot of selected text (for display in popovers)
  type: SelectionAnnotationType;
  /** For type === "tags": ordered list of tag ids from useAnnotationsStore.tagLibrary. */
  tagIds?: string[];
  /** For type === "comment": rich body. */
  commentBody?: RichText;
  createdAt: number;
  updatedAt: number;
}

interface State {
  /** blockKey -> annotations */
  byBlock: Record<string, SelectionAnnotation[]>;

  add: (a: Omit<SelectionAnnotation, "id" | "createdAt" | "updatedAt">) => SelectionAnnotation;
  update: (id: string, patch: Partial<SelectionAnnotation>) => void;
  remove: (id: string) => void;

  /**
   * Toggle a "style" annotation (highlight | underline | blur). If the exact
   * range already has one of this type, it's removed; otherwise added.
   */
  toggleStyle: (
    blockKey: string,
    start: number,
    end: number,
    text: string,
    type: "highlight" | "underline" | "blur",
  ) => void;

  /**
   * Get annotations for a given blockKey (always returns the same array
   * reference when nothing changed — selectors can rely on referential
   * equality from the persisted slice).
   */
  forBlock: (blockKey: string) => SelectionAnnotation[];
}

const newId = () => `sa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const EMPTY: SelectionAnnotation[] = [];

export const useSelectionAnnotationsStore = create<State>()(
  persist(
    (set, get) => ({
      byBlock: {},
      add: (a) => {
        const now = Date.now();
        const full: SelectionAnnotation = {
          ...a,
          id: newId(),
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({
          byBlock: {
            ...s.byBlock,
            [a.blockKey]: [...(s.byBlock[a.blockKey] ?? []), full],
          },
        }));
        return full;
      },
      update: (id, patch) =>
        set((s) => {
          const next: Record<string, SelectionAnnotation[]> = { ...s.byBlock };
          for (const k of Object.keys(next)) {
            const arr = next[k];
            const idx = arr.findIndex((a) => a.id === id);
            if (idx >= 0) {
              const updated = { ...arr[idx], ...patch, updatedAt: Date.now() };
              next[k] = [...arr.slice(0, idx), updated, ...arr.slice(idx + 1)];
              break;
            }
          }
          return { byBlock: next };
        }),
      remove: (id) =>
        set((s) => {
          const next: Record<string, SelectionAnnotation[]> = { ...s.byBlock };
          for (const k of Object.keys(next)) {
            const arr = next[k];
            if (arr.some((a) => a.id === id)) {
              const filtered = arr.filter((a) => a.id !== id);
              if (filtered.length === 0) delete next[k];
              else next[k] = filtered;
              break;
            }
          }
          return { byBlock: next };
        }),
      toggleStyle: (blockKey, start, end, text, type) =>
        set((s) => {
          const arr = s.byBlock[blockKey] ?? [];
          const existing = arr.find((a) => a.type === type && a.start === start && a.end === end);
          if (existing) {
            const filtered = arr.filter((a) => a.id !== existing.id);
            const next = { ...s.byBlock };
            if (filtered.length === 0) delete next[blockKey];
            else next[blockKey] = filtered;
            return { byBlock: next };
          }
          const now = Date.now();
          const ann: SelectionAnnotation = {
            id: newId(),
            blockKey,
            start,
            end,
            text,
            type,
            createdAt: now,
            updatedAt: now,
          };
          return {
            byBlock: { ...s.byBlock, [blockKey]: [...arr, ann] },
          };
        }),
      forBlock: (blockKey) => get().byBlock[blockKey] ?? EMPTY,
    }),
    { name: "selection-annotations-v1" },
  ),
);
