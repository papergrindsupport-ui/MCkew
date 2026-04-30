// React hook returning a memoized backend-API client wired up with the
// caller's current Clerk JWT (if any) or guest/anon public_id (fallback).
import { useMemo } from "react";
import { useAuth } from "@clerk/clerk-react";
import { createApiClient, type ApiClient } from "@/lib/apiClient";
import { getClerkJwtForApi } from "@/lib/getClerkApiJwt";
import { useAccountStore } from "@/stores/useAccountStore";

export function useApi(): ApiClient {
  const { getToken, isSignedIn } = useAuth();
  const profile = useAccountStore((s) => s.profile);

  return useMemo(
    () =>
      createApiClient({
        getToken: isSignedIn ? () => getClerkJwtForApi(getToken) : undefined,
        publicId: !isSignedIn ? (profile?.public_id ?? null) : null,
      }),
    [getToken, isSignedIn, profile?.public_id],
  );
}
