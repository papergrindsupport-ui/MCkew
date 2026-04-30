// Set grade thresholds for a paper (admin only).
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { json, preflight } from "@/server/auth.server";
import { requireAdmin } from "@/server/requireAdmin";

export const Route = createFileRoute("/api/papers/$paperId/thresholds")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),

      PUT: async ({ params, request }) => {
        const auth = await requireAdmin(request);
        if (auth instanceof Response) return auth;
        const body = await request.json().catch(() => null);
        if (!body) return json({ error: "Invalid body" }, { status: 400 });
        const { data, error } = await supabaseAdmin
          .from("paper_thresholds")
          .upsert(
            { paper_id: params.paperId, letter: body.letter ?? null, number: body.number ?? null },
            { onConflict: "paper_id" },
          )
          .select()
          .single();
        if (error) return json({ error: error.message }, { status: 400 });
        return json({ data });
      },
    },
  },
});
