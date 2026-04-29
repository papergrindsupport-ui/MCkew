// Public profile lookup by username. Returns the profile + wallet total.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { json, preflight } from "@/server/auth.server";

export const Route = createFileRoute("/api/public-profile/$username")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ params }) => {
        const username = params.username;
        if (!username || username.length < 1 || username.length > 80) {
          return json({ error: "Invalid username" }, { status: 400 });
        }
        let { data: profile } = await supabaseAdmin
          .from("profiles")
          .select(
            "id,public_id,username,display_name,email,phone,image_url,bio,account_type,created_at",
          )
          .eq("username", username)
          .maybeSingle();
        // Allow anonymous users to be looked up via /profile/{public_id}.
        if (!profile) {
          const { data: byPublicId } = await supabaseAdmin
            .from("profiles")
            .select(
              "id,public_id,username,display_name,email,phone,image_url,bio,account_type,created_at",
            )
            .eq("public_id", username)
            .maybeSingle();
          profile = byPublicId;
        }
        if (!profile) return json({ error: "Not found" }, { status: 404 });

        const { data: wallet } = await supabaseAdmin
          .from("wallet")
          .select("total")
          .eq("profile_id", profile.id)
          .maybeSingle();

        return json({
          profile: {
            ...profile,
            pencils: wallet?.total ?? 0,
          },
        });
      },
    },
  },
});
