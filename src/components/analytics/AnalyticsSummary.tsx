// Reusable summary card for the dashboard.

import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  LuChartLine,
  LuArrowRight,
  LuTrendingUp,
  LuTrendingDown,
  LuMinus,
  LuTarget,
  LuFlame,
} from "react-icons/lu";
import { useAnalyticsStore } from "@/stores/useAnalyticsStore";
import { headline, improvement, detectZone, daysActive, paperBuckets } from "@/lib/analytics";

export function AnalyticsSummary() {
  const attempts = useAnalyticsStore((s) => s.attempts);
  const papers = useAnalyticsStore((s) => s.papers);

  const data = useMemo(() => {
    const h = headline(attempts);
    const imp = improvement(attempts);
    const zone = detectZone(attempts);
    const pb = paperBuckets(papers);
    return {
      h,
      imp,
      zone,
      pb,
      days: daysActive(attempts),
    };
  }, [attempts, papers]);

  const TrendIcon =
    data.imp.direction === "up"
      ? LuTrendingUp
      : data.imp.direction === "down"
        ? LuTrendingDown
        : LuMinus;
  const trendColor =
    data.imp.direction === "up"
      ? "text-emerald-500"
      : data.imp.direction === "down"
        ? "text-red-500"
        : "text-muted-foreground";

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border-2 border-border/60 bg-card p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <LuChartLine size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold">Analytics summary</h2>
            <p className="text-xs text-muted-foreground">A quick pulse on your performance.</p>
          </div>
        </div>
        <Link to="/dashboard/analytics">
          <motion.span
            whileHover={{ x: 2 }}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold border-2 border-primary/40 bg-primary/10 text-primary cursor-pointer"
          >
            More <LuArrowRight size={12} />
          </motion.span>
        </Link>
      </div>

      {data.h.attempted === 0 ? (
        <div className="text-sm text-muted-foreground py-4 text-center">
          No data yet — answer a few questions to start building your stats.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Attempted" value={data.h.attempted} icon={<LuTarget />} />
          <Stat label="Accuracy" value={`${Math.round(data.h.accuracy * 100)}%`} accent />
          <Stat label="Papers passed" value={`${data.pb.passed}/${data.pb.submitted}`} />
          <Stat
            label="Trend"
            value={
              <span className={`inline-flex items-center gap-1 ${trendColor}`}>
                <TrendIcon size={14} />
                {data.imp.enoughData ? data.imp.direction : "—"}
              </span>
            }
          />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
        {data.zone.kind === "comfort" && (
          <Pill tone="amber" icon={<LuFlame size={10} />}>
            Comfort zone
          </Pill>
        )}
        {data.zone.kind === "overconfidence" && (
          <Pill tone="red" icon={<LuFlame size={10} />}>
            Over-confidence
          </Pill>
        )}
        {data.zone.kind === "balanced" && <Pill tone="emerald">Balanced practice</Pill>}
        {data.zone.kind === "insufficient" && <Pill tone="muted">More data needed</Pill>}
        <Pill tone="muted">
          {data.days} day{data.days === 1 ? "" : "s"} active
        </Pill>
      </div>
    </motion.section>
  );
}

function Stat({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border-2 p-3 ${accent ? "border-primary/40 bg-primary/5" : "border-border/60 bg-background"}`}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}

function Pill({
  children,
  tone,
  icon,
}: {
  children: React.ReactNode;
  tone: "amber" | "red" | "emerald" | "muted";
  icon?: React.ReactNode;
}) {
  const cls = {
    amber: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-400/40",
    red: "bg-red-500/15 text-red-600 dark:text-red-300 border-red-400/40",
    emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-400/40",
    muted: "bg-muted text-muted-foreground border-border",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-bold ${cls}`}
    >
      {icon}
      {children}
    </span>
  );
}
