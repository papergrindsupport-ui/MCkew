// Feedback notes — public read, anyone can post (rate-limited per device),
// owner can delete, anyone can react (likes/dislikes/reports). Only the
// counter columns can be updated via this endpoint.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveRequestAuth, json, preflight } from "@/server/auth.server";

const NOTE_LIMIT_PER_DEVICE = 6;

const PostBody = z.object({
  device_id: z.string().min(8).max(128),
  author_name: z.string().trim().max(60).nullable().optional(),
  is_anonymous: z.boolean(),
  text: z.string().trim().min(1).max(500),
  color: z.enum(["yellow", "pink", "blue", "green", "purple", "orange"]),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  feedback_type: z.enum(["question", "suggestion", "comment", "criticism", "bug", "report"]),
  is_public: z.boolean(),
  default_x: z.number().finite().min(-5000).max(50000),
  default_y: z.number().finite().min(-5000).max(50000),
  rotation: z.number().finite().min(-30).max(30),
});

const PatchBody = z.object({
  device_id: z.string().min(8).max(128),
  action: z.enum(["like", "unlike", "dislike", "undislike", "report"]),
});

export const Route = createFileRoute("/api/feedback-notes")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),

      // List public visible notes for the wall.
      GET: async () => {
        const { data, error } = await supabaseAdmin
          .from("feedback_notes")
          .select("*")
          .eq("is_public", true)
          .eq("is_hidden", false)
          .order("created_at", { ascending: false })
          .limit(500);

        if (error) return json({ error: error.message }, { status: 400 });
        return json({ data: data ?? [] });
      },

      POST: async ({ request }) => {
        const auth = await resolveRequestAuth(request);

        let body: z.infer<typeof PostBody>;
        try {
          body = PostBody.parse(await request.json());
        } catch (e) {
          return json({ error: "Invalid body", detail: (e as Error).message }, { status: 400 });
        }

        // Per-device rate limit (server-enforced).
        const { count } = await supabaseAdmin
          .from("feedback_notes")
          .select("id", { count: "exact", head: true })
          .eq("device_id", body.device_id);

        if ((count ?? 0) >= NOTE_LIMIT_PER_DEVICE) {
          return json(
            { error: `Limit of ${NOTE_LIMIT_PER_DEVICE} notes per device reached.` },
            { status: 429 },
          );
        }

        const { data, error } = await supabaseAdmin
          .from("feedback_notes")
          .insert({
            profile_id: auth.profile?.id ?? null,
            device_id: body.device_id,
            author_name: body.is_anonymous ? null : (body.author_name ?? null),
            is_anonymous: body.is_anonymous,
            text: body.text,
            color: body.color,
            sentiment: body.sentiment,
            feedback_type: body.feedback_type,
            is_public: body.is_public,
            default_x: body.default_x,
            default_y: body.default_y,
            rotation: body.rotation,
          })
          .select()
          .single();

        if (error) return json({ error: error.message }, { status: 400 });
        return json({ data });
      },
    },
  },
});
