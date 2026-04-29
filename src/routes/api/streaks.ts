import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveRequestAuth, json, preflight, toApiError } from "@/server/auth.server";

const StateSchema = z.object({
  current: z.number().int().min(0).max(10000),
  points: z.number().int().min(0).max(10000),
  last_ts: z.number().int().min(0),
  current_subjects: z.record(z.number().int().min(0).max(10000)),
});

const HistoryRecord = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  points: z.number().int().min(0).max(10000),
  pencils: z.number().int().min(0).max(100000),
  ended_at: z.number().int().min(0),
  subject: z.string().min(1).max(20),
});

const PutBody = z.object({
  state: StateSchema,
  newHistory: z.array(HistoryRecord).max(10).optional(),
});

export const Route = createFileRoute("/api/streaks")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => {
        try {
          const auth = await resolveRequestAuth(request);
          if (!auth.profile) return json({ error: "Not authenticated" }, { status: 401 });

          const [{ data: state }, { data: history }] = await Promise.all([
            supabaseAdmin
              .from("streaks_state")
              .select("*")
              .eq("profile_id", auth.profile.id)
              .maybeSingle(),
            supabaseAdmin
              .from("streaks_history")
              .select("*")
              .eq("profile_id", auth.profile.id)
              .order("ended_at", { ascending: false })
              .limit(500),
          ]);

          return json({ state: state ?? null, history: history ?? [] });
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

          const stateRow = {
            profile_id: auth.profile.id,
            current: body.state.current,
            points: body.state.points,
            last_ts: body.state.last_ts,
            current_subjects: body.state.current_subjects as never,
          };

          const { error: upErr } = await supabaseAdmin
            .from("streaks_state")
            .upsert(stateRow, { onConflict: "profile_id" });
          if (upErr) return json({ error: upErr.message }, { status: 400 });

          if (body.newHistory && body.newHistory.length) {
            const rows = body.newHistory.map((h) => ({
              profile_id: auth.profile!.id,
              day: h.day,
              points: h.points,
              pencils: h.pencils,
              ended_at: h.ended_at,
              subject: h.subject,
            }));
            const { error: histErr } = await supabaseAdmin.from("streaks_history").insert(rows);
            if (histErr) return json({ error: histErr.message }, { status: 400 });
          }

          return json({ ok: true });
        } catch (e) {
          return json(toApiError(e), { status: 502 });
        }
      },
    },
  },
});
