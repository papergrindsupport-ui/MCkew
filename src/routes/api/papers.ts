// Public + admin paper/question/answer-key/threshold endpoints.
// All reads are public. Writes require an admin role.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { json, preflight } from "@/server/auth.server";
import { verifyClerkJWT, bearerFrom } from "@/server/clerk.server";

async function requireAdmin(req: Request): Promise<{ ok: true; clerkId: string } | Response> {
  const token = bearerFrom(req as any);
  if (!token) return json({ error: "Unauthorized" }, { status: 401 });
  const claims = await verifyClerkJWT(token);
  if (!claims?.sub) return json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("clerk_user_id", claims.sub)
    .eq("role", "admin")
    .maybeSingle();
  if (error) return json({ error: error.message }, { status: 500 });
  if (!data) return json({ error: "Forbidden: admin role required" }, { status: 403 });
  return { ok: true, clerkId: claims.sub };
}

export const Route = createFileRoute("/api/papers")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),

      // GET /api/papers — list ALL papers (public, only published unless admin)
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const subject = url.searchParams.get("subject");
        let q = supabaseAdmin
          .from("papers")
          .select("*")
          .eq("published", true)
          .order("subject")
          .order("year", { ascending: false })
          .order("session")
          .order("variant");
        if (subject) q = q.eq("subject", subject);
        const { data, error } = await q;
        if (error) return json({ error: error.message }, { status: 400 });
        return json({ data: data ?? [] });
      },

      // POST /api/papers — admin upsert a single paper
      POST: async ({ request }) => {
        const auth = await requireAdmin(request);
        if (auth instanceof Response) return auth;
        const body = await request.json().catch(() => null);
        if (!body || typeof body.id !== "string") {
          return json({ error: "Invalid body" }, { status: 400 });
        }
        const { data, error } = await supabaseAdmin
          .from("papers")
          .upsert(
            {
              id: body.id,
              subject: body.subject,
              year: body.year,
              session: body.session,
              variant: body.variant,
              title: body.title ?? `${body.year} ${body.session} ${body.variant}`,
              locked: body.locked ?? false,
              difficulty: body.difficulty ?? null,
              priority: body.priority ?? null,
              grade_thresholds: body.gradeThresholds ?? body.grade_thresholds ?? [],
              tags: body.tags ?? [],
              topics: body.topics ?? [],
              lessons: body.lessons ?? [],
              skills: body.skills ?? [],
              bento_size: body.bentoSize ?? body.bento_size ?? "md",
              qp_link: body.qpLink ?? body.qp_link ?? null,
              ms_link: body.msLink ?? body.ms_link ?? null,
              gt_link: body.gtLink ?? body.gt_link ?? null,
              published: body.published ?? true,
            },
            { onConflict: "id" },
          )
          .select()
          .single();
        if (error) return json({ error: error.message }, { status: 400 });
        return json({ data });
      },
    },
  },
});
