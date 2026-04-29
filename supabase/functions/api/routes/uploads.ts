// Routes: /uploads — multipart file uploads to Supabase Storage.
// Buckets: "avatars" and "question-images" (both public-read by URL).
//
// POST /uploads/avatar          (auth required) — replaces caller's avatar
// POST /uploads/question-image  (admin)         — for the /admin/editor

import { db } from "../lib/db.ts";
import { json, HttpError } from "../lib/http.ts";
import { type Caller, requireProfileId, requireAdmin } from "../lib/auth.ts";

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

async function readImageFromMultipart(req: Request): Promise<{ file: File; ext: string }> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    throw new HttpError(400, "Expected multipart/form-data");
  }
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(422, "Missing 'file' field");
  if (file.size === 0) throw new HttpError(422, "Empty file");
  if (file.size > MAX_BYTES) throw new HttpError(413, "File too large (max 5 MB)");
  if (!ALLOWED_MIME.has(file.type)) {
    throw new HttpError(415, `Unsupported MIME type: ${file.type}`);
  }
  const ext = file.type.split("/")[1].replace("svg+xml", "svg").replace("jpeg", "jpg");
  return { file, ext };
}

export async function uploadAvatar(req: Request, caller: Caller) {
  const profileId = requireProfileId(caller);
  const { file, ext } = await readImageFromMultipart(req);

  const path = `${profileId}/avatar-${Date.now()}.${ext}`;
  const buf = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await db()
    .storage.from("avatars")
    .upload(path, buf, { contentType: file.type, upsert: true });
  if (upErr) throw new HttpError(500, `Upload failed: ${upErr.message}`);

  const { data: pub } = db().storage.from("avatars").getPublicUrl(path);
  const url = pub.publicUrl;

  // Persist on the profile so the SPA's optimistic update has a permanent value.
  const { data: updated, error: updErr } = await db()
    .from("profiles")
    .update({ image_url: url })
    .eq("id", profileId)
    .select("public_id, image_url")
    .single();
  if (updErr) throw new HttpError(500, updErr.message);
  return json({ data: { url, profile: updated } }, 201);
}

export async function uploadQuestionImage(req: Request, caller: Caller) {
  await requireAdmin(caller);
  const { file, ext } = await readImageFromMultipart(req);

  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
  const buf = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await db()
    .storage.from("question-images")
    .upload(path, buf, { contentType: file.type, upsert: false });
  if (upErr) throw new HttpError(500, `Upload failed: ${upErr.message}`);

  const { data: pub } = db().storage.from("question-images").getPublicUrl(path);
  return json({ data: { url: pub.publicUrl, path } }, 201);
}
