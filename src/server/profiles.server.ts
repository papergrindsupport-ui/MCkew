// Server-only profile resolution helpers.
// ----------------------------------------------------------------------
// Used by /api/account/resolve and others to find-or-create the profile
// for the current Clerk user, anonymous account, or guest.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { ClerkClaims } from "./clerk.server";

export interface Profile {
  id: string;
  account_type: "clerk" | "anonymous" | "guest";
  public_id: string;
  clerk_user_id: string | null;
  username: string | null;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  image_url: string | null;
  bio: string | null;
  preferences: Record<string, unknown>;
  onboarding_complete: boolean;
}

function rand(len = 10): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/** Find or create the profile row for a verified Clerk user. */
export async function syncClerkProfile(claims: ClerkClaims): Promise<Profile> {
  const clerkId = claims.sub;
  // Try existing
  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", clerkId)
    .maybeSingle();

  if (existing) {
    // Best-effort refresh of mutable identity fields from Clerk
    const patch: Partial<Profile> = {};
    if (claims.email && existing.email !== claims.email) patch.email = claims.email;
    if (claims.image_url && existing.image_url !== claims.image_url)
      patch.image_url = claims.image_url;
    if (claims.full_name && !existing.display_name) patch.display_name = claims.full_name;
    if (Object.keys(patch).length) {
      const { data: updated } = await supabaseAdmin
        .from("profiles")
        .update(patch as never)
        .eq("id", existing.id)
        .select("*")
        .single();
      if (updated) return updated as Profile;
    }
    return existing as Profile;
  }

  // Create
  const publicId = `u-${rand(10)}`;
  const insert = {
    account_type: "clerk" as const,
    public_id: publicId,
    clerk_user_id: clerkId,
    username: claims.username ?? null,
    display_name: claims.full_name ?? claims.username ?? null,
    email: claims.email ?? null,
    phone: claims.phone ?? null,
    image_url: claims.image_url ?? null,
    bio: null,
    preferences: {},
    onboarding_complete: false,
  };
  const { data, error } = await supabaseAdmin.from("profiles").insert(insert).select("*").single();
  if (error) throw new Error(`syncClerkProfile insert: ${error.message}`);
  return data as Profile;
}

/** Find or create a guest profile. */
export async function getOrCreateGuest(guestId?: string | null): Promise<Profile> {
  if (guestId) {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("public_id", guestId)
      .eq("account_type", "guest")
      .maybeSingle();
    if (data) return data as Profile;
  }
  const publicId = `g-${rand(10)}`;
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .insert({
      account_type: "guest",
      public_id: publicId,
      preferences: {},
      onboarding_complete: false,
    })
    .select("*")
    .single();
  if (error) throw new Error(`guest insert: ${error.message}`);
  return data as Profile;
}

/** Resolve profile by public_id (used by client header `x-account-public-id`). */
export async function getProfileByPublicId(publicId: string): Promise<Profile | null> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("public_id", publicId)
    .maybeSingle();
  return (data as Profile | null) ?? null;
}
