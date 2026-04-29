// Creates a PayPal sandbox order. Returns { id } that the client uses with
// the PayPal JS SDK to render the approval flow.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PAYPAL_BASE = "https://api-m.sandbox.paypal.com";
const PRICE_USD = "9.99";

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
  if (!r.ok) throw new Error(`PayPal token failed: ${r.status} ${await r.text()}`);
  const d = await r.json();
  return d.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const secret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    if (!clientId || !secret) throw new Error("PayPal credentials not configured");

    const body = await req.json().catch(() => ({}));
    const accountId = (body.accountId ?? "").toString().trim();
    const discountPercent = Math.min(100, Math.max(0, Number(body.discountPercent ?? 0)));

    if (!accountId) {
      return new Response(JSON.stringify({ error: "accountId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already pro?
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: existing } = await supa
      .from("pro_users")
      .select("id")
      .eq("account_id", accountId)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ alreadyPro: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const finalCents = Math.round(999 * (1 - discountPercent / 100));
    const finalDollars = (finalCents / 100).toFixed(2);

    const token = await getAccessToken(clientId, secret);
    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: { currency_code: "USD", value: finalDollars },
            description: "Lifetime Pro unlock — all years & topics",
            custom_id: accountId,
          },
        ],
        application_context: {
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
          brand_name: "Smart Solve",
        },
      }),
    });
    const order = await orderRes.json();
    if (!orderRes.ok) throw new Error(`PayPal order failed: ${JSON.stringify(order)}`);

    return new Response(JSON.stringify({ id: order.id, amount: finalDollars }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("paypal-create-order error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
