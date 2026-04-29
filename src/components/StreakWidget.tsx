// Floating streak widget — appears once user gets 3 correct in a row, and
// grows with every additional consecutive correct. Disappears when streak ends.
//
// Perf notes: The continuous bob/rotate/scale animations were running on every
// frame even when the widget was hidden by AnimatePresence's exit, and on every
// page (since this is mounted at the root). They're now CSS-only and respect
// the user's "boring" vibe (which disables them entirely).

import { AnimatePresence, motion } from "framer-motion";
import { LuFlame, LuSparkles, LuPencil } from "react-icons/lu";
import { useStreakStore, PENCILS_PER_STREAK_POINT } from "@/stores/useStreakStore";
import { useVibeStore } from "@/stores/useVibeStore";

export function StreakWidget() {
  const points = useStreakStore((s) => s.points);
  const isBoring = useVibeStore((s) => s.vibe === "boring");
  const pencilsIfEnds = points * PENCILS_PER_STREAK_POINT;

  if (points < 3) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="streak-widget"
        initial={{ opacity: 0, y: 40, scale: 0.85 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.85 }}
        transition={{ type: "spring", stiffness: 380, damping: 26 }}
        className="fixed bottom-6 right-6 z-[90] pointer-events-none select-none"
      >
        <div
          className={
            "relative rounded-2xl border-[3px] border-primary bg-card shadow-2xl px-4 py-3 flex items-center gap-3 " +
            (isBoring ? "" : "streak-bob")
          }
        >
          <div className="relative">
            <LuFlame
              size={36}
              className={"text-primary drop-shadow " + (isBoring ? "" : "streak-flame-pulse")}
            />
            {!isBoring && (
              <span
                key={`spark-${points}`}
                className="absolute -right-1 -top-1 text-primary streak-spark"
              >
                <LuSparkles size={14} />
              </span>
            )}
          </div>

          <div className="leading-tight">
            <div className="flex items-baseline gap-1">
              <span
                key={`n-${points}`}
                className={
                  "text-3xl font-bold text-primary tabular-nums " + (isBoring ? "" : "streak-pop")
                }
              >
                {points}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                streak
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground font-semibold inline-flex items-center gap-1">
              <LuPencil size={10} /> +{pencilsIfEnds} if it ends
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
