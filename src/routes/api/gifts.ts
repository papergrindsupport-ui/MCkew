// Gifts API.
//
//   GET  /api/gifts?dir=received|sent           — list my gifts (auth required)
//   POST /api/gifts { recipient_public_id,
//                     gift_id, note? }          — atomic debit/credit + insert
//
// The chosen catalog gift's amount is the source of truth (server-side).
// We persist gift_id by encoding it into the `message` column as
// `[gift:<id>]\n<note>` (see src/data/giftCatalog.ts) so the existing
// schema doesn't need to change.

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveRequestAuth, json, preflight, toApiError } from "@/server/auth.server";

// Catalog must mirror src/data/giftCatalog.ts. Kept inline so the server
// route has zero client-bundle imports.
const SERVER_GIFTS = {
  rose: 5,
  coffee: 20,
  box: 100,
  gem: 500,
  trophy: 1000,
} as const;
type GiftId = keyof typeof SERVER_GIFTS;

const PostBody = z.object({
  recipient_public_id: z.string().min(1).max(120),
  gift_id: z.enum(Object.keys(SERVER_GIFTS) as [GiftId, ...GiftId[]]),
  note: z.string().max(400).optional().nullable(),
});

function encodeMessage(giftId: GiftId, note?: string | null): string {
  const t = (note ?? "").trim();
  return t ? `[gift:${giftId}]\n${t}` : `[gift:${giftId}]`;
}

type ProfileLite = {
  id: string;
  public_id: string;
  username: string | null;
  display_name: string | null;
  image_url: string | null;
  account_type: string;
};

type GiftRow = {
  id: string;
  amount: number;
  message: string | null;
  created_at: string;
  sender_id: string;
  recipient_id: string;
  sender?: ProfileLite | null;
  recipient?: ProfileLite | null;
};

export const Route = createFileRoute("/api/gifts")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),

      GET: async ({ request }) => {
        try {
          const auth = await resolveRequestAuth(request);
          if (!auth.profile) return json({ error: "Not authenticated" }, { status: 401 });

          const url = new URL(request.url);
          const dir = (url.searchParams.get("dir") ?? "received") as "received" | "sent";
          if (dir !== "received" && dir !== "sent") {
            return json({ error: "Invalid dir" }, { status: 400 });
          }

          const selectExpr =
            dir === "received"
              ? "id,amount,message,created_at,sender_id,recipient_id,sender:profiles!gifts_sender_id_fkey(id,public_id,username,display_name,image_url,account_type)"
              : "id,amount,message,created_at,sender_id,recipient_id,recipient:profiles!gifts_recipient_id_fkey(id,public_id,username,display_name,image_url,account_type)";

          const { data, error } = await supabaseAdmin
            .from("gifts")
            .select(selectExpr)
            .eq(dir === "received" ? "recipient_id" : "sender_id", auth.profile.id)
            .order("created_at", { ascending: false })
            .limit(200);

          if (error) return json({ error: error.message }, { status: 400 });

          const rows = (data ?? []) as unknown as GiftRow[];
          const items = rows.map((g) => {
            const counterparty = dir === "received" ? g.sender : g.recipient;
            return {
              id: g.id,
              amount: g.amount,
              message: g.message,
              createdAt: g.created_at,
              counterparty: counterparty
                ? {
                    publicId: counterparty.public_id,
                    username: counterparty.username,
                    displayName: counterparty.display_name,
                    imageUrl: counterparty.image_url,
                    accountType: counterparty.account_type,
                  }
                : null,
            };
          });

          // Aggregate totals (cheap on ≤200 rows; full totals via separate sum).
          const { data: totals } = await supabaseAdmin
            .from("gifts")
            .select("amount", { count: "exact" })
            .eq(dir === "received" ? "recipient_id" : "sender_id", auth.profile.id);

          const totalAmount = (totals ?? []).reduce(
            (sum: number, r: { amount: number }) => sum + (r.amount ?? 0),
            0,
          );

          return json({ data: items, totalAmount, totalCount: items.length });
        } catch (e) {
          return json(toApiError(e), { status: 502 });
        }
      },

      POST: async ({ request }) => {
        try {
          const auth = await resolveRequestAuth(request);
          if (!auth.profile) return json({ error: "Not authenticated" }, { status: 401 });

          let body: z.infer<typeof PostBody>;
          try {
            body = PostBody.parse(await request.json());
          } catch (e) {
            return json({ error: "Invalid body", detail: (e as Error).message }, { status: 400 });
          }

          const { data: recipient } = await supabaseAdmin
            .from("profiles")
            .select("id,public_id,username,display_name,image_url")
            .eq("public_id", body.recipient_public_id)
            .maybeSingle();

          if (!recipient) return json({ error: "Recipient not found" }, { status: 404 });
          const r = recipient as ProfileLite;
          if (r.id === auth.profile.id) {
            return json({ error: "Cannot gift yourself" }, { status: 400 });
          }

          const amount = SERVER_GIFTS[body.gift_id];
          const message = encodeMessage(body.gift_id, body.note);

          const { data, error } = await supabaseAdmin.rpc("send_gift", {
            _sender_id: auth.profile.id,
            _recipient_id: r.id,
            _amount: amount,
            _message: message,
          } as never);

          if (error) {
            const status = /Insufficient/i.test(error.message)
              ? 402
              : /yourself/i.test(error.message)
                ? 400
                : 400;
            return json({ error: error.message }, { status });
          }

          return json({
            ok: true,
            giftId: data,
            amount,
            recipient: {
              publicId: r.public_id,
              username: r.username,
              displayName: r.display_name,
              imageUrl: r.image_url,
            },
          });
        } catch (e) {
          return json(toApiError(e), { status: 502 });
        }
      },
    },
  },
});
