// Public leaderboard: ALL real profiles, ranked by wallet pencil totals.
// Profiles with no wallet row are still listed (with 0 pencils) so a user
// shows up immediately after signup.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { json, preflight } from "@/server/auth.server";

export const Route = createFileRoute("/api/leaderboard")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async () => {
        // 1. Fetch all profiles (clerk + anonymous + guest).
        // During migration some users may still be represented as guest.
        const { data: profiles, error: profErr } = await supabaseAdmin
          .from("profiles")
          .select("id,public_id,username,display_name,image_url,bio,account_type,clerk_user_id")
          .in("account_type", ["clerk", "anonymous", "guest"])
          .limit(500);
        if (profErr) return json({ error: profErr.message }, { status: 400 });
        if (!profiles || profiles.length === 0) return json({ data: [] });

        // 2. Fetch wallets for those profiles (if any).
        const ids = profiles.map((p: any) => p.id);
        const { data: wallets } = await supabaseAdmin
          .from("wallet")
          .select("profile_id,total")
          .in("profile_id", ids);

        const totalById = new Map<string, number>();
        for (const w of wallets ?? []) totalById.set(w.profile_id, w.total ?? 0);

        // 3. Merge + rank.
        const merged = profiles
          .map((p: any) => ({
            id: p.public_id,
            username: p.username,
            displayName: p.display_name,
            imageUrl: p.image_url,
            bio: p.bio,
            accountType: p.account_type,
            pencils: totalById.get(p.id) ?? 0,
          }))
          .sort((a: any, b: any) => b.pencils - a.pencils);

        return json({ data: merged });
      },
    },
  },
});
