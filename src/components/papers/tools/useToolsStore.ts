import { create } from "zustand";

export interface UserStyles {
  highContrast: boolean;
  inverted: boolean;
  fontSize: number; // px, default 16
  fontFamily: string; // empty = default
  fontColor: string; // empty = default
  bgColor: string; // empty = default
}

export const DEFAULT_STYLES: UserStyles = {
  highContrast: false,
  inverted: false,
  fontSize: 16,
  fontFamily: "",
  fontColor: "",
  bgColor: "",
};

interface ToolsState {
  // open modals
  stylesOpen: boolean;

  // floating tools
  calculatorOpen: boolean;
  periodicOpen: boolean;
  scratchOpen: boolean;
  lineReaderOn: boolean;
  lineReaderHeight: number;

  // collapsed-to-circle states
  calculatorMin: boolean;
  periodicMin: boolean;
  scratchMin: boolean;

  // styles
  styles: UserStyles;

  setStylesOpen: (b: boolean) => void;
  setCalculatorOpen: (b: boolean) => void;
  setPeriodicOpen: (b: boolean) => void;
  setScratchOpen: (b: boolean) => void;
  setLineReaderOn: (b: boolean) => void;
  setLineReaderHeight: (n: number) => void;
  setCalculatorMin: (b: boolean) => void;
  setPeriodicMin: (b: boolean) => void;
  setScratchMin: (b: boolean) => void;
  setStyles: (s: Partial<UserStyles>) => void;
  resetStyles: () => void;
}

export const useToolsStore = create<ToolsState>((set) => ({
  stylesOpen: false,
  calculatorOpen: false,
  periodicOpen: false,
  scratchOpen: false,
  lineReaderOn: false,
  lineReaderHeight: 32,
  calculatorMin: false,
  periodicMin: false,
  scratchMin: false,
  styles: DEFAULT_STYLES,
  setStylesOpen: (stylesOpen) => set({ stylesOpen }),
  setCalculatorOpen: (calculatorOpen) => set({ calculatorOpen, calculatorMin: false }),
  setPeriodicOpen: (periodicOpen) => set({ periodicOpen, periodicMin: false }),
  setScratchOpen: (scratchOpen) => set({ scratchOpen, scratchMin: false }),
  setLineReaderOn: (lineReaderOn) => set({ lineReaderOn }),
  setLineReaderHeight: (lineReaderHeight) => set({ lineReaderHeight }),
  setCalculatorMin: (calculatorMin) => set({ calculatorMin }),
  setPeriodicMin: (periodicMin) => set({ periodicMin }),
  setScratchMin: (scratchMin) => set({ scratchMin }),
  setStyles: (s) => set((cur) => ({ styles: { ...cur.styles, ...s } })),
  resetStyles: () => set({ styles: DEFAULT_STYLES }),
}));
