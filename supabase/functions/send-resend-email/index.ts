// Sends form submission emails directly via Resend API.
// Two emails per submission: owner notification + submitter confirmation.

import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_API_URL = "https://api.resend.com";
const FROM = "MCkew <onboarding@resend.dev>";
const OWNER_EMAIL = "papergrindsupport@gmail.com";

const BodySchema = z.object({
  kind: z.enum(["contact", "volunteer"]),
  source: z.string().max(50).optional(),
  submitterEmail: z.string().trim().email().max(320).optional().or(z.literal("")),
  submitterName: z.string().trim().max(200).optional().or(z.literal("")),
  subject: z.string().trim().max(300).optional().or(z.literal("")),
  summary: z.string().trim().min(1).max(20000),
});

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

async function sendEmail(
  apiKey: string,
  payload: {
    to: string;
    subject: string;
    html: string;
    reply_to?: string;
  },
) {
  const r = await fetch(`${RESEND_API_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: FROM,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      ...(payload.reply_to ? { reply_to: payload.reply_to } : {}),
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(`Resend ${r.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

function ownerHtml(b: z.infer<typeof BodySchema>) {
  const heading =
    b.kind === "volunteer" ? "New volunteer application" : "New contact form submission";
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#fff">
    <h2 style="color:#111;margin:0 0 16px">${escapeHtml(heading)}</h2>
    ${b.source ? `<p style="margin:0 0 8px;color:#555"><strong>Source:</strong> ${escapeHtml(b.source)}</p>` : ""}
    ${b.submitterName ? `<p style="margin:0 0 8px;color:#555"><strong>Name:</strong> ${escapeHtml(b.submitterName)}</p>` : ""}
    ${b.submitterEmail ? `<p style="margin:0 0 8px;color:#555"><strong>Email:</strong> ${escapeHtml(b.submitterEmail)}</p>` : ""}
    ${b.subject ? `<p style="margin:0 0 8px;color:#555"><strong>Subject:</strong> ${escapeHtml(b.subject)}</p>` : ""}
    <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
    <pre style="white-space:pre-wrap;font-family:inherit;font-size:14px;color:#222;margin:0">${escapeHtml(b.summary)}</pre>
  </div>`;
}

function submitterHtml(b: z.infer<typeof BodySchema>) {
  const title =
    b.kind === "volunteer" ? "Thanks for applying to volunteer!" : "Thanks for reaching out!";
  const body =
    b.kind === "volunteer"
      ? "We've received your volunteer application and will review it shortly. Expect to hear back from us soon."
      : "We've received your message and will get back to you as soon as possible.";
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff">
    <h2 style="color:#111;margin:0 0 12px">${escapeHtml(title)}</h2>
    <p style="color:#444;font-size:15px;line-height:1.5;margin:0 0 16px">
      ${b.submitterName ? `Hi ${escapeHtml(b.submitterName)},<br/><br/>` : ""}
      ${escapeHtml(body)}
    </p>
    <p style="color:#666;font-size:13px;margin:24px 0 0">— The MCkew Team</p>
  </div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const b = parsed.data;

    const ownerSubject =
      b.kind === "volunteer"
        ? `[Volunteer] ${b.submitterName || b.submitterEmail || "Anonymous"}`
        : `[Contact${b.source ? `/${b.source}` : ""}] ${b.subject || b.submitterName || "New message"}`;

    const ownerResult = await sendEmail(resendKey, {
      to: OWNER_EMAIL,
      subject: ownerSubject,
      html: ownerHtml(b),
      reply_to: b.submitterEmail || undefined,
    });

    let confirmationResult: any = null;
    if (b.submitterEmail) {
      const confSubject =
        b.kind === "volunteer"
          ? "We received your volunteer application"
          : "Thanks for contacting MCkew";
      try {
        confirmationResult = await sendEmail(resendKey, {
          to: b.submitterEmail,
          subject: confSubject,
          html: submitterHtml(b),
        });
      } catch (e) {
        console.error("Confirmation send failed (owner email succeeded):", e);
      }
    }

    return new Response(JSON.stringify({ success: true, ownerResult, confirmationResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-resend-email error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
