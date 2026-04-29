import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveRequestAuth, json, preflight, toApiError } from "@/server/auth.server";

const ChallengeDoc = z.object({
  pickedToday: z.record(z.unknown()),
  history: z.record(z.unknown()),
  usedQuestionIds: z.record(z.unknown()),
});

const PutBody = z.object({ data: ChallengeDoc });

export const Route = createFileRoute("/api/daily-challenge")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => {
        try {
          const auth = await resolveRequestAuth(request);
          if (!auth.profile) return json({ error: "Not authenticated" }, { status: 401 });
          const { data } = await supabaseAdmin
            .from("daily_challenge_state")
            .select("data, updated_at")
            .eq("profile_id", auth.profile.id)
            .maybeSingle();
          return json({ challenge: data ?? null });
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
          const { error } = await supabaseAdmin
            .from("daily_challenge_state")
            .upsert(
              { profile_id: auth.profile.id, data: body.data as never },
              { onConflict: "profile_id" },
            );
          if (error) return json({ error: error.message }, { status: 400 });
          return json({ ok: true });
        } catch (e) {
          return json(toApiError(e), { status: 502 });
        }
      },
    },
  },
});
