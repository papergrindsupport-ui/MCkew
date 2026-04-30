// One-time seeder: imports the legacy hardcoded PAPERS / QUESTIONS / answer keys
// / thresholds into the database. Admin-only. Idempotent — uses upsert.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { json, preflight } from "@/server/auth.server";
import { requireAdmin } from "@/server/requireAdmin";
import { PAPERS } from "@/data/paperData";
import { getAnswerKey } from "@/data/answerKey";
import { getPaperThresholds } from "@/data/gradeThresholds";
import { getPaperQuestions } from "@/data/paperQuestions";

export const Route = createFileRoute("/api/admin/seed")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),

      POST: async ({ request }) => {
        const auth = await requireAdmin(request);
        if (auth instanceof Response) return auth;

        const stats = { papers: 0, questions: 0, answerKeys: 0, thresholds: 0 };

        // 1) Papers: chunked upsert
        const paperRows = PAPERS.map((p) => ({
          id: p.id,
          subject: p.subject,
          year: p.year,
          session: p.session,
          variant: p.variant,
          title: p.title,
          locked: p.locked,
          difficulty: p.difficulty ?? null,
          priority: p.priority ?? null,
          grade_thresholds: p.gradeThresholds,
          tags: p.tags,
          topics: p.topics,
          lessons: p.lessons,
          skills: p.skills,
          bento_size: p.bentoSize,
          qp_link: p.qpLink ?? null,
          ms_link: p.msLink ?? null,
          gt_link: p.gtLink ?? null,
          published: true,
        }));
        for (let i = 0; i < paperRows.length; i += 200) {
          const chunk = paperRows.slice(i, i + 200);
          const { error } = await supabaseAdmin.from("papers").upsert(chunk, { onConflict: "id" });
          if (error) return json({ error: `papers: ${error.message}` }, { status: 500 });
          stats.papers += chunk.length;
        }

        // 2) Questions: replace per paper using canonical 40-question output
        for (const p of PAPERS) {
          const paperId = p.id;
          const qs = getPaperQuestions(paperId);
          await supabaseAdmin.from("questions").delete().eq("paper_id", paperId);
          const rows = qs.map((q, i) => ({
            id: q.id,
            paper_id: paperId,
            position: i + 1,
            payload: { ...q, paperId, number: String(i + 1) } as any,
          }));
          for (let i = 0; i < rows.length; i += 100) {
            const chunk = rows.slice(i, i + 100);
            const { error } = await supabaseAdmin.from("questions").insert(chunk);
            if (error)
              return json({ error: `questions ${paperId}: ${error.message}` }, { status: 500 });
            stats.questions += chunk.length;
          }
        }

        // 3) Answer keys: every paper gets one
        const keyRows = PAPERS.map((p) => ({
          paper_id: p.id,
          letters: getAnswerKey(p.id).join(""),
        }));
        for (let i = 0; i < keyRows.length; i += 200) {
          const chunk = keyRows.slice(i, i + 200);
          const { error } = await supabaseAdmin
            .from("paper_answer_keys")
            .upsert(chunk, { onConflict: "paper_id" });
          if (error) return json({ error: `answer keys: ${error.message}` }, { status: 500 });
          stats.answerKeys += chunk.length;
        }

        // 4) Thresholds: every paper
        const thrRows = PAPERS.map((p) => {
          const t = getPaperThresholds(p.id);
          return {
            paper_id: p.id,
            letter: t.letter ?? null,
            number: t.number ?? null,
          };
        });
        for (let i = 0; i < thrRows.length; i += 200) {
          const chunk = thrRows.slice(i, i + 200);
          const { error } = await supabaseAdmin
            .from("paper_thresholds")
            .upsert(chunk, { onConflict: "paper_id" });
          if (error) return json({ error: `thresholds: ${error.message}` }, { status: 500 });
          stats.thresholds += chunk.length;
        }

        return json({ ok: true, stats });
      },
    },
  },
});
