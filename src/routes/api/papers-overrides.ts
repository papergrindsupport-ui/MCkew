// Bulk overrides endpoint: returns every paper that has been admin-edited
// (i.e. every row in the papers table), plus every question/answer-key/
// threshold override. Used by the client merge layer to hydrate admin edits
// on top of the static catalog.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { json, preflight, toApiError } from "@/server/auth.server";

export const Route = createFileRoute("/api/papers-overrides")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async () => {
        try {
          const [papersRes, questionsRes, keysRes, thrRes] = await Promise.all([
            supabaseAdmin.from("papers").select("*").eq("published", true),
            supabaseAdmin
              .from("questions")
              .select("paper_id,id,position,payload")
              .order("paper_id")
              .order("position"),
            supabaseAdmin.from("paper_answer_keys").select("paper_id,letters"),
            supabaseAdmin.from("paper_thresholds").select("paper_id,letter,number"),
          ]);

          const questionsByPaper: Record<string, any[]> = {};
          for (const r of questionsRes.data ?? []) {
            const arr = questionsByPaper[r.paper_id] ?? (questionsByPaper[r.paper_id] = []);
            arr.push({ ...(r.payload as object), id: r.id });
          }
          const answerKeys: Record<string, string> = {};
          for (const r of keysRes.data ?? []) answerKeys[r.paper_id] = r.letters;
          const thresholds: Record<string, { letter: any; number: any }> = {};
          for (const r of thrRes.data ?? [])
            thresholds[r.paper_id] = { letter: r.letter, number: r.number };

          return json({
            papers: papersRes.data ?? [],
            questionsByPaper,
            answerKeys,
            thresholds,
          });
        } catch (e) {
          return json(toApiError(e), { status: 502 });
        }
      },
    },
  },
});
