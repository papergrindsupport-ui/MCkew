/**
 * Bearer for `/api/*` routes that call `verifyClerkJWT` on the server.
 * Prefer Clerk's `supabase` JWT template when present; fall back to the default session token.
 */
export async function getClerkJwtForApi(
  getToken: (opts?: { template?: string }) => Promise<string | null>,
): Promise<string | null> {
  const fromTemplate = await getToken({ template: "supabase" }).catch(() => null);
  if (fromTemplate) return fromTemplate;
  return getToken().catch(() => null);
}
