// List a profile's followers and/or following set.
// GET /api/follows/{public_id}/list?dir=followers|following  (default: followers)
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { json, preflight, toApiError } from "@/server/auth.server";

type ProfileLite = {
  id: string;
  public_id: string;
  username: string | null;
  display_name: string | null;
  image_url: string | null;
  bio: string | null;
  account_type: string;
};

type FollowsRow = {
  follower_id: string;
  followee_id: string;
  follower?: ProfileLite | null;
  followee?: ProfileLite | null;
};

export const Route = createFileRoute("/api/follows/$publicId/list")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),

      GET: async ({ request, params }) => {
        try {
          const url = new URL(request.url);
          const dir = (url.searchParams.get("dir") ?? "followers") as "followers" | "following";
          if (dir !== "followers" && dir !== "following") {
            return json({ error: "Invalid dir" }, { status: 400 });
          }

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("public_id", params.publicId)
            .maybeSingle();

          if (!profile) return json({ error: "Not found" }, { status: 404 });

          const profileId = (profile as { id: string }).id;
          const selectExpr =
            dir === "followers"
              ? "follower_id,followee_id,follower:profiles!follows_follower_id_fkey(id,public_id,username,display_name,image_url,bio,account_type)"
              : "follower_id,followee_id,followee:profiles!follows_followee_id_fkey(id,public_id,username,display_name,image_url,bio,account_type)";

          const { data, error } = await supabaseAdmin
            .from("follows")
            .select(selectExpr)
            .eq(dir === "followers" ? "followee_id" : "follower_id", profileId)
            .order("created_at", { ascending: false })
            .limit(500);

          if (error) return json({ error: error.message }, { status: 400 });

          const rows = (data ?? []) as unknown as FollowsRow[];
          const users = rows
            .map((r) => (dir === "followers" ? r.follower : r.followee))
            .filter((p): p is ProfileLite => Boolean(p))
            .map((p) => ({
              id: p.public_id,
              username: p.username,
              displayName: p.display_name,
              imageUrl: p.image_url,
              bio: p.bio,
              accountType: p.account_type,
            }));

          return json({ data: users });
        } catch (e) {
          return json(toApiError(e), { status: 502 });
        }
      },
    },
  },
});
