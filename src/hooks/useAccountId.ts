// Resolves a stable account_id for the current user (Clerk user id or anon public_id).
// Used by Pro/payment/redemption flows.
import { useAccountStore } from "@/stores/useAccountStore";

export function useAccountId(): string | null {
  const profile = useAccountStore((s) => s.profile);
  if (!profile) return null;
  if (profile.id) return String(profile.id);
  if (profile.account_type === "clerk" && profile.clerk_user_id) {
    return `clerk:${profile.clerk_user_id}`;
  }
  if (profile.account_type === "anonymous" && profile.public_id) {
    return `anon:${profile.public_id}`;
  }
  return null;
}
