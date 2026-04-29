import { create } from "zustand";
import { persist } from "zustand/middleware";

export type LoadingGame = "tictactoe" | "rps" | "random";

interface AppSettingsState {
  pageTransitionsEnabled: boolean;
  loadingGameEnabled: boolean;
  loadingGame: LoadingGame;
  gifReactionsEnabled: boolean;
  /** Show the floating action toolbar when text is selected on paper/smart-solve pages. */
  showTextPopover: boolean;
  setPageTransitionsEnabled: (b: boolean) => void;
  setLoadingGameEnabled: (b: boolean) => void;
  setLoadingGame: (g: LoadingGame) => void;
  setGifReactionsEnabled: (b: boolean) => void;
  setShowTextPopover: (b: boolean) => void;
}

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set) => ({
      pageTransitionsEnabled: true,
      loadingGameEnabled: true,
      loadingGame: "random",
      gifReactionsEnabled: true,
      showTextPopover: true,
      setPageTransitionsEnabled: (pageTransitionsEnabled) => set({ pageTransitionsEnabled }),
      setLoadingGameEnabled: (loadingGameEnabled) => set({ loadingGameEnabled }),
      setLoadingGame: (loadingGame) => set({ loadingGame }),
      setGifReactionsEnabled: (gifReactionsEnabled) => set({ gifReactionsEnabled }),
      setShowTextPopover: (showTextPopover) => set({ showTextPopover }),
    }),
    { name: "app-settings-store" },
  ),
);
