// Follow / unfollow another user.
// POST   { followee_public_id }  → creates follow (idempotent)
// DELETE { followee_public_id }  → removes follow (idempotent)
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveRequestAuth, json, preflight, toApiError } from "@/server/auth.server";

const Body = z.object({
  followee_public_id: z.string().min(1).max(120),
});

async function resolveFolloweeId(publicId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("public_id", publicId)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export const Route = createFileRoute("/api/follow")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),

      POST: async ({ request }) => {
        try {
          const auth = await resolveRequestAuth(request);
          if (!auth.profile) return json({ error: "Not authenticated" }, { status: 401 });

          let body: z.infer<typeof Body>;
          try {
            body = Body.parse(await request.json());
          } catch (e) {
            return json({ error: "Invalid body", detail: (e as Error).message }, { status: 400 });
          }

          const followeeId = await resolveFolloweeId(body.followee_public_id);
          if (!followeeId) return json({ error: "Followee not found" }, { status: 404 });
          if (followeeId === auth.profile.id) {
            return json({ error: "Cannot follow yourself" }, { status: 400 });
          }

          const { error } = await supabaseAdmin
            .from("follows")
            .upsert({ follower_id: auth.profile.id, followee_id: followeeId } as never, {
              onConflict: "follower_id,followee_id",
              ignoreDuplicates: true,
            });

          if (error) return json({ error: error.message }, { status: 400 });
          return json({ ok: true, following: true });
        } catch (e) {
          return json(toApiError(e), { status: 502 });
        }
      },

      DELETE: async ({ request }) => {
        try {
          const auth = await resolveRequestAuth(request);
          if (!auth.profile) return json({ error: "Not authenticated" }, { status: 401 });

          let body: z.infer<typeof Body>;
          try {
            body = Body.parse(await request.json());
          } catch (e) {
            return json({ error: "Invalid body", detail: (e as Error).message }, { status: 400 });
          }

          const followeeId = await resolveFolloweeId(body.followee_public_id);
          if (!followeeId) return json({ ok: true, following: false });

          const { error } = await supabaseAdmin
            .from("follows")
            .delete()
            .eq("follower_id", auth.profile.id)
            .eq("followee_id", followeeId);

          if (error) return json({ error: error.message }, { status: 400 });
          return json({ ok: true, following: false });
        } catch (e) {
          return json(toApiError(e), { status: 502 });
        }
      },
    },
  },
});
