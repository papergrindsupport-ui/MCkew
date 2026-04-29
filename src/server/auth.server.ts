// Server-only request auth helper.
// ----------------------------------------------------------------------
// Resolves the calling profile for an /api/* request:
//   1. If a Clerk Bearer JWT is present and valid → sync/return Clerk profile.
//   2. Else if `x-account-public-id` header is present → return that guest/anon profile.
//   3. Else → null (caller is anonymous-no-account).

import { bearerFrom, verifyClerkJWT } from "./clerk.server";
import { syncClerkProfile, getProfileByPublicId, type Profile } from "./profiles.server";

export interface AuthContext {
  profile: Profile | null;
  isClerk: boolean;
}

export async function resolveRequestAuth(req: Request): Promise<AuthContext> {
  const token = bearerFrom(req);
  if (token && token !== process.env.SUPABASE_PUBLISHABLE_KEY) {
    const claims = await verifyClerkJWT(token);
    if (claims) {
      const profile = await syncClerkProfile(claims);
      return { profile, isClerk: true };
    }
  }
  const publicId = req.headers.get("x-account-public-id");
  if (publicId) {
    const profile = await getProfileByPublicId(publicId);
    if (profile) return { profile, isClerk: false };
  }
  return { profile: null, isClerk: false };
}

/** CORS-safe headers used by all /api/* routes. */
export const API_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, apikey, x-account-public-id, x-requested-with",
  "Access-Control-Max-Age": "86400",
} as const;

export function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...API_CORS,
      ...(init.headers || {}),
    },
  });
}

export function preflight(): Response {
  return new Response(null, { status: 204, headers: API_CORS });
}

export function toApiError(error: unknown): { error: string; detail?: string } {
  const message = error instanceof Error ? error.message : String(error);
  if (/fetch failed|ECONN|ENOTFOUND|network|timed out/i.test(message)) {
    return {
      error: "Upstream fetch failed",
      detail: message,
    };
  }
  return { error: "Internal server error", detail: message };
}
