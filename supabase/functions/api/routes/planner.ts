// Routes: /planner/tasks — owner-scoped CRUD for kanban/gantt cards.
import { db } from "../lib/db.ts";
import { json, HttpError } from "../lib/http.ts";
import { type Caller, requireProfileId } from "../lib/auth.ts";
import { parse, readJson, v } from "../lib/validate.ts";

const taskCreate = {
  column_id: v.string({ min: 1, max: 64 }),
  title: v.string({ min: 1, max: 200 }),
  description: v.optional(v.string({ max: 5000 })),
  completed: v.optional(v.bool()),
  due_date: v.optional(v.string({ max: 10 })),
  due_time: v.optional(v.string({ max: 5 })),
  start_date: v.optional(v.string({ max: 10 })),
  end_date: v.optional(v.string({ max: 10 })),
  tags: v.optional(v.jsonArray()),
  link: v.optional(v.string({ max: 2048 })),
  order: v.optional(v.int({ min: 0 })),
};
const taskPatch = {
  column_id: v.optional(v.string({ min: 1, max: 64 })),
  title: v.optional(v.string({ min: 1, max: 200 })),
  description: v.optional(v.string({ max: 5000 })),
  completed: v.optional(v.bool()),
  due_date: v.optional(v.string({ max: 10 })),
  due_time: v.optional(v.string({ max: 5 })),
  start_date: v.optional(v.string({ max: 10 })),
  end_date: v.optional(v.string({ max: 10 })),
  tags: v.optional(v.jsonArray()),
  comments: v.optional(v.jsonArray()),
  activity: v.optional(v.jsonArray()),
  link: v.optional(v.string({ max: 2048 })),
  order: v.optional(v.int({ min: 0 })),
};

export async function listTasks(caller: Caller) {
  const profileId = requireProfileId(caller);
  const { data, error } = await db()
    .from("planner_tasks")
    .select("*")
    .eq("profile_id", profileId)
    .order("order");
  if (error) throw new HttpError(500, error.message);
  return json({ data });
}

export async function createTask(req: Request, caller: Caller) {
  const profileId = requireProfileId(caller);
  const body = await readJson(req);
  const v1 = parse(body, taskCreate);
  const insert: Record<string, unknown> = { profile_id: profileId };
  for (const [k, val] of Object.entries(v1)) if (val !== undefined) insert[k] = val;
  const { data, error } = await db().from("planner_tasks").insert(insert).select().single();
  if (error) throw new HttpError(400, error.message);
  return json({ data }, 201);
}

export async function patchTask(req: Request, id: string, caller: Caller) {
  const profileId = requireProfileId(caller);
  const body = await readJson(req);
  const patch = parse(body, taskPatch);
  const update: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(patch)) if (val !== undefined) update[k] = val;
  const { data, error } = await db()
    .from("planner_tasks")
    .update(update)
    .eq("id", id)
    .eq("profile_id", profileId)
    .select()
    .maybeSingle();
  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, "Task not found");
  return json({ data });
}

export async function deleteTask(id: string, caller: Caller) {
  const profileId = requireProfileId(caller);
  const { error } = await db()
    .from("planner_tasks")
    .delete()
    .eq("id", id)
    .eq("profile_id", profileId);
  if (error) throw new HttpError(500, error.message);
  return json({ ok: true });
}
