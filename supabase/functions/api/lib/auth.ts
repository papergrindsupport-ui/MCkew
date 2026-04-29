// Caller resolution + Clerk JWT verification.
// ----------------------------------------------------------------------
// Every request is one of:
//   - clerk    : verified Clerk JWT in Authorization header.
//   - account  : guest/anon, identified by `x-account-public-id` header.
//   - anonymous: neither — only allowed on public read routes.

import { createRemoteJWKSet, jwtVerify } from "https://esm.sh/jose@5.9.6";
import { db } from "./db.ts";
import { HttpError } from "./http.ts";

let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let cachedIssuer: string | null = null;

async function verifyClerk(token: string) {
  const [, payloadB64] = token.split(".");
  if (!payloadB64) throw new HttpError(401, "Malformed token");
  const unverified = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
  const issuer = unverified.iss as string | undefined;
  if (!issuer) throw new HttpError(401, "Token missing iss");
  if (!cachedJwks || cachedIssuer !== issuer) {
    cachedJwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
    cachedIssuer = issuer;
  }
  const { payload } = await jwtVerify(token, cachedJwks, { issuer });
  return payload as { sub: string };
}

export type Caller =
  | { kind: "clerk"; clerkUserId: string; profileId: string | null }
  | { kind: "account"; publicId: string; profileId: string | null }
  | { kind: "anonymous" };

export async function resolveCaller(req: Request): Promise<Caller> {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    try {
      const claims = await verifyClerk(auth.slice(7));
      const { data } = await db()
        .from("profiles")
        .select("id")
        .eq("clerk_user_id", claims.sub)
        .maybeSingle();
      return {
        kind: "clerk",
        clerkUserId: claims.sub,
        profileId: (data as { id: string } | null)?.id ?? null,
      };
    } catch {
      // fall through — let it be anonymous so public reads still work
    }
  }
  const pid = req.headers.get("x-account-public-id");
  if (pid) {
    const { data } = await db().from("profiles").select("id").eq("public_id", pid).maybeSingle();
    return {
      kind: "account",
      publicId: pid,
      profileId: (data as { id: string } | null)?.id ?? null,
    };
  }
  return { kind: "anonymous" };
}

/** Profile id of the caller, or 401 if no identity. */
export function requireProfileId(caller: Caller): string {
  if (caller.kind === "anonymous") throw new HttpError(401, "Authentication required");
  if (!caller.profileId) throw new HttpError(404, "Profile not found");
  return caller.profileId;
}

export async function requireAdmin(caller: Caller): Promise<void> {
  if (caller.kind !== "clerk" || !caller.profileId) {
    throw new HttpError(403, "Admin only");
  }
  const { data } = await db()
    .from("user_roles")
    .select("role")
    .eq("profile_id", caller.profileId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new HttpError(403, "Admin only");
}
