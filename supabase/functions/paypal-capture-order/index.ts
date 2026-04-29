// Captures a previously-created PayPal sandbox order, then grants Pro to the account.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PAYPAL_BASE = "https://api-m.sandbox.paypal.com";

async function getAccessToken(clientId: string, secret: string): Promise<string> {
  const auth = btoa(`${clientId}:${secret}`);
  const r = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!r.ok) throw new Error(`PayPal token failed: ${r.status}`);
  return (await r.json()).access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const secret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    if (!clientId || !secret) throw new Error("PayPal credentials not configured");

    const { orderId, accountId } = await req.json();
    if (!orderId || !accountId) {
      return new Response(JSON.stringify({ error: "orderId and accountId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await getAccessToken(clientId, secret);
    const cap = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    const result = await cap.json();
    if (!cap.ok || result.status !== "COMPLETED") {
      throw new Error(`Capture failed: ${JSON.stringify(result)}`);
    }

    // Verify amount and custom_id (defense in depth)
    const pu = result.purchase_units?.[0];
    const captured = pu?.payments?.captures?.[0];
    const amountStr = captured?.amount?.value ?? "0";
    const amountCents = Math.round(parseFloat(amountStr) * 100);
    const captureId = captured?.id ?? orderId;
    const customId = pu?.payments?.captures?.[0]?.custom_id ?? pu?.custom_id;
    if (customId && customId !== accountId) {
      throw new Error("custom_id mismatch — refusing to grant Pro");
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error: rpcErr } = await supa.rpc("grant_pro", {
      _account_id: accountId,
      _source: "paypal",
      _source_ref: captureId,
      _amount_cents: amountCents,
    });
    if (rpcErr) throw rpcErr;

    return new Response(JSON.stringify({ ok: true, captureId, amountCents }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("paypal-capture-order error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
