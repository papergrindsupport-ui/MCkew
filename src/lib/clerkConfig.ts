// Clerk publishable key.
// Publishable keys are safe to commit — they only identify the Clerk app,
// they are NOT secrets. (The secret key lives in edge function env vars.)
//
// You can override this by adding VITE_CLERK_PUBLISHABLE_KEY to your env.
export const CLERK_PUBLISHABLE_KEY =
  (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined) ||
  "pk_test_c3F1YXJlLXRlYWwtOTQuY2xlcmsuYWNjb3VudHMuZGV2JA";

if (!CLERK_PUBLISHABLE_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    "[clerk] No publishable key configured. Set VITE_CLERK_PUBLISHABLE_KEY in .env or edit src/lib/clerkConfig.ts.",
  );
}
