// Public + admin paper/question/answer-key/threshold endpoints.
// All reads are public. Writes require an admin role.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { json, preflight } from "@/server/auth.server";
import { requireAdmin } from "@/server/requireAdmin";

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
        try {
          const auth = await requireAdmin(request);
          if (auth instanceof Response) return auth;
          const body = await request.json().catch(() => null);
          if (!body || typeof body.id !== "string") {
            return json({ error: "Invalid body: missing id" }, { status: 400 });
          }
          // Parse the canonical paper id "<subject>-<year>-<session>-<variant>"
          // so we can backfill required NOT NULL columns when the draft only
          // sent the id (older client paths). Never throw on malformed ids —
          // just keep the body fields and let the db reject if truly invalid.
          const parts = String(body.id).split("-");
          const fallbackSubject = parts[0];
          const fallbackYear = parts[1] ? Number(parts[1]) : undefined;
          const fallbackSession = parts[2];
          const fallbackVariant = parts[3];
          const subject = body.subject ?? fallbackSubject;
          const year = body.year ?? fallbackYear;
          const session = body.session ?? fallbackSession;
          const variant = body.variant ?? fallbackVariant;
          if (!subject || !year || !session || !variant) {
            return json(
              {
                error:
                  "Invalid paper id. Expected format <subject>-<year>-<session>-<variant>, e.g. bio-2024-June-V2",
              },
              { status: 400 },
            );
          }
          const row = {
            id: body.id,
            subject,
            year,
            session,
            variant,
            title: body.title ?? `${year} ${session} ${variant}`,
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
          };
          const { data, error } = await supabaseAdmin
            .from("papers")
            .upsert(row, { onConflict: "id" })
            .select()
            .single();
          if (error) {
            console.error("[api/papers POST] supabase error:", error);
            return json({ error: error.message, details: error }, { status: 400 });
          }
          return json({ data });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("[api/papers POST] unhandled:", e);
          return json({ error: `Server error: ${msg}` }, { status: 500 });
        }
      },
    },
  },
});
