// Calls the gemini-ai edge function. Single source of truth for AI requests.
import { supabase } from "@/integrations/supabase/client";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-ai`;

export async function callGeminiAI(action: string, payload: any) {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ action, payload }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI request failed (${res.status}): ${text}`);
  }
  return res.json();
}

// Re-export so this file can later be swapped to use supabase.functions.invoke if desired.
export { supabase };
