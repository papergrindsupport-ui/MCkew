// DEPRECATED — kept only as a thin shim so legacy imports keep building
// while the rest of the app is migrated to `useAccountStore` + AccountProvider.
// New code should use `@/stores/useAccountStore` and `@/integrations/account/AccountProvider`.

import { useAccountStore, generateAnonId as _gen } from "@/stores/useAccountStore";

export type SecretQuestion = { id: string; question: string; answer: string };

export type AnonymousAccount = {
  anonId: string;
  password?: string;
  secretQuestions: SecretQuestion[];
  createdAt: number;
};

export const generateAnonId = _gen;

/**
 * Legacy wrapper around useAccountStore. Reads only — writes are no-ops
 * (real writes happen via AccountProvider / SignInModal edge calls now).
 */
export function useAuthStore<T = unknown>(selector?: (s: LegacyState) => T): T {
  const profile = useAccountStore((s) => s.profile);
  const state: LegacyState = {
    account:
      profile && profile.account_type === "anonymous"
        ? {
            anonId: profile.public_id,
            secretQuestions: [],
            createdAt: Date.now(),
          }
        : null,
    signedInAs: profile?.public_id ?? null,
    setAccount: () => {},
    signIn: () => {},
    signOut: () => {},
  };
  return (selector ? selector(state) : (state as unknown as T)) as T;
}

type LegacyState = {
  account: AnonymousAccount | null;
  signedInAs: string | null;
  setAccount: (a: AnonymousAccount) => void;
  signIn: (id: string) => void;
  signOut: () => void;
};
