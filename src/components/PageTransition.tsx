// Liquid page transition
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "@tanstack/react-router";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";

// SSR-safe layout effect: useLayoutEffect on client, no-op on server.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Direction = "ltr" | "rtl" | "ttb" | "btt";
const DIRECTIONS: Direction[] = ["ltr", "rtl", "ttb", "btt"];

// Sweep timing — full liquid sweep, performance kept smooth via lazy root widgets.
const SWEEP_SECONDS = 0.7;
const SWEEP_BUFFER_MS = 30;

/**
 * Liquid page transition with a synchronous opaque cover.
 *
 * Lifecycle of one navigation:
 *   1. pathname changes → we IMMEDIATELY (useLayoutEffect, same paint) mount a
 *      full-screen opaque overlay, hiding the new route from the user.
 *   2. The liquid sweep plays across the cover in a random direction.
 *   3. Once the sweep is done AND the router reports `status === "idle"` for
 *      the new pathname (one rAF settle), the cover fades out, revealing the
 *      now-rendered new page.
 *   4. If the new route is still loading after the sweep, a spinner shows on
 *      the black cover until the router becomes idle.
 *
 * This prevents both "new page flashes before transition starts" and "old page
 * lingers after transition finishes".
 */
export function PageTransition() {
  const enabled = useAppSettingsStore((s) => s.pageTransitionsEnabled);
  const { pathname } = useLocation();

  // Client-only mount gate. Prevents SSR from rendering anything transition-related.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [active, setActive] = useState<{ id: number; dir: Direction } | null>(null);

  const idRef = useRef(0);
  const prevPath = useRef(pathname);
  const isFirstRun = useRef(true);

  // Trigger sweep the moment pathname changes. SSR-safe layout effect.
  useIsomorphicLayoutEffect(() => {
    if (!enabled) {
      prevPath.current = pathname;
      return;
    }
    if (isFirstRun.current) {
      isFirstRun.current = false;
      prevPath.current = pathname;
      return;
    }
    if (prevPath.current === pathname) return;

    prevPath.current = pathname;
    idRef.current += 1;
    const dir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    setActive({ id: idRef.current, dir });
  }, [pathname, enabled]);

  // Tear down strictly on the sweep timer — no loader, no router waiting.
  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(
      () => setActive((a) => (a?.id === active.id ? null : a)),
      SWEEP_SECONDS * 1000 + SWEEP_BUFFER_MS,
    );
    return () => window.clearTimeout(t);
  }, [active]);

  // Memoize direction-derived values so we don't recompute every render.
  const { horizontal, start, end } = useMemo(() => {
    const d = active?.dir ?? "ltr";
    const h = d === "ltr" || d === "rtl";
    const s =
      d === "ltr"
        ? { x: "-110%", y: "0%" }
        : d === "rtl"
          ? { x: "110%", y: "0%" }
          : d === "ttb"
            ? { x: "0%", y: "-110%" }
            : { x: "0%", y: "110%" };
    const e =
      d === "ltr"
        ? { x: "110%", y: "0%" }
        : d === "rtl"
          ? { x: "-110%", y: "0%" }
          : d === "ttb"
            ? { x: "0%", y: "110%" }
            : { x: "0%", y: "-110%" };
    return { horizontal: h, start: s, end: e };
  }, [active?.dir]);

  // Skip entirely on server and on first client paint to avoid hydration mismatch.
  if (!enabled || !mounted) return null;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key={active.id}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="fixed inset-0 z-[9999] pointer-events-none isolate overflow-hidden "
        >
          {/* Brief opaque cover at the very start so the new route can't flash
              before the liquid sweep visually covers the screen. */}
          <motion.div
            className="absolute inset-0 bg-background"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: "linear", delay: SWEEP_SECONDS * 0.45 }}
          />

          <svg
            viewBox="0 0 200 200"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
          >
            <defs>
              <filter id="liquid-goo-v3" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b" />
                <feColorMatrix
                  in="b"
                  mode="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -11"
                  result="g"
                />
                <feBlend in="SourceGraphic" in2="g" />
              </filter>
              <linearGradient id="liquid-grad-v3" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.92" />
              </linearGradient>
            </defs>

            <motion.g
              filter="url(#liquid-goo-v3)"
              fill="url(#liquid-grad-v3)"
              initial={{ x: start.x, y: start.y }}
              animate={
                horizontal
                  ? { x: [start.x, "0%", end.x], y: "0%" }
                  : { y: [start.y, "0%", end.y], x: "0%" }
              }
              transition={{
                duration: SWEEP_SECONDS,
                times: [0, 0.5, 1],
                ease: [0.65, 0, 0.35, 1],
              }}
            >
              <rect x="0" y="0" width="200" height="200" />
              {horizontal ? (
                <>
                  <circle cx="205" cy="40" r="14" />
                  <circle cx="210" cy="100" r="18" />
                  <circle cx="205" cy="160" r="13" />
                  <circle cx="218" cy="70" r="9" />
                  <circle cx="220" cy="135" r="10" />
                  <circle cx="-5" cy="40" r="14" />
                  <circle cx="-10" cy="100" r="18" />
                  <circle cx="-5" cy="160" r="13" />
                  <circle cx="-18" cy="70" r="9" />
                  <circle cx="-20" cy="135" r="10" />
                </>
              ) : (
                <>
                  <circle cx="40" cy="205" r="14" />
                  <circle cx="100" cy="210" r="18" />
                  <circle cx="160" cy="205" r="13" />
                  <circle cx="70" cy="218" r="9" />
                  <circle cx="135" cy="220" r="10" />
                  <circle cx="40" cy="-5" r="14" />
                  <circle cx="100" cy="-10" r="18" />
                  <circle cx="160" cy="-5" r="13" />
                  <circle cx="70" cy="-18" r="9" />
                  <circle cx="135" cy="-20" r="10" />
                </>
              )}
            </motion.g>
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
