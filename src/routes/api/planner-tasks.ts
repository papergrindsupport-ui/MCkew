import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveRequestAuth, json, preflight } from "@/server/auth.server";

const TaskCreateSchema = z.object({
  column_id: z.string().min(1).max(80),
  title: z.string().max(500).optional(),
  description: z.string().max(20000).optional(),
  order: z.number().int().optional(),
  due_date: z.string().max(40).optional().nullable(),
  due_time: z.string().max(40).optional().nullable(),
  start_date: z.string().max(40).optional().nullable(),
  end_date: z.string().max(40).optional().nullable(),
  tags: z.array(z.string().max(80)).max(50).optional(),
  link: z.string().max(2000).optional().nullable(),
});

const TaskPatchSchema = z.object({
  column_id: z.string().min(1).max(80).optional(),
  title: z.string().max(500).optional(),
  description: z.string().max(20000).optional(),
  completed: z.boolean().optional(),
  order: z.number().int().optional(),
  due_date: z.string().max(40).optional().nullable(),
  due_time: z.string().max(40).optional().nullable(),
  start_date: z.string().max(40).optional().nullable(),
  end_date: z.string().max(40).optional().nullable(),
  tags: z.array(z.string().max(80)).max(50).optional(),
  comments: z.array(z.unknown()).max(500).optional(),
  activity: z.array(z.unknown()).max(2000).optional(),
  link: z.string().max(2000).optional().nullable(),
});

export const Route = createFileRoute("/api/planner-tasks")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),

      GET: async ({ request }) => {
        const auth = await resolveRequestAuth(request);
        if (!auth.profile) return json({ data: [] });
        const { data, error } = await supabaseAdmin
          .from("planner_tasks")
          .select("*")
          .eq("profile_id", auth.profile.id)
          .order("order", { ascending: true });
        if (error) return json({ error: error.message }, { status: 400 });
        return json({ data: data ?? [] });
      },

      POST: async ({ request }) => {
        const auth = await resolveRequestAuth(request);
        if (!auth.profile) return json({ error: "Not authenticated" }, { status: 401 });
        let body: z.infer<typeof TaskCreateSchema>;
        try {
          body = TaskCreateSchema.parse(await request.json());
        } catch (e) {
          return json({ error: "Invalid body", detail: (e as Error).message }, { status: 400 });
        }
        const { data, error } = await supabaseAdmin
          .from("planner_tasks")
          .insert({ ...body, profile_id: auth.profile.id } as never)
          .select("*")
          .single();
        if (error) return json({ error: error.message }, { status: 400 });
        return json({ data });
      },
    },
  },
});

// Per-id route lives in src/routes/api/planner-tasks.$id.ts
export { TaskPatchSchema };
