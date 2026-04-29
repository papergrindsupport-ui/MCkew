// Central account/profile store (Clerk + anonymous + guest).
// ----------------------------------------------------------------------
// Replaces the old localStorage-only useAuthStore. The DB is the source of
// truth; we only persist a handful of pointers locally so we can resume
// without a network round-trip on cold start.

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AccountType = "clerk" | "anonymous" | "guest";

export type Profile = {
  id: string;
  account_type: AccountType;
  public_id: string;
  clerk_user_id: string | null;
  username: string | null;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  image_url: string | null;
  bio: string | null;
  preferences: Record<string, unknown>;
  onboarding_complete: boolean;
};

type Persisted = {
  /** Locally cached guest public_id so we can resume guest sessions. */
  guestId: string | null;
  /** Locally cached anonymous public_id (last signed-in anon account). */
  anonId: string | null;
};

type AccountState = Persisted & {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  setProfile: (p: Profile | null) => void;
  setLoading: (l: boolean) => void;
  setError: (e: string | null) => void;
  setGuestId: (id: string | null) => void;
  setAnonId: (id: string | null) => void;
  reset: () => void;
};

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      guestId: null,
      anonId: null,
      profile: null,
      loading: true,
      error: null,
      setProfile: (profile) => set({ profile }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setGuestId: (guestId) => set({ guestId }),
      setAnonId: (anonId) => set({ anonId }),
      reset: () => set({ profile: null, anonId: null, error: null }),
    }),
    {
      name: "ss_account_v1",
      partialize: (s): Persisted => ({ guestId: s.guestId, anonId: s.anonId }),
    },
  ),
);

/** Generate a friendly anonymous id like `anon-abcd1234`. */
export function generateAnonId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "anon-";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
