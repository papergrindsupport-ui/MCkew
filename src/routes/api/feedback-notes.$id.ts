// Per-note actions: react (like/dislike/report), delete (owner-only).
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveRequestAuth, json, preflight } from "@/server/auth.server";

const PatchBody = z.object({
  device_id: z.string().min(8).max(128),
  action: z.enum(["like", "unlike", "dislike", "undislike", "report"]),
});

const DeleteBody = z.object({
  device_id: z.string().min(8).max(128),
});

export const Route = createFileRoute("/api/feedback-notes/$id")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),

      PATCH: async ({ request, params }) => {
        let body: z.infer<typeof PatchBody>;
        try {
          body = PatchBody.parse(await request.json());
        } catch (e) {
          return json({ error: "Invalid body", detail: (e as Error).message }, { status: 400 });
        }

        const { data: note, error: getErr } = await supabaseAdmin
          .from("feedback_notes")
          .select("id, likes, dislikes, reports")
          .eq("id", params.id)
          .maybeSingle();

        if (getErr) return json({ error: getErr.message }, { status: 400 });
        if (!note) return json({ error: "Note not found" }, { status: 404 });

        const patch: { likes?: number; dislikes?: number; reports?: number } = {};
        switch (body.action) {
          case "like":
            patch.likes = (note.likes ?? 0) + 1;
            break;
          case "unlike":
            patch.likes = Math.max(0, (note.likes ?? 0) - 1);
            break;
          case "dislike":
            patch.dislikes = (note.dislikes ?? 0) + 1;
            break;
          case "undislike":
            patch.dislikes = Math.max(0, (note.dislikes ?? 0) - 1);
            break;
          case "report":
            patch.reports = (note.reports ?? 0) + 1;
            break;
        }

        const { data, error } = await supabaseAdmin
          .from("feedback_notes")
          .update(patch)
          .eq("id", params.id)
          .select()
          .single();

        if (error) return json({ error: error.message }, { status: 400 });
        return json({ data });
      },

      DELETE: async ({ request, params }) => {
        const auth = await resolveRequestAuth(request);

        let body: z.infer<typeof DeleteBody>;
        try {
          body = DeleteBody.parse(await request.json());
        } catch (e) {
          return json({ error: "Invalid body", detail: (e as Error).message }, { status: 400 });
        }

        // Look up note ownership: original device wins, or the signed-in
        // profile that posted it, or any admin (RLS check on the API layer
        // since admin gets full delete RLS already).
        const { data: note } = await supabaseAdmin
          .from("feedback_notes")
          .select("device_id, profile_id")
          .eq("id", params.id)
          .maybeSingle();

        if (!note) return json({ error: "Note not found" }, { status: 404 });

        const ownsByDevice = note.device_id === body.device_id;
        const ownsByProfile = !!auth.profile && note.profile_id === auth.profile.id;
        if (!ownsByDevice && !ownsByProfile) {
          return json({ error: "Not your note" }, { status: 403 });
        }

        const { error } = await supabaseAdmin.from("feedback_notes").delete().eq("id", params.id);

        if (error) return json({ error: error.message }, { status: 400 });
        return json({ ok: true });
      },
    },
  },
});
