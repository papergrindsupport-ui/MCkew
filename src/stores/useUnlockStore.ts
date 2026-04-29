// Tracks which premium filter options the user has unlocked.
// Locked years (2016–2022) and locked topics show a 🔒 in the filter
// dropdowns instead of a checkbox, and clicking sends the user to /#pricing.

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Years 2016–2022 are locked by default until purchased.
export const LOCKED_YEARS: readonly string[] = [
  "2016",
  "2017",
  "2018",
  "2019",
  "2020",
  "2021",
  "2022",
];

// A couple of premium topic keys (must match keys in src/data/topics.ts).
export const LOCKED_TOPICS: readonly string[] = ["genetics", "inorganic"];

interface UnlockState {
  unlocked: boolean; // master flag — true after "Unlock Now"
  isYearLocked: (year: string) => boolean;
  isTopicLocked: (topicKey: string) => boolean;
  unlockAll: () => void;
  lockAll: () => void;
}

export const useUnlockStore = create<UnlockState>()(
  persist(
    (set, get) => ({
      unlocked: false,
      isYearLocked: (year) => !get().unlocked && LOCKED_YEARS.includes(year),
      isTopicLocked: (key) => !get().unlocked && LOCKED_TOPICS.includes(key),
      unlockAll: () => set({ unlocked: true }),
      lockAll: () => set({ unlocked: false }),
    }),
    { name: "smart-solve-unlock-store-v1" },
  ),
);

/** Navigate to homepage and scroll to the pricing section. */
export function goToPricing() {
  if (typeof window === "undefined") return;
  // If already on home, just scroll. Otherwise navigate with the hash.
  if (window.location.pathname === "/") {
    const el = document.getElementById("pricing");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
  }
  window.location.href = "/#pricing";
}
