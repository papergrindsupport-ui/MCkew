import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { json, preflight, toApiError } from "@/server/auth.server";

function randId(len = 14) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  // crypto is available in workers/node-compat, but fall back just in case.
  const bytes =
    typeof crypto !== "undefined" && "getRandomValues" in crypto
      ? crypto.getRandomValues(new Uint8Array(len))
      : null;
  for (let i = 0; i < len; i++) {
    const n = bytes ? bytes[i]! : Math.floor(Math.random() * 256);
    out += alphabet[n % alphabet.length];
  }
  return out;
}

const CreateBody = z.object({
  audience: z.enum(["student", "editor"]),
  readOnly: z.boolean().optional().default(false),
  subject: z.enum(["bio", "chem", "phys", "all"]),
  data: z.record(z.unknown()),
});

export const Route = createFileRoute("/api/exam-preview-shares")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),

      POST: async ({ request }) => {
        try {
          let body: z.infer<typeof CreateBody>;
          try {
            body = CreateBody.parse(await request.json());
          } catch (e) {
            return json({ error: "Invalid body", detail: (e as Error).message }, { status: 400 });
          }

          // Avoid collisions; keep it short enough to share easily.
          let id = randId();
          for (let i = 0; i < 3; i++) {
            const { data: existing } = await supabaseAdmin
              .from("exam_preview_shares")
              .select("id")
              .eq("id", id)
              .maybeSingle();
            if (!existing) break;
            id = randId();
          }

          const { error } = await supabaseAdmin.from("exam_preview_shares").insert({
            id,
            audience: body.audience,
            read_only: body.readOnly,
            subject: body.subject,
            data: body.data as never,
          });
          if (error) return json({ error: error.message }, { status: 400 });

          return json({ id });
        } catch (e) {
          return json(toApiError(e), { status: 502 });
        }
      },
    },
  },
});

