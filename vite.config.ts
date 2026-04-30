import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Cloudflare Workers (and hybrid dev) don't populate process.env from .env files at runtime.
// Load .env once at config time and compile known server keys into the worker SSR bundle via `define`,
// matching dev without Cloudflare — so `/api/papers`, Clerk JWT verify, and Supabase admin work.
function serverEnvDefine(mode: string) {
  const env = loadEnv(mode, process.cwd(), "");
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = env[k];
      if (v !== undefined && v !== "") return v;
    }
    return "";
  };
  const entries = {
    "process.env.SUPABASE_URL": pick("SUPABASE_URL", "VITE_SUPABASE_URL"),
    "process.env.SUPABASE_SERVICE_ROLE_KEY": pick("SUPABASE_SERVICE_ROLE_KEY"),
    "process.env.SUPABASE_PUBLISHABLE_KEY": pick(
      "SUPABASE_PUBLISHABLE_KEY",
      "VITE_SUPABASE_PUBLISHABLE_KEY",
    ),
    "process.env.VITE_CLERK_PUBLISHABLE_KEY": pick("VITE_CLERK_PUBLISHABLE_KEY"),
    "process.env.CLERK_PUBLISHABLE_KEY": pick("CLERK_PUBLISHABLE_KEY"),
    "process.env.CLERK_SECRET_KEY": pick("CLERK_SECRET_KEY"),
    "process.env.RESEND_API_KEY": pick("RESEND_API_KEY"),
    // Pipe-separated comma list of Clerk user ids + anon ids (mirror VITE_ADMIN_USERIDS unless ADMIN_USERIDS set)
    "process.env.ADMIN_USERIDS": pick("ADMIN_USERIDS") || pick("VITE_ADMIN_USERIDS"),
    // UploadThing: full base64 token from dashboard, OR sk_ secret + app id (see src/server/uploadthingToken.ts)
    "process.env.UPLOADTHING_TOKEN": pick("UPLOADTHING_TOKEN"),
    "process.env.UPLOADTHING_SECRET": pick("UPLOADTHING_SECRET", "UPLOADTHING_API_KEY"),
    "process.env.UPLOADTHING_APP_ID": pick("UPLOADTHING_APP_ID"),
    "process.env.UPLOADTHING_REGIONS": pick("UPLOADTHING_REGIONS"),
  } as const;
  return Object.fromEntries(
    Object.entries(entries).map(([key, value]) => [key, JSON.stringify(value)]),
  ) as Record<string, string>;
}

export default defineConfig(({ mode }) => ({
  define: serverEnvDefine(mode),
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    tsconfigPaths(),
    react(),
    tailwindcss(),
  ],
  server: {
    hmr: {
      overlay: false,
    },
  },
}));
