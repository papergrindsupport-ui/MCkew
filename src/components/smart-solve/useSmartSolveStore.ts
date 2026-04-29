// SmartSolve-specific session settings (Play/Exam mode-specific options) stored
// alongside the standard PaperSettings dialog. These are persisted per-subject.

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SmartSolveMode = "general" | "play" | "exam";
export type GeneralLayout = "expanded" | "compact";

export interface SmartSolveSettings {
  // Play
  perQuestionTimer: boolean;
  perQuestionTimerSec: number;
  // Exam
  paginated: boolean;
  questionsPerPage: number;
  // Marking — overrides per session ("instant" only allowed when chosen here)
  instantMarking: boolean;
  // Exam-only
  studentName: string;
  centerNumber: string;
}

const DEFAULT: SmartSolveSettings = {
  perQuestionTimer: false,
  perQuestionTimerSec: 60,
  paginated: true,
  questionsPerPage: 8,
  instantMarking: false,
  studentName: "",
  centerNumber: "",
};

interface SmartSolveStoreState extends SmartSolveSettings {
  mode: SmartSolveMode;
  generalLayout: GeneralLayout;
  setMode: (m: SmartSolveMode) => void;
  setGeneralLayout: (l: GeneralLayout) => void;
  set: <K extends keyof SmartSolveSettings>(k: K, v: SmartSolveSettings[K]) => void;
  reset: () => void;
}

export const useSmartSolveStore = create<SmartSolveStoreState>()(
  persist(
    (set) => ({
      ...DEFAULT,
      mode: "general",
      generalLayout: "expanded",
      setMode: (mode) => set({ mode }),
      setGeneralLayout: (generalLayout) => set({ generalLayout }),
      set: (k, v) => set({ [k]: v } as Partial<SmartSolveStoreState>),
      reset: () => set({ ...DEFAULT }),
    }),
    { name: "smart-solve-store-v1" },
  ),
);
