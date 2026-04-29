import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveRequestAuth, json, preflight, toApiError } from "@/server/auth.server";

// Desk is stored as one JSONB document for simplicity. Validate the shape
// loosely (top-level keys + size cap) — we don't want to lock the structure
// in the DB while it's still iterating in the frontend.
const DeskDoc = z.object({
  folders: z.array(z.record(z.unknown())).max(2000),
  items: z.array(z.record(z.unknown())).max(20000),
  pinnedPapers: z.array(z.string().max(200)).max(2000),
});

const PutBody = z.object({
  data: DeskDoc,
});

export const Route = createFileRoute("/api/desk")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => {
        try {
          const auth = await resolveRequestAuth(request);
          if (!auth.profile) return json({ error: "Not authenticated" }, { status: 401 });

        const { data } = await supabaseAdmin
          .from("desk_state")
          .select("data, updated_at")
          .eq("profile_id", auth.profile.id)
          .maybeSingle();

          return json({ desk: data ?? null });
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

        const { error } = await supabaseAdmin.from("desk_state").upsert(
          {
            profile_id: auth.profile.id,
            data: body.data as never,
          },
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
