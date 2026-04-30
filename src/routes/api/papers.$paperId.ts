// Single paper: GET full bundle (paper + questions + answer key + thresholds), DELETE (admin).
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { json, preflight } from "@/server/auth.server";
import { requireAdmin } from "@/server/requireAdmin";

export const Route = createFileRoute("/api/papers/$paperId")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),

      GET: async ({ params }) => {
        const paperId = params.paperId;
        const [paperRes, questionsRes, keyRes, thresholdsRes] = await Promise.all([
          supabaseAdmin.from("papers").select("*").eq("id", paperId).maybeSingle(),
          supabaseAdmin.from("questions").select("*").eq("paper_id", paperId).order("position"),
          supabaseAdmin
            .from("paper_answer_keys")
            .select("letters")
            .eq("paper_id", paperId)
            .maybeSingle(),
          supabaseAdmin
            .from("paper_thresholds")
            .select("letter,number")
            .eq("paper_id", paperId)
            .maybeSingle(),
        ]);
        return json({
          paper: paperRes.data ?? null,
          questions: (questionsRes.data ?? []).map((r: any) => ({
            ...(r.payload as object),
            id: r.id,
          })),
          answerKey: keyRes.data?.letters ?? null,
          thresholds: thresholdsRes.data ?? null,
        });
      },

      DELETE: async ({ params, request }) => {
        const auth = await requireAdmin(request);
        if (auth instanceof Response) return auth;
        const { error } = await supabaseAdmin.from("papers").delete().eq("id", params.paperId);
        if (error) return json({ error: error.message }, { status: 400 });
        return json({ ok: true });
      },
    },
  },
});
