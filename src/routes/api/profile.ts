import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveRequestAuth, json, preflight } from "@/server/auth.server";

const PatchSchema = z.object({
  username: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional()
    .nullable(),
  display_name: z.string().min(1).max(80).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  image_url: z.string().url().max(500).optional().nullable(),
  preferences: z.record(z.unknown()).optional(),
  onboarding_complete: z.boolean().optional(),
});

export const Route = createFileRoute("/api/profile")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => {
        const auth = await resolveRequestAuth(request);
        if (!auth.profile) return json({ error: "No profile" }, { status: 404 });
        return json({ profile: auth.profile });
      },
      PATCH: async ({ request }) => {
        const auth = await resolveRequestAuth(request);
        if (!auth.profile) return json({ error: "Not authenticated" }, { status: 401 });

        let patch: z.infer<typeof PatchSchema>;
        try {
          patch = PatchSchema.parse(await request.json());
        } catch (e) {
          return json({ error: "Invalid body", detail: (e as Error).message }, { status: 400 });
        }

        // No-op when nothing to update — return current profile.
        if (!patch || Object.keys(patch).length === 0) {
          return json({ profile: auth.profile });
        }

        const { data, error } = await supabaseAdmin
          .from("profiles")
          .update(patch as never)
          .eq("id", auth.profile.id)
          .select("*")
          .maybeSingle();

        if (error) return json({ error: error.message }, { status: 400 });
        return json({ profile: data ?? auth.profile });
      },
    },
  },
});
