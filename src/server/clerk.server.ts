// Server-only Clerk JWT verification.
// ----------------------------------------------------------------------
// Verifies Clerk-issued JWTs (template "supabase") against Clerk's JWKS.
// Returns the decoded claims (notably `sub` = clerk_user_id) or null.
//
// We auto-derive the JWKS URL from the publishable key (it encodes the
// Clerk frontend hostname, base64-encoded with a trailing "$").

import { jwtVerify, createRemoteJWKSet, type JWTPayload } from "jose";

const PUB_KEY =
  process.env.VITE_CLERK_PUBLISHABLE_KEY ||
  process.env.CLERK_PUBLISHABLE_KEY ||
  "pk_test_c3F1YXJlLXRlYWwtOTQuY2xlcmsuYWNjb3VudHMuZGV2JA";

function deriveClerkHost(): string {
  // Strip "pk_test_" or "pk_live_" prefix and decode base64.
  const stripped = PUB_KEY.replace(/^pk_(test|live)_/, "");
  try {
    const decoded = atob(stripped);
    // Trailing "$" is part of Clerk's encoding
    return decoded.replace(/\$+$/, "");
  } catch {
    return "";
  }
}

const CLERK_HOST = deriveClerkHost();
const JWKS_URL = CLERK_HOST ? `https://${CLERK_HOST}/.well-known/jwks.json` : "";

let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJWKS() {
  if (!JWKS_URL) throw new Error("Clerk host not configured");
  if (!jwksCache) jwksCache = createRemoteJWKSet(new URL(JWKS_URL));
  return jwksCache;
}

export interface ClerkClaims extends JWTPayload {
  sub: string;
  email?: string;
  username?: string;
  phone?: string;
  full_name?: string;
  image_url?: string;
}

export async function verifyClerkJWT(token: string): Promise<ClerkClaims | null> {
  if (!token) return null;
  try {
    const jwks = getJWKS();
    const { payload } = await jwtVerify(token, jwks, {
      // Clerk tokens have `azp` (authorized party) but the issuer is the host.
      // We don't pin the audience because supabase-templated JWTs vary.
    });
    if (!payload.sub) return null;
    return payload as ClerkClaims;
  } catch (e) {
    console.error("[clerk] JWT verification failed:", (e as Error).message);
    return null;
  }
}

export function bearerFrom(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}
