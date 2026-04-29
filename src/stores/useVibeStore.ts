import { create } from "zustand";
import { persist } from "zustand/middleware";

export type VibeMode = "fire" | "boring";

interface VibeState {
  vibe: VibeMode;
  setVibe: (v: VibeMode) => void;
}

export const useVibeStore = create<VibeState>()(
  persist(
    (set) => ({
      vibe: "fire",
      setVibe: (vibe) => set({ vibe }),
    }),
    { name: "vibe-store" },
  ),
);
