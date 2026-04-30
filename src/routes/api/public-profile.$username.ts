// Public profile lookup by username (or public_id fallback).
// Returns profile + wallet total + follower/following counts +
// (for signed-in viewer) `viewerFollows` flag.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveRequestAuth, json, preflight } from "@/server/auth.server";

export const Route = createFileRoute("/api/public-profile/$username")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request, params }) => {
        const auth = await resolveRequestAuth(request);
        const username = params.username;
        if (!username || username.length < 1 || username.length > 80) {
          return json({ error: "Invalid username" }, { status: 400 });
        }

        let { data: profile } = await supabaseAdmin
          .from("profiles")
          .select(
            "id,public_id,username,display_name,email,phone,image_url,bio,account_type,created_at,clerk_user_id",
          )
          .eq("username", username)
          .maybeSingle();
        if (!profile) {
          const { data: byPublicId } = await supabaseAdmin
            .from("profiles")
            .select(
              "id,public_id,username,display_name,email,phone,image_url,bio,account_type,created_at,clerk_user_id",
            )
            .eq("public_id", username)
            .maybeSingle();
          profile = byPublicId;
        }
        if (!profile) return json({ error: "Not found" }, { status: 404 });

        const profileId = (profile as { id: string }).id;

        const [{ data: wallet }, followers, following, viewer] = await Promise.all([
          supabaseAdmin.from("wallet").select("total").eq("profile_id", profileId).maybeSingle(),
          supabaseAdmin
            .from("follows")
            .select("id", { count: "exact", head: true })
            .eq("followee_id", profileId),
          supabaseAdmin
            .from("follows")
            .select("id", { count: "exact", head: true })
            .eq("follower_id", profileId),
          auth.profile && auth.profile.id !== profileId
            ? supabaseAdmin
                .from("follows")
                .select("id")
                .eq("follower_id", auth.profile.id)
                .eq("followee_id", profileId)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        return json({
          profile: {
            ...profile,
            pencils: wallet?.total ?? 0,
            followerCount: followers.count ?? 0,
            followingCount: following.count ?? 0,
            viewerFollows: Boolean(viewer?.data),
            isMe: auth.profile?.id === profileId,
          },
        });
      },
    },
  },
});
