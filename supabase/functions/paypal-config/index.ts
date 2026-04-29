// Returns the PayPal sandbox client ID (public — safe to expose).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID") ?? "";
  return new Response(JSON.stringify({ clientId, env: "sandbox" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
