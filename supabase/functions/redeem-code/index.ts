// Validates and redeems a gift/discount code for the given account.
// Atomic — uses public.redeem_code() in the database.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { code, accountId } = await req.json();
    const cleanCode = (code ?? "").toString().trim();
    const cleanAccount = (accountId ?? "").toString().trim();

    if (!cleanCode) {
      return new Response(JSON.stringify({ ok: false, error: "Enter a code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!cleanAccount) {
      return new Response(JSON.stringify({ ok: false, error: "Sign in to redeem a code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data, error } = await supa.rpc("redeem_code", {
      _code: cleanCode,
      _account_id: cleanAccount,
    });
    if (error) throw error;

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("redeem-code error", err);
    return new Response(JSON.stringify({ ok: false, error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
