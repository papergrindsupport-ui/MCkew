// Pro status: synced with the server's pro_users table and mirrored into the
// local unlock store so existing year/topic gating Just Works.
import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { useUnlockStore } from "@/stores/useUnlockStore";

interface ProState {
  isPro: boolean;
  source: string | null;
  loading: boolean;
  setPro: (pro: boolean, source?: string | null) => void;
  refresh: (accountId: string | null) => Promise<void>;
}

export const useProStore = create<ProState>((set) => ({
  isPro: false,
  source: null,
  loading: false,
  setPro: (isPro, source = null) => {
    set({ isPro, source });
    // Mirror into the local unlock store so all existing locks open up.
    const unlockStore = useUnlockStore.getState();
    if (isPro && !unlockStore.unlocked) unlockStore.unlockAll();
    if (!isPro && unlockStore.unlocked) unlockStore.lockAll();
  },
  refresh: async (accountId) => {
    if (!accountId) {
      set({ isPro: false, source: null });
      return;
    }
    set({ loading: true });
    try {
      const { data } = await supabase.functions.invoke("check-pro-status", {
        body: { accountId },
      });
      const pro = !!data?.pro;
      const src = data?.source ?? null;
      set({ isPro: pro, source: src, loading: false });
      const unlockStore = useUnlockStore.getState();
      if (pro && !unlockStore.unlocked) unlockStore.unlockAll();
    } catch {
      set({ loading: false });
    }
  },
}));
