// Routes: /profiles
import { db } from "../lib/db.ts";
import { json, HttpError } from "../lib/http.ts";
import { type Caller, requireAdmin } from "../lib/auth.ts";
import { parse, readJson, v } from "../lib/validate.ts";

const profilePatchSchema = {
  display_name: v.optional(v.string({ max: 80 })),
  username: v.optional(v.string({ min: 2, max: 32, pattern: /^[a-zA-Z0-9_-]+$/ })),
  bio: v.optional(v.string({ max: 500 })),
  image_url: v.optional(v.string({ max: 2048 })),
  phone: v.optional(v.string({ max: 32 })),
  preferences: v.optional(v.jsonObject()),
  onboarding_complete: v.optional(v.bool()),
};

export async function listProfiles(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 100);
  let query = db()
    .from("profiles")
    .select("id, public_id, account_type, username, display_name, image_url, bio")
    .order("last_seen_at", { ascending: false })
    .limit(limit);
  if (q) {
    query = query.or(`username.ilike.%${q}%,display_name.ilike.%${q}%,public_id.ilike.%${q}%`);
  }
  const { data, error } = await query;
  if (error) throw new HttpError(500, error.message);
  return json({ data });
}

export async function getProfile(publicId: string) {
  const { data, error } = await db()
    .from("profiles")
    .select(
      "id, public_id, account_type, username, display_name, image_url, bio, preferences, onboarding_complete",
    )
    .eq("public_id", publicId)
    .maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, "Profile not found");
  return json({ data });
}

export async function patchProfile(req: Request, publicId: string, caller: Caller) {
  // Ownership: clerk user can patch own; account caller can patch own;
  // admins can patch anyone.
  let authorized = false;
  if (caller.kind === "clerk") {
    const { data: own } = await db()
      .from("profiles")
      .select("public_id")
      .eq("clerk_user_id", caller.clerkUserId)
      .maybeSingle();
    authorized = (own as { public_id: string } | null)?.public_id === publicId;
  } else if (caller.kind === "account") {
    authorized = caller.publicId === publicId;
  }
  if (!authorized) {
    try {
      await requireAdmin(caller);
    } catch {
      throw new HttpError(403, "Forbidden");
    }
  }

  const body = await readJson(req);
  const patch = parse(body, profilePatchSchema);
  // Strip undefined so we don't blank fields by accident.
  const update: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(patch)) if (val !== undefined) update[k] = val;
  if (Object.keys(update).length === 0) {
    throw new HttpError(422, "No fields to update");
  }

  const { data, error } = await db()
    .from("profiles")
    .update(update)
    .eq("public_id", publicId)
    .select()
    .single();
  if (error) throw new HttpError(500, error.message);
  return json({ data });
}

export async function createProfile(req: Request, caller: Caller) {
  await requireAdmin(caller);
  const body = (await readJson(req)) as Record<string, unknown>;
  if (!body.public_id || !body.account_type) {
    throw new HttpError(422, "public_id and account_type are required");
  }
  const { data, error } = await db().from("profiles").insert(body).select().single();
  if (error) throw new HttpError(400, error.message);
  return json({ data }, 201);
}

export async function deleteProfile(publicId: string, caller: Caller) {
  await requireAdmin(caller);
  const { error } = await db().from("profiles").delete().eq("public_id", publicId);
  if (error) throw new HttpError(500, error.message);
  return json({ ok: true });
}
