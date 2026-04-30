// Edge function: auth-resolve-profile
// =========================================================================
// Single endpoint that handles all profile resolution / creation:
//   action: "guest"       -> create or fetch a guest profile by guest public_id
//   action: "anon-create" -> create an anonymous profile (anonId + optional pwd)
//   action: "anon-signin" -> verify anonymous credentials, return profile
//   action: "clerk-sync"  -> verify Clerk JWT, upsert clerk profile from token
//
// Uses the SERVICE ROLE because:
//   - Anonymous & guest accounts have no JWT — RLS would block client-side inserts.
//   - Clerk users do have a JWT but we want to atomically upsert by clerk_user_id.
//
// IMPORTANT: keep all writes inside this function so the public RLS policies
// stay strict (no client INSERT on profiles).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "https://esm.sh/jose@5.9.6";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLERK_SECRET_KEY = Deno.env.get("CLERK_SECRET_KEY") || "";

// Clerk's JWKS URL is derived from the issuer claim, but we accept any
// frontend api host. We resolve at first verification.
let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let cachedIssuer: string | null = null;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Lightweight password hashing (PBKDF2 via WebCrypto). We are NOT trying to
// compete with bcrypt here — anonymous accounts are explicitly low-security
// (the user has been warned in the UI). 100k PBKDF2 iterations is fine.
async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  const arr = Array.from(new Uint8Array(bits));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function makeSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function packPasswordHash(password: string): Promise<string> {
  const salt = makeSalt();
  const hash = await hashPassword(password, salt);
  return `pbkdf2$${salt}$${hash}`;
}

async function verifyPasswordHash(password: string, packed: string): Promise<boolean> {
  const [scheme, salt, expected] = packed.split("$");
  if (scheme !== "pbkdf2" || !salt || !expected) return false;
  const got = await hashPassword(password, salt);
  return got === expected;
}

async function verifyClerkJwt(token: string) {
  // Decode without verification first to discover issuer
  const [, payloadB64] = token.split(".");
  if (!payloadB64) throw new Error("Malformed Clerk token");
  const payloadStr = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
  const unverified = JSON.parse(payloadStr);
  const issuer = unverified.iss as string | undefined;
  if (!issuer) throw new Error("Clerk token missing iss");

  if (!cachedJwks || cachedIssuer !== issuer) {
    cachedJwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
    cachedIssuer = issuer;
  }

  const { payload } = await jwtVerify(token, cachedJwks, { issuer });
  return payload;
}

function dicebearUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}`;
}

/** Random DiceBear thumbs avatar unique per signup (anon id stays human-chosen). */
function randomDicebearThumbUrl(): string {
  const seed = crypto.randomUUID();
  return dicebearUrl(seed);
}

// ----------------------------------------------------------------------
// Handlers
// ----------------------------------------------------------------------

async function handleGuest(body: { guestId?: string }) {
  const sb = admin();
  let publicId = body.guestId?.trim();

  if (publicId) {
    const { data: existing } = await sb
      .from("profiles")
      .select("*")
      .eq("public_id", publicId)
      .maybeSingle();
    if (existing) {
      await sb
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", existing.id);
      return json({ profile: existing });
    }
  }

  publicId = publicId || `guest-${crypto.randomUUID()}`;
  const seed = publicId;
  const { data, error } = await sb
    .from("profiles")
    .insert({
      account_type: "guest",
      public_id: publicId,
      display_name: "Guest",
      image_url: dicebearUrl(seed),
    })
    .select()
    .single();
  if (error) return json({ error: error.message }, 400);
  return json({ profile: data, created: true });
}

async function handleAnonCreate(body: {
  anonId?: string;
  password?: string;
  secretQuestions?: Array<{ id: string; question: string; answer: string }>;
}) {
  const sb = admin();
  const anonId = (body.anonId || "").trim().toLowerCase();
  if (!anonId || anonId.length < 4) {
    return json({ error: "anonId must be at least 4 characters" }, 400);
  }
  if (body.password && body.password.length < 6) {
    return json({ error: "password must be at least 6 characters" }, 400);
  }
  // Make sure the id isn't taken
  const { data: existing } = await sb
    .from("profiles")
    .select("id")
    .eq("public_id", anonId)
    .maybeSingle();
  if (existing) return json({ error: "That anonymous ID is already taken" }, 409);

  const passwordHash = body.password ? await packPasswordHash(body.password) : null;
  const { data, error } = await sb
    .from("profiles")
    .insert({
      account_type: "anonymous",
      public_id: anonId,
      display_name: anonId,
      image_url: randomDicebearThumbUrl(),
      anon_password_hash: passwordHash,
      secret_questions: body.secretQuestions ?? [],
    })
    .select()
    .single();
  if (error) return json({ error: error.message }, 400);
  return json({ profile: data, created: true });
}

async function handleAnonSignIn(body: { anonId?: string; password?: string }) {
  const sb = admin();
  const anonId = (body.anonId || "").trim().toLowerCase();
  if (!anonId) return json({ error: "anonId is required" }, 400);
  const { data: profile } = await sb
    .from("profiles")
    .select("*")
    .eq("public_id", anonId)
    .eq("account_type", "anonymous")
    .maybeSingle();
  if (!profile) return json({ error: "Anonymous ID not found" }, 404);
  if (profile.anon_password_hash) {
    if (!body.password) return json({ error: "Password required" }, 401);
    const ok = await verifyPasswordHash(body.password, profile.anon_password_hash);
    if (!ok) return json({ error: "Wrong password" }, 401);
  }
  await sb.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", profile.id);
  return json({ profile });
}

async function handleClerkSync(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Missing Bearer token" }, 401);
  }
  const token = authHeader.slice("Bearer ".length);
  let claims: Record<string, unknown>;
  try {
    claims = (await verifyClerkJwt(token)) as Record<string, unknown>;
  } catch (e) {
    return json({ error: `Invalid Clerk token: ${(e as Error).message}` }, 401);
  }

  const clerkUserId = claims.sub as string | undefined;
  if (!clerkUserId) return json({ error: "Token missing sub" }, 401);

  // Optional claims pulled from the Clerk JWT template (set these in Clerk
  // dashboard → JWT Templates → Supabase). All optional; we don't fail if missing.
  const email = (claims.email as string | undefined) || null;
  const username = (claims.username as string | undefined) || null;
  const phone = (claims.phone as string | undefined) || null;
  const fullName = (claims.full_name as string | undefined) || null;
  const clerkImage = (claims.image_url as string | undefined) || null;

  const sb = admin();
  const { data: existing } = await sb
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (existing) {
    // Refresh basic fields but don't overwrite a custom image_url with Clerk's.
    const { data: updated } = await sb
      .from("profiles")
      .update({
        email: email ?? existing.email,
        phone: phone ?? existing.phone,
        username: username ?? existing.username,
        display_name: fullName ?? existing.display_name,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();
    return json({ profile: updated ?? existing });
  }

  // First-time clerk user → use DiceBear avatar (NOT Clerk's default).
  const seed = username || clerkUserId;
  const { data: created, error } = await sb
    .from("profiles")
    .insert({
      account_type: "clerk",
      public_id: clerkUserId,
      clerk_user_id: clerkUserId,
      username,
      display_name: fullName || username || "User",
      email,
      phone,
      image_url: dicebearUrl(seed),
    })
    .select()
    .single();
  if (error) return json({ error: error.message }, 400);
  // Mark unused for now — clerkImage is intentionally ignored on signup.
  void clerkImage;
  void CLERK_SECRET_KEY;
  return json({ profile: created, created: true });
}

// ----------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: { action?: string } & Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const action = body.action;
  try {
    switch (action) {
      case "guest":
        return await handleGuest(body as { guestId?: string });
      case "anon-create":
        return await handleAnonCreate(body as never);
      case "anon-signin":
        return await handleAnonSignIn(body as never);
      case "clerk-sync":
        return await handleClerkSync(req.headers.get("authorization"));
      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
