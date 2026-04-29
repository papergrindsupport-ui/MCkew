import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveRequestAuth, json, preflight, toApiError } from "@/server/auth.server";

const SettingsSchema = z.object({
  questions_goal: z.number().int().min(1).max(1000),
  papers_goal: z.number().int().min(1).max(1000),
  onboarded: z.boolean(),
  celebrated_questions: z.record(z.literal(true)),
  celebrated_papers: z.record(z.literal(true)),
});

const HistoryRecord = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  questions_goal: z.number().int().min(1).max(1000),
  papers_goal: z.number().int().min(1).max(1000),
  correct_questions: z.number().int().min(0).max(100000),
  passed_papers: z.number().int().min(0).max(100000),
});

const PutBody = z.object({
  settings: SettingsSchema.partial(),
  history: z.array(HistoryRecord).max(31).optional(),
});

export const Route = createFileRoute("/api/daily-goals")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => {
        try {
          const auth = await resolveRequestAuth(request);
          if (!auth.profile) return json({ error: "Not authenticated" }, { status: 401 });

        const [{ data: settings }, { data: history }] = await Promise.all([
          supabaseAdmin
            .from("daily_goals")
            .select("*")
            .eq("profile_id", auth.profile.id)
            .maybeSingle(),
          supabaseAdmin
            .from("daily_goal_history")
            .select("*")
            .eq("profile_id", auth.profile.id)
            .order("day", { ascending: false })
            .limit(180),
        ]);

          return json({ settings: settings ?? null, history: history ?? [] });
        } catch (e) {
          return json(toApiError(e), { status: 502 });
        }
      },
      PUT: async ({ request }) => {
        try {
          const auth = await resolveRequestAuth(request);
          if (!auth.profile) return json({ error: "Not authenticated" }, { status: 401 });

        let body: z.infer<typeof PutBody>;
        try {
          body = PutBody.parse(await request.json());
        } catch (e) {
          return json({ error: "Invalid body", detail: (e as Error).message }, { status: 400 });
        }

        if (body.settings && Object.keys(body.settings).length) {
          const row = { profile_id: auth.profile.id, ...body.settings };
          const { error } = await supabaseAdmin
            .from("daily_goals")
            .upsert(row as never, { onConflict: "profile_id" });
          if (error) return json({ error: error.message }, { status: 400 });
        }

        if (body.history && body.history.length) {
          const rows = body.history.map((h) => ({ profile_id: auth.profile!.id, ...h }));
          const { error } = await supabaseAdmin
            .from("daily_goal_history")
            .upsert(rows, { onConflict: "profile_id,day" });
          if (error) return json({ error: error.message }, { status: 400 });
        }

          return json({ ok: true });
        } catch (e) {
          return json(toApiError(e), { status: 502 });
        }
      },
    },
  },
});
