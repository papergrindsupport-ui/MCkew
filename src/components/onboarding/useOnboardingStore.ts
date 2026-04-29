import { create } from "zustand";

interface OnboardingState {
  open: boolean;
  openWizard: () => void;
  closeWizard: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  open: false,
  openWizard: () => set({ open: true }),
  closeWizard: () => set({ open: false }),
}));
