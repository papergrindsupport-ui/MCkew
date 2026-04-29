import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveRequestAuth, json, preflight } from "@/server/auth.server";

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

export const Route = createFileRoute("/api/planner-tasks/$id")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),

      PATCH: async ({ request, params }) => {
        const auth = await resolveRequestAuth(request);
        if (!auth.profile) return json({ error: "Not authenticated" }, { status: 401 });
        let patch: z.infer<typeof TaskPatchSchema>;
        try {
          patch = TaskPatchSchema.parse(await request.json());
        } catch (e) {
          return json({ error: "Invalid body", detail: (e as Error).message }, { status: 400 });
        }
        const { data, error } = await supabaseAdmin
          .from("planner_tasks")
          .update(patch as never)
          .eq("id", params.id)
          .eq("profile_id", auth.profile.id)
          .select("*")
          .maybeSingle();
        if (error) return json({ error: error.message }, { status: 400 });
        if (!data) return json({ error: "Not found" }, { status: 404 });
        return json({ data });
      },

      DELETE: async ({ request, params }) => {
        const auth = await resolveRequestAuth(request);
        if (!auth.profile) return json({ error: "Not authenticated" }, { status: 401 });
        const { error } = await supabaseAdmin
          .from("planner_tasks")
          .delete()
          .eq("id", params.id)
          .eq("profile_id", auth.profile.id);
        if (error) return json({ error: error.message }, { status: 400 });
        return json({ ok: true });
      },
    },
  },
});
