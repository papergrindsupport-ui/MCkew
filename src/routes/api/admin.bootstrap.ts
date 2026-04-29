// One-time bootstrap: if no admin exists yet, the FIRST authenticated caller
// becomes admin. After that, this endpoint refuses.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { json, preflight } from "@/server/auth.server";
import { verifyClerkJWT, bearerFrom } from "@/server/clerk.server";

export const Route = createFileRoute("/api/admin/bootstrap")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),

      POST: async ({ request }) => {
        const token = bearerFrom(request);
        if (!token) return json({ error: "Sign in first" }, { status: 401 });
        const claims = await verifyClerkJWT(token);
        if (!claims?.sub) return json({ error: "Invalid session" }, { status: 401 });

        // Refuse if any admin already exists.
        const { count, error: cErr } = await supabaseAdmin
          .from("user_roles")
          .select("id", { count: "exact", head: true })
          .eq("role", "admin");
        if (cErr) return json({ error: cErr.message }, { status: 500 });
        if ((count ?? 0) > 0) {
          return json({ error: "An admin already exists" }, { status: 403 });
        }

        const { error } = await supabaseAdmin
          .from("user_roles")
          .insert({ clerk_user_id: claims.sub, role: "admin" });
        if (error) return json({ error: error.message }, { status: 400 });
        return json({ ok: true, message: "You are now admin." });
      },

      // Tells the UI whether bootstrap is still possible and whether the
      // current user is already admin.
      GET: async ({ request }) => {
        const token = bearerFrom(request);
        const claims = token ? await verifyClerkJWT(token) : null;

        const { count } = await supabaseAdmin
          .from("user_roles")
          .select("id", { count: "exact", head: true })
          .eq("role", "admin");

        let isAdmin = false;
        if (claims?.sub) {
          const { data } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("clerk_user_id", claims.sub)
            .eq("role", "admin")
            .maybeSingle();
          isAdmin = !!data;
        }
        return json({
          adminCount: count ?? 0,
          bootstrapAvailable: (count ?? 0) === 0,
          isAdmin,
          authenticated: !!claims?.sub,
        });
      },
    },
  },
});
