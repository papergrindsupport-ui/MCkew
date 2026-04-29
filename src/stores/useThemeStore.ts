import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ThemeState {
  themeIndex: number;
  isDark: boolean;
  setThemeIndex: (i: number) => void;
  setIsDark: (v: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeIndex: 0,
      isDark: false,
      setThemeIndex: (themeIndex) => set({ themeIndex }),
      setIsDark: (isDark) => set({ isDark }),
    }),
    { name: "theme-store" },
  ),
);
