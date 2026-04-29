// Contact / feedback form submissions (used by /help and any contact form).
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveRequestAuth, json, preflight } from "@/server/auth.server";

const Body = z.object({
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().email().max(254).optional(),
  category: z.string().trim().min(1).max(64).default("general"),
  message: z.string().trim().min(1).max(4000),
  metadata: z.record(z.unknown()).optional(),
});

export const Route = createFileRoute("/api/feedback")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),

      // Returns the caller's own past feedback submissions (for the
      // "My past messages" panel in ContactSection). Returns an empty
      // list for unauthenticated callers — no PII leakage.
      GET: async ({ request }) => {
        const auth = await resolveRequestAuth(request);
        if (!auth.profile) return json({ data: [] });
        const { data, error } = await supabaseAdmin
          .from("feedback_submissions")
          .select("id, name, email, category, message, metadata, status, created_at")
          .eq("profile_id", auth.profile.id)
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) return json({ error: error.message }, { status: 400 });
        return json({ data: data ?? [] });
      },

      POST: async ({ request }) => {
        const auth = await resolveRequestAuth(request);

        let body: z.infer<typeof Body>;
        try {
          body = Body.parse(await request.json());
        } catch (e) {
          return json({ error: "Invalid body", detail: (e as Error).message }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
          .from("feedback_submissions")
          .insert({
            profile_id: auth.profile?.id ?? null,
            name: body.name ?? null,
            email: body.email ?? null,
            category: body.category,
            message: body.message,
            metadata: (body.metadata ?? {}) as never,
            status: "new",
          })
          .select()
          .single();

        if (error) return json({ error: error.message }, { status: 400 });
        return json({ data });
      },
    },
  },
});
