import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveRequestAuth, json, preflight, toApiError } from "@/server/auth.server";

const AwardSchema = z.object({
  ts: z.number().int().min(0),
  amount: z.number().int().min(-10000).max(10000),
  reason: z.record(z.unknown()),
  // Idempotency key the client uses to dedupe (questionId or paperId+ts)
  key: z.string().min(1).max(200),
});

const PutBody = z.object({
  total: z.number().int().min(0).max(10_000_000),
  newAwards: z.array(AwardSchema).max(50).optional(),
});

export const Route = createFileRoute("/api/wallet")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),
      GET: async ({ request }) => {
        try {
          const auth = await resolveRequestAuth(request);
          if (!auth.profile) return json({ error: "Not authenticated" }, { status: 401 });

        const [{ data: wallet }, { data: awards }] = await Promise.all([
          supabaseAdmin.from("wallet").select("*").eq("profile_id", auth.profile.id).maybeSingle(),
          supabaseAdmin
            .from("pencil_awards")
            .select("*")
            .eq("profile_id", auth.profile.id)
            .order("ts", { ascending: false })
            .limit(500),
        ]);

          return json({ wallet: wallet ?? null, awards: awards ?? [] });
        } catch (e) {
          return json(toApiError(e), { status: 502 });
        }
      },
      PUT: async ({ request }) => {
        try {
          const auth = await resolveRequestAuth(request);
          if (!auth.profile) return json({ error: "Not authenticated" }, { status: 401 });

        let body: z.infer<typeof PutBody>;
        try {
          body = PutBody.parse(await request.json());
        } catch (e) {
          return json({ error: "Invalid body", detail: (e as Error).message }, { status: 400 });
        }

        // Get current wallet for idempotency check
        const { data: existing } = await supabaseAdmin
          .from("wallet")
          .select("credited_keys, total")
          .eq("profile_id", auth.profile.id)
          .maybeSingle();

        const credited = (existing?.credited_keys ?? {}) as Record<string, true>;
        const newAwards = (body.newAwards ?? []).filter((a) => !credited[a.key]);
        let runningTotal = existing?.total ?? 0;

        if (newAwards.length) {
          const rows = newAwards.map((a) => ({
            profile_id: auth.profile!.id,
            ts: a.ts,
            amount: a.amount,
            reason: a.reason as never,
          }));
          const { error: awErr } = await supabaseAdmin.from("pencil_awards").insert(rows);
          if (awErr) return json({ error: awErr.message }, { status: 400 });

          for (const a of newAwards) {
            credited[a.key] = true;
            runningTotal += a.amount;
          }
        }

        const finalTotal = newAwards.length ? runningTotal : body.total;

        const { error: walletErr } = await supabaseAdmin.from("wallet").upsert(
          {
            profile_id: auth.profile.id,
            total: finalTotal,
            credited_keys: credited as never,
          },
          { onConflict: "profile_id" },
        );
        if (walletErr) return json({ error: walletErr.message }, { status: 400 });

          return json({ ok: true, total: finalTotal, accepted: newAwards.length });
        } catch (e) {
          return json(toApiError(e), { status: 502 });
        }
      },
    },
  },
});
