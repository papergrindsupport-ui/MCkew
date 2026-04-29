// Routes: /desk/folders and /desk/items — owner-scoped CRUD.
import { db } from "../lib/db.ts";
import { json, HttpError } from "../lib/http.ts";
import { type Caller, requireProfileId } from "../lib/auth.ts";
import { parse, readJson, v } from "../lib/validate.ts";

const folderCreate = {
  parent_id: v.optional(v.string({ max: 64 })),
  name: v.string({ min: 1, max: 120 }),
  description: v.optional(v.string({ max: 500 })),
  icon: v.optional(v.string({ max: 64 })),
  color: v.optional(v.string({ max: 64 })),
  flag: v.optional(v.string({ max: 32 })),
  archived: v.optional(v.bool()),
  order: v.optional(v.int({ min: 0 })),
};
const folderPatch = {
  parent_id: v.optional(v.string({ max: 64 })),
  name: v.optional(v.string({ min: 1, max: 120 })),
  description: v.optional(v.string({ max: 500 })),
  icon: v.optional(v.string({ max: 64 })),
  color: v.optional(v.string({ max: 64 })),
  flag: v.optional(v.string({ max: 32 })),
  archived: v.optional(v.bool()),
  order: v.optional(v.int({ min: 0 })),
  comments: v.optional(v.jsonArray()),
};

export async function listFolders(caller: Caller) {
  const profileId = requireProfileId(caller);
  const { data, error } = await db()
    .from("desk_folders")
    .select("*")
    .eq("profile_id", profileId)
    .order("order", { ascending: true });
  if (error) throw new HttpError(500, error.message);
  return json({ data });
}

export async function createFolder(req: Request, caller: Caller) {
  const profileId = requireProfileId(caller);
  const body = await readJson(req);
  const v1 = parse(body, folderCreate);
  const insert: Record<string, unknown> = { profile_id: profileId, name: v1.name };
  for (const [k, val] of Object.entries(v1)) if (val !== undefined && k !== "name") insert[k] = val;
  const { data, error } = await db().from("desk_folders").insert(insert).select().single();
  if (error) throw new HttpError(400, error.message);
  return json({ data }, 201);
}

export async function patchFolder(req: Request, id: string, caller: Caller) {
  const profileId = requireProfileId(caller);
  const body = await readJson(req);
  const patch = parse(body, folderPatch);
  const update: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(patch)) if (val !== undefined) update[k] = val;
  const { data, error } = await db()
    .from("desk_folders")
    .update(update)
    .eq("id", id)
    .eq("profile_id", profileId)
    .select()
    .maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, "Folder not found");
  return json({ data });
}

export async function deleteFolder(id: string, caller: Caller) {
  const profileId = requireProfileId(caller);
  const { error } = await db()
    .from("desk_folders")
    .delete()
    .eq("id", id)
    .eq("profile_id", profileId);
  if (error) throw new HttpError(500, error.message);
  return json({ ok: true });
}

// ---------- items ---------------------------------------------------

const itemCreate = {
  folder_id: v.optional(v.string({ max: 64 })),
  type: v.oneOf(["note", "question", "paper"] as const),
  payload: v.optional(v.jsonObject()),
  order: v.optional(v.int({ min: 0 })),
};
const itemPatch = {
  folder_id: v.optional(v.string({ max: 64 })),
  payload: v.optional(v.jsonObject()),
  order: v.optional(v.int({ min: 0 })),
};

export async function listItems(req: Request, caller: Caller) {
  const profileId = requireProfileId(caller);
  const url = new URL(req.url);
  const folderId = url.searchParams.get("folder_id");
  let q = db().from("desk_items").select("*").eq("profile_id", profileId).order("order");
  if (folderId === "null") q = q.is("folder_id", null);
  else if (folderId) q = q.eq("folder_id", folderId);
  const { data, error } = await q;
  if (error) throw new HttpError(500, error.message);
  return json({ data });
}

export async function createItem(req: Request, caller: Caller) {
  const profileId = requireProfileId(caller);
  const body = await readJson(req);
  const v1 = parse(body, itemCreate);
  const { data, error } = await db()
    .from("desk_items")
    .insert({ profile_id: profileId, ...v1 })
    .select()
    .single();
  if (error) throw new HttpError(400, error.message);
  return json({ data }, 201);
}

export async function patchItem(req: Request, id: string, caller: Caller) {
  const profileId = requireProfileId(caller);
  const body = await readJson(req);
  const patch = parse(body, itemPatch);
  const update: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(patch)) if (val !== undefined) update[k] = val;
  const { data, error } = await db()
    .from("desk_items")
    .update(update)
    .eq("id", id)
    .eq("profile_id", profileId)
    .select()
    .maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, "Item not found");
  return json({ data });
}

export async function deleteItem(id: string, caller: Caller) {
  const profileId = requireProfileId(caller);
  const { error } = await db().from("desk_items").delete().eq("id", id).eq("profile_id", profileId);
  if (error) throw new HttpError(500, error.message);
  return json({ ok: true });
}
