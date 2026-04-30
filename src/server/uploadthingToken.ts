// Resolves the v7 `UPLOADTHING_TOKEN` (base64 JSON) for UploadThing.
// Prefer the full token from the dashboard. Alternatively set `UPLOADTHING_SECRET` (sk_…)
// plus `UPLOADTHING_APP_ID` and optional `UPLOADTHING_REGIONS` (comma-separated, default fra1).

export function resolveUploadThingToken(): string {
  const full = (process.env.UPLOADTHING_TOKEN ?? "").trim();
  if (full) return full;

  const apiKey = (process.env.UPLOADTHING_SECRET ?? process.env.UPLOADTHING_API_KEY ?? "").trim();
  const appId = (process.env.UPLOADTHING_APP_ID ?? "").trim();
  const regionsRaw = (process.env.UPLOADTHING_REGIONS ?? "fra1").trim();
  const regions = regionsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!apiKey.startsWith("sk_") || !appId || regions.length === 0) return "";

  const payload = JSON.stringify({ apiKey, appId, regions });
  if (typeof Buffer !== "undefined") {
    return Buffer.from(payload, "utf8").toString("base64");
  }
  return btoa(payload);
}
