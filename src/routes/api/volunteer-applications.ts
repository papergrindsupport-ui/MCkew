// Volunteer applications — public submit, owner/admin read.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveRequestAuth, json, preflight } from "@/server/auth.server";

const ContactMethodSchema = z.record(z.unknown());

const ApplicationBody = z.object({
  fullName: z.string().trim().min(1).max(200),
  contactMethods: z.array(ContactMethodSchema).max(20),
  dateOfBirth: z.string().max(64).optional(),
  availableFrom: z.string().max(64).optional(),
  availableTo: z.string().max(64).optional(),
  hoursPerDay: z.number().int().min(0).max(24).default(0),
  subjects: z.array(z.record(z.unknown())).max(20),
  educationLevel: z.string().max(200).optional(),
  customEducation: z.string().max(500).optional(),
  nationality: z.string().max(120).optional(),
  livesInHomeCountry: z.boolean().default(true),
  currentLocation: z.string().max(200).optional(),
  customFields: z
    .array(
      z.object({
        id: z.string().max(64),
        label: z.string().max(200),
        value: z.string().max(2000),
      }),
    )
    .max(50),
  applicationMessage: z.unknown().optional(),
  role: z.string().min(1).max(64),
  customRole: z.string().max(200).optional(),
  acceptedTerms: z.boolean(),
});

export const Route = createFileRoute("/api/volunteer-applications")({
  server: {
    handlers: {
      OPTIONS: async () => preflight(),

      GET: async ({ request }) => {
        const auth = await resolveRequestAuth(request);
        if (!auth.profile) return json({ data: [] });

        const { data, error } = await supabaseAdmin
          .from("volunteer_applications")
          .select("*")
          .eq("profile_id", auth.profile.id)
          .order("created_at", { ascending: false });

        if (error) return json({ error: error.message }, { status: 400 });
        return json({ data: data ?? [] });
      },

      POST: async ({ request }) => {
        const auth = await resolveRequestAuth(request);

        let body: z.infer<typeof ApplicationBody>;
        try {
          body = ApplicationBody.parse(await request.json());
        } catch (e) {
          return json({ error: "Invalid body", detail: (e as Error).message }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
          .from("volunteer_applications")
          .insert({
            profile_id: auth.profile?.id ?? null,
            full_name: body.fullName,
            contact_methods: body.contactMethods as never,
            date_of_birth: body.dateOfBirth ?? null,
            available_from: body.availableFrom ?? null,
            available_to: body.availableTo ?? null,
            hours_per_day: body.hoursPerDay,
            subjects: body.subjects as never,
            education_level: body.educationLevel ?? null,
            custom_education: body.customEducation ?? null,
            nationality: body.nationality ?? null,
            lives_in_home_country: body.livesInHomeCountry,
            current_location: body.currentLocation ?? null,
            custom_fields: body.customFields as never,
            application_message: (body.applicationMessage ?? null) as never,
            role: body.role,
            custom_role: body.customRole ?? null,
            accepted_terms: body.acceptedTerms,
            status: "pending",
          })
          .select()
          .single();

        if (error) return json({ error: error.message }, { status: 400 });
        return json({ data });
      },
    },
  },
});
