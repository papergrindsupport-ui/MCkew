import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PapersLayout = "bento" | "organized" | "multistep";

interface LayoutState {
  layout: PapersLayout | null;
  setLayout: (l: PapersLayout) => void;
  hasChosen: boolean;
  setHasChosen: (b: boolean) => void;
  hideLocked: boolean;
  setHideLocked: (b: boolean) => void;
  hideTags: boolean;
  setHideTags: (b: boolean) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      layout: "organized",
      hasChosen: false,
      hideLocked: true,
      hideTags: false,
      setLayout: (layout) => set({ layout, hasChosen: true }),
      setHasChosen: (hasChosen) => set({ hasChosen }),
      setHideLocked: (hideLocked) => set({ hideLocked }),
      setHideTags: (hideTags) => set({ hideTags }),
    }),
    { name: "papers-layout-store" },
  ),
);
