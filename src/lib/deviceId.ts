/** Returns a stable per-browser device id, localStorage-based. */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "ssr";
  const KEY = "fb_device_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}
