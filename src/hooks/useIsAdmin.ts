import { useMemo } from "react";
import { useUser } from "@clerk/clerk-react";
import { useAccountStore } from "@/stores/useAccountStore";

export function parseAdminUserIds(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Matches VITE_ADMIN_USERIDS against Clerk id and profile id / public_id (anon + DB uuid). */
export function useIsAdminGate(): { allowed: boolean; ready: boolean } {
  const { user, isLoaded: clerkLoaded } = useUser();
  const profile = useAccountStore((s) => s.profile);
  const accountLoading = useAccountStore((s) => s.loading);

  const adminIds = useMemo(
    () => parseAdminUserIds(import.meta.env.VITE_ADMIN_USERIDS as string | undefined),
    [],
  );

  const allowed = useMemo(() => {
    const currentIds = [user?.id, profile?.public_id, profile?.id]
      .map((v) => (v ?? "").trim())
      .filter(Boolean);
    if (adminIds.length === 0) return false;
    return currentIds.some((id) => adminIds.includes(id));
  }, [adminIds, user?.id, profile?.public_id, profile?.id]);

  const ready = clerkLoaded && !accountLoading;
  return { allowed, ready };
}
