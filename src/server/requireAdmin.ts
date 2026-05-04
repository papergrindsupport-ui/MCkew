// Shared admin gate for `/api/papers*` and admin mutations.
// Accepts EITHER a `user_roles` row (role admin) OR a Clerk user id listed in ADMIN_USERIDS / VOLUNTEER_USERIDS
// (vite-inlined from ADMIN_USERIDS / VITE_ADMIN_USERIDS / VOLUNTEER_USERIDS / VITE_VOLUNTEER_USERIDS in `.env`).

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { json } from "@/server/auth.server";
import { bearerFrom, verifyClerkJWT } from "@/server/clerk.server";

function adminIdWhitelist(): string[] {
  const raw = [
    process.env.ADMIN_USERIDS,
    process.env.VITE_ADMIN_USERIDS,
    process.env.VOLUNTEER_USERIDS,
    process.env.VITE_VOLUNTEER_USERIDS,
  ]
    .filter(Boolean)
    .join(",");
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function requireAdmin(
  req: Request,
): Promise<{ ok: true; clerkId: string } | Response> {
  const token = bearerFrom(req);
  if (!token) return json({ error: "Unauthorized" }, { status: 401 });
  const claims = await verifyClerkJWT(token);
  if (!claims?.sub) return json({ error: "Unauthorized" }, { status: 401 });
  const clerkId = claims.sub;

  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("clerk_user_id", clerkId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) return json({ error: error.message }, { status: 500 });
  if (data) return { ok: true, clerkId };

  if (adminIdWhitelist().includes(clerkId)) {
    return { ok: true, clerkId };
  }

  return json({ error: "Forbidden: admin role required" }, { status: 403 });
}
