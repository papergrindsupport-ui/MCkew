// Set the 40-letter answer key for a paper (admin only).
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { json, preflight } from "@/server/auth.server";
import { requireAdmin } from "@/server/requireAdmin";

export const Route = createFileRoute("/api/papers/$paperId/answer-key")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),

      PUT: async ({ params, request }) => {
        const auth = await requireAdmin(request);
        if (auth instanceof Response) return auth;
        const body = await request.json().catch(() => null);
        const letters = String(body?.letters ?? "").toUpperCase();
        if (!/^[ABCD]{40}$/.test(letters)) {
          return json({ error: "letters must be 40 chars of A/B/C/D" }, { status: 400 });
        }
        const { data, error } = await supabaseAdmin
          .from("paper_answer_keys")
          .upsert({ paper_id: params.paperId, letters }, { onConflict: "paper_id" })
          .select()
          .single();
        if (error) return json({ error: error.message }, { status: 400 });
        return json({ data });
      },
    },
  },
});
