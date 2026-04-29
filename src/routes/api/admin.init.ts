// Convenience endpoint: idempotently bootstrap admin (if none exists) and seed
// the static papers/questions catalog. Called once by the client on first
// Clerk sign-in. Safe to call repeatedly.
//
// Behavior:
//   - If no admin role exists yet → make the caller the admin.
//   - If the caller is now/was admin AND the papers table is empty → seed it.
//   - Otherwise: no-op.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { json, preflight, toApiError } from "@/server/auth.server";
import { verifyClerkJWT, bearerFrom } from "@/server/clerk.server";
import { PAPERS } from "@/data/paperData";
import { getAnswerKey } from "@/data/answerKey";
import { getPaperThresholds } from "@/data/gradeThresholds";
import { getPaperQuestions } from "@/data/paperQuestions";

export const Route = createFileRoute("/api/admin/init")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),

      POST: async ({ request }) => {
        try {
          const token = bearerFrom(request);
          if (!token) return json({ error: "Sign in first" }, { status: 401 });
          const claims = await verifyClerkJWT(token);
          if (!claims?.sub) return json({ error: "Invalid session" }, { status: 401 });
          const clerkId = claims.sub;

          const result = {
            becameAdmin: false,
            alreadyAdmin: false,
            seeded: false,
            stats: { papers: 0, questions: 0, answerKeys: 0, thresholds: 0 },
          };

        // 1. Bootstrap admin if needed
        const { count: adminCount } = await supabaseAdmin
          .from("user_roles")
          .select("id", { count: "exact", head: true })
          .eq("role", "admin");

        const { data: myRole } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("clerk_user_id", clerkId)
          .eq("role", "admin")
          .maybeSingle();

        if (myRole) {
          result.alreadyAdmin = true;
        } else if ((adminCount ?? 0) === 0) {
          const { error } = await supabaseAdmin
            .from("user_roles")
            .insert({ clerk_user_id: clerkId, role: "admin" });
          if (error) return json({ error: `bootstrap: ${error.message}` }, { status: 500 });
          result.becameAdmin = true;
        }

        const isAdmin = result.alreadyAdmin || result.becameAdmin;
        if (!isAdmin) return json(result);

        // 2. Seed if papers table empty
        const { count: paperCount } = await supabaseAdmin
          .from("papers")
          .select("id", { count: "exact", head: true });
        if ((paperCount ?? 0) > 0) return json(result);

        // Papers
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
          result.stats.papers += chunk.length;
        }

        // Questions
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
            result.stats.questions += chunk.length;
          }
        }

        // Answer keys
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
          result.stats.answerKeys += chunk.length;
        }

        // Thresholds
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
          result.stats.thresholds += chunk.length;
        }

          result.seeded = true;
          return json(result);
        } catch (e) {
          return json(toApiError(e), { status: 502 });
        }
      },
    },
  },
});
