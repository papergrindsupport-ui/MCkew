import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { json, preflight, toApiError } from "@/server/auth.server";

export const Route = createFileRoute("/api/exam-preview-shares/$shareId")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),

      GET: async ({ params }) => {
        try {
          const id = params.shareId;
          if (!id) return json({ error: "Missing share id" }, { status: 400 });

          const { data, error } = await supabaseAdmin
            .from("exam_preview_shares")
            .select("id,audience,read_only,subject,data,created_at,updated_at")
            .eq("id", id)
            .maybeSingle();

          if (error) return json({ error: error.message }, { status: 400 });
          if (!data) return json({ error: "Not found" }, { status: 404 });

          return json({
            share: {
              id: data.id,
              audience: data.audience,
              readOnly: data.read_only,
              subject: data.subject,
              data: data.data,
              createdAt: data.created_at,
              updatedAt: data.updated_at,
            },
          });
        } catch (e) {
          return json(toApiError(e), { status: 502 });
        }
      },
    },
  },
});

