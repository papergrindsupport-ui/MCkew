// Sends form-submission notifications via the send-resend-email edge function.
// Failures are logged but never thrown — submission UX must not break if email fails.
import { supabase } from "@/integrations/supabase/client";

export type ResendFormPayload = {
  kind: "contact" | "volunteer";
  source?: string;
  submitterEmail?: string;
  submitterName?: string;
  subject?: string;
  summary: string;
};

export async function sendResendFormEmail(payload: ResendFormPayload): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("send-resend-email", { body: payload });
    if (error) console.error("[sendResendFormEmail] invoke error:", error);
  } catch (e) {
    console.error("[sendResendFormEmail] unexpected error:", e);
  }
}
