// Bulk replace the questions for a paper (admin only).
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { json, preflight } from "@/server/auth.server";
import { verifyClerkJWT, bearerFrom } from "@/server/clerk.server";

async function requireAdmin(req: Request): Promise<true | Response> {
  const token = bearerFrom(req as any);
  if (!token) return json({ error: "Unauthorized" }, { status: 401 });
  const claims = await verifyClerkJWT(token);
  if (!claims?.sub) return json({ error: "Unauthorized" }, { status: 401 });
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("clerk_user_id", claims.sub)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) return json({ error: "Forbidden" }, { status: 403 });
  return true;
}

export const Route = createFileRoute("/api/papers/$paperId/questions")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),

      // PUT: replace entire question set for the paper
      PUT: async ({ params, request }) => {
        const auth = await requireAdmin(request);
        if (auth !== true) return auth;
        const body = await request.json().catch(() => null);
        if (!body || !Array.isArray(body.questions)) {
          return json({ error: "Invalid body: { questions: [...] }" }, { status: 400 });
        }
        const paperId = params.paperId;

        // Wipe existing then re-insert in order
        const { error: delErr } = await supabaseAdmin
          .from("questions")
          .delete()
          .eq("paper_id", paperId);
        if (delErr) return json({ error: delErr.message }, { status: 400 });

        if (body.questions.length === 0) return json({ data: [] });

        const rows = body.questions.map((q: any, i: number) => ({
          id: q.id || `${paperId}-q${i + 1}-${crypto.randomUUID().slice(0, 8)}`,
          paper_id: paperId,
          position: i + 1,
          payload: { ...q, paperId, number: String(i + 1) } as any,
        }));
        const { data, error } = await supabaseAdmin.from("questions").insert(rows).select();
        if (error) return json({ error: error.message }, { status: 400 });
        return json({ data });
      },
    },
  },
});
