// Clerk-aware Supabase client.
// ----------------------------------------------------------------------
// Returns a Supabase client whose `Authorization` header carries the Clerk
// session JWT (when one exists), so RLS policies that read the `sub` claim
// from `request.jwt.claims` work for Clerk users.
//
// You must configure a Clerk JWT template named "supabase" in the Clerk
// dashboard → JWT Templates. Set the signing algorithm to RS256 and add
// these custom claims (all optional):
//   {
//     "email":      "{{user.primary_email_address}}",
//     "username":   "{{user.username}}",
//     "phone":      "{{user.primary_phone_number}}",
//     "full_name":  "{{user.full_name}}",
//     "image_url":  "{{user.image_url}}"
//   }

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export type GetClerkToken = () => Promise<string | null>;

export function makeClerkSupabase(getToken: GetClerkToken): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (url, options = {}) => {
        const token = await getToken();
        const headers = new Headers(options.headers as HeadersInit | undefined);
        if (token) headers.set("Authorization", `Bearer ${token}`);
        return fetch(url, { ...options, headers });
      },
    },
  });
}
