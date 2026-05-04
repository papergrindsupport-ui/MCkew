/** Comma-separated user identifiers (Clerk id, profile UUID, public_id, anon-*, username). */
export function parseCommaUserIds(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export type EnvRoleFlags = {
  admin: boolean;
  volunteer: boolean;
  developer: boolean;
};

/** True if any candidate id appears in the env list. */
function idHitsList(ids: string[], list: string[]): boolean {
  const set = new Set(ids.map((s) => s.trim()).filter(Boolean));
  return list.some((id) => set.has(id));
}

/**
 * Match role lists from VITE_* env (same pattern as admin FAB).
 * Pass every stable id you have: Clerk sub, DB profile uuid, public_id, username.
 */
export function roleFlagsForCandidateIds(
  candidates: Array<string | null | undefined>,
): EnvRoleFlags {
  const ids = candidates.map((c) => String(c ?? "").trim()).filter(Boolean);
  const admin = parseCommaUserIds(import.meta.env.VITE_ADMIN_USERIDS as string | undefined);
  const volunteer = parseCommaUserIds(import.meta.env.VITE_VOLUNTEER_USERIDS as string | undefined);
  const developer = parseCommaUserIds(import.meta.env.VITE_DEVELOPER_USERIDS as string | undefined);
  const isVolunteer = idHitsList(ids, volunteer);
  return {
    admin: idHitsList(ids, admin) || isVolunteer,
    volunteer: isVolunteer,
    developer: idHitsList(ids, developer),
  };
}
