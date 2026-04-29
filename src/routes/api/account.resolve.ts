import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveRequestAuth, json, preflight } from "@/server/auth.server";
import { getOrCreateGuest } from "@/server/profiles.server";

const ResolveBody = z.object({
  // Optional saved guest id to resume an existing guest session.
  guestId: z.string().min(1).max(64).optional().nullable(),
});

export const Route = createFileRoute("/api/account/resolve")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      POST: async ({ request }) => {
        let body: z.infer<typeof ResolveBody> = {};
        try {
          const raw = await request.text();
          body = ResolveBody.parse(raw ? JSON.parse(raw) : {});
        } catch (e) {
          return json({ error: "Invalid body", detail: (e as Error).message }, { status: 400 });
        }

        // Legacy account/profile system is not wired to the current Cloud DB.
        // Return a stub guest profile so the app continues to load.
        const guestId =
          body.guestId ??
          `guest_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
        return json({
          profile: {
            id: guestId,
            public_id: guestId,
            account_type: "guest",
            username: null,
            display_name: null,
            image_url: null,
            bio: null,
          },
        });
      },
    },
  },
});
