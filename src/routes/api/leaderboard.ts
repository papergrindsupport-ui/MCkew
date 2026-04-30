// Public leaderboard: ALL real profiles, ranked by wallet pencil totals.
// Profiles with no wallet row are still listed (with 0 pencils) so a user
// shows up immediately after signup.
//
// Each row also includes a `followerCount` and (when caller is signed in)
// a `viewerFollows` boolean so the UI can show real Follow / Following state.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveRequestAuth, json, preflight } from "@/server/auth.server";

export const Route = createFileRoute("/api/leaderboard")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => {
        const auth = await resolveRequestAuth(request);

        const { data: profiles, error: profErr } = await supabaseAdmin
          .from("profiles")
          .select("id,public_id,username,display_name,image_url,bio,account_type,clerk_user_id")
          .in("account_type", ["clerk", "anonymous", "guest"])
          .limit(500);
        if (profErr) return json({ error: profErr.message }, { status: 400 });
        if (!profiles || profiles.length === 0) return json({ data: [] });

        const ids = profiles.map((p: any) => p.id);

        const [{ data: wallets }, { data: followRows }, viewerFollowsRes] = await Promise.all([
          supabaseAdmin.from("wallet").select("profile_id,total").in("profile_id", ids),
          supabaseAdmin.from("follows").select("followee_id").in("followee_id", ids),
          auth.profile
            ? supabaseAdmin
                .from("follows")
                .select("followee_id")
                .eq("follower_id", auth.profile.id)
                .in("followee_id", ids)
            : Promise.resolve({ data: [] as Array<{ followee_id: string }> }),
        ]);

        const totalById = new Map<string, number>();
        for (const w of wallets ?? []) totalById.set(w.profile_id, w.total ?? 0);

        const followerCountById = new Map<string, number>();
        for (const f of followRows ?? []) {
          followerCountById.set(f.followee_id, (followerCountById.get(f.followee_id) ?? 0) + 1);
        }

        const viewerFollowsSet = new Set<string>(
          ((viewerFollowsRes?.data ?? []) as Array<{ followee_id: string }>).map(
            (r) => r.followee_id,
          ),
        );

        const merged = profiles
          .map((p: any) => ({
            id: p.public_id,
            profileUuid: p.id,
            clerkUserId: p.clerk_user_id ?? null,
            username: p.username,
            displayName: p.display_name,
            imageUrl: p.image_url,
            bio: p.bio,
            accountType: p.account_type,
            pencils: totalById.get(p.id) ?? 0,
            followerCount: followerCountById.get(p.id) ?? 0,
            viewerFollows: viewerFollowsSet.has(p.id),
            isMe: auth.profile?.id === p.id,
          }))
          .sort((a: any, b: any) => b.pencils - a.pencils);

        return json({ data: merged });
      },
    },
  },
});
