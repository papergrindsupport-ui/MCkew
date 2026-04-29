// AccountProvider — single owner of profile resolution.
// ----------------------------------------------------------------------
// Resolution priority on mount:
//   1. If a Clerk session exists → POST /api/account/resolve with the JWT.
//      The server verifies the token and returns the synced Clerk profile.
//   2. Else → POST /api/account/resolve with a saved guestId (if any).
//      The server returns/creates the matching guest profile.

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { createApiClient } from "@/lib/apiClient";
import { useAccountStore, type Profile, type AccountType } from "@/stores/useAccountStore";

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded: clerkLoaded, isSignedIn, getToken } = useAuth();
  const { user: clerkUser } = useUser();

  const setProfile = useAccountStore((s) => s.setProfile);
  const setLoading = useAccountStore((s) => s.setLoading);
  const setError = useAccountStore((s) => s.setError);
  const guestId = useAccountStore((s) => s.guestId);
  const anonId = useAccountStore((s) => s.anonId);
  const currentProfile = useAccountStore((s) => s.profile);
  const setGuestId = useAccountStore((s) => s.setGuestId);

  const ranOnce = useRef(false);

  useEffect(() => {
    if (!clerkLoaded) return;
    void resolveProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clerkLoaded, isSignedIn, clerkUser?.id]);

  async function resolveProfile() {
    setLoading(true);
    setError(null);
    try {
      // Persist anonymous login across full reloads.
      // /api/account/resolve currently returns a guest fallback for unsigned users,
      // so if we already have a saved anonymous id, restore it locally first.
      if (!isSignedIn && anonId) {
        setProfile({
          id: anonId,
          account_type: "anonymous",
          public_id: anonId,
          clerk_user_id: null,
          username: anonId,
          display_name: anonId,
          email: null,
          phone: null,
          image_url: null,
          bio: null,
          preferences: {},
          onboarding_complete: false,
        });
        ranOnce.current = true;
        return;
      }

      const api = createApiClient({
        getToken: isSignedIn
          ? () => getToken({ template: "supabase" }).catch(() => null)
          : undefined,
        publicId: !isSignedIn ? anonId ?? guestId : null,
      });

      const resumeId = anonId ?? guestId;
      const r = await api.resolveAccount(resumeId);
      const profile = r.profile as Profile | null;
      if (profile) {
        // Keep anonymous sign-ins stable: backend fallback resolvers may return
        // a synthetic guest profile while an anonymous profile already exists.
        // Never downgrade anonymous -> guest during unauthenticated flows.
        if (
          !isSignedIn &&
          currentProfile?.account_type === "anonymous" &&
          profile.account_type === "guest"
        ) {
          ranOnce.current = true;
          return;
        }
        setProfile(profile);
        if (profile.account_type === "guest" && profile.public_id !== guestId) {
          setGuestId(profile.public_id);
        }
        ranOnce.current = true;

        // Once-per-session: ensure backend admin/seed is set up. Idempotent on
        // the server. Only attempted for signed-in Clerk users.
        if (profile.account_type === "clerk" && isSignedIn) {
          api
            .initAdminAndSeed()
            .then((res) => {
              if (res.becameAdmin) console.info("[admin] You are now the site admin.");
              if (res.seeded) console.info("[admin] Seeded papers:", res.stats);
            })
            .catch((e) => {
              // Non-fatal: site still works without seed.
              // eslint-disable-next-line no-console
              console.warn("[admin] init skipped:", e?.error || e);
            });
        }
      } else {
        setError("Failed to resolve account");
      }
    } catch (e) {
      const msg = (e as { error?: string })?.error || (e as Error).message || "unknown";
      setError(msg);
      // eslint-disable-next-line no-console
      console.error("[account] resolve failed:", msg);
    } finally {
      setLoading(false);
    }
  }

  return <>{children}</>;
}

/** Convenience hook returning the active profile. */
export function useProfile(): {
  profile: Profile | null;
  loading: boolean;
  accountType: AccountType | null;
} {
  const profile = useAccountStore((s) => s.profile);
  const loading = useAccountStore((s) => s.loading);
  return { profile, loading, accountType: profile?.account_type ?? null };
}

/** Update the current user's profile via /api/profile. */
export function useUpdateMyProfile() {
  const { getToken, isSignedIn } = useAuth();
  const profile = useAccountStore((s) => s.profile);
  const setProfile = useAccountStore((s) => s.setProfile);

  return useCallback(
    async (patch: Partial<Profile>) => {
      if (!profile) throw new Error("No active profile");
      const api = createApiClient({
        getToken: isSignedIn
          ? () => getToken({ template: "supabase" }).catch(() => null)
          : undefined,
        publicId: !isSignedIn ? profile.public_id : null,
      });
      const { profile: updated } = await api.updateMyProfile(patch as Record<string, unknown>);
      setProfile(updated as unknown as Profile);
      return updated;
    },
    [profile, isSignedIn, getToken, setProfile],
  );
}

/** Compatibility shim — old code imported `useClerkSupabase` for direct DB calls. */
export function useClerkSupabase() {
  return useMemo(() => {
    // eslint-disable-next-line no-console
    console.warn(
      "[account] useClerkSupabase is deprecated. Use the API client (useApi) — direct Supabase access from the client is no longer supported.",
    );
    return null;
  }, []);
}
