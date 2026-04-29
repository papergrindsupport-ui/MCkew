// Server-side email sender. Wired for Resend but DISABLED until you add a
// RESEND_API_KEY secret to the project (Cloud → Secrets). When the secret
// is missing the route returns 501 so the frontend can react accordingly
// without crashing.
//
// Scope: this is intentionally a thin pass-through. Add per-template
// rendering, suppression, queueing etc. later if needed.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { json, preflight } from "@/server/auth.server";

const Body = z.object({
  to: z.union([z.string().email(), z.array(z.string().email()).min(1).max(10)]),
  subject: z.string().trim().min(1).max(200),
  html: z.string().min(1).max(200_000).optional(),
  text: z.string().min(1).max(200_000).optional(),
  // From address must be on a verified Resend domain. If omitted we use a
  // default sender we configure once email is enabled.
  from: z.string().trim().min(3).max(254).optional(),
  reply_to: z.string().email().optional(),
});

const DEFAULT_FROM = "MCkew <noreply@smartsolving.app>";

export const Route = createFileRoute("/api/send-email")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),

      POST: async ({ request }) => {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
          return json(
            {
              error: "Email sending is not configured.",
              hint: "Add a RESEND_API_KEY secret in Cloud → Secrets to enable.",
            },
            { status: 501 },
          );
        }

        let body: z.infer<typeof Body>;
        try {
          body = Body.parse(await request.json());
        } catch (e) {
          return json({ error: "Invalid body", detail: (e as Error).message }, { status: 400 });
        }

        if (!body.html && !body.text) {
          return json({ error: "Either `html` or `text` is required." }, { status: 400 });
        }

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: body.from ?? DEFAULT_FROM,
            to: body.to,
            subject: body.subject,
            html: body.html,
            text: body.text,
            reply_to: body.reply_to,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return json({ error: "Email send failed", detail: data }, { status: res.status });
        }
        return json({ ok: true, id: (data as { id?: string }).id ?? null });
      },
    },
  },
});
