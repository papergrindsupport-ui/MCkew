import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import type { IconType } from "react-icons";
import { LuTable, LuArrowRight } from "react-icons/lu";
import { usePlannerState, progress, type Subject } from "@/lib/plannerStore";

type Accent = "emerald" | "violet" | "sky";

const ACCENTS: Record<
  Accent,
  { ring: string; bg: string; text: string; bar: string; chip: string }
> = {
  emerald: {
    ring: "hover:border-emerald-500/60",
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
    chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  violet: {
    ring: "hover:border-violet-500/60",
    bg: "bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
    bar: "bg-violet-500",
    chip: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  },
  sky: {
    ring: "hover:border-sky-500/60",
    bg: "bg-sky-500/10",
    text: "text-sky-600 dark:text-sky-400",
    bar: "bg-sky-500",
    chip: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },
};

export function PlannerCard({
  subject,
  title,
  Icon,
  accent,
}: {
  subject: Subject;
  title: string;
  Icon: IconType;
  accent: Accent;
}) {
  const state = usePlannerState(subject);
  const { done, total, pct } = progress(state);
  const a = ACCENTS[accent];

  return (
    <Link
      to="/dashboard/tables/$subject"
      params={{ subject }}
      className={`group rounded-2xl border-2 border-border bg-card p-5 transition ${a.ring}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${a.bg} ${a.text}`}
          >
            <Icon size={20} />
          </span>
          <div>
            <h3 className="font-bold text-foreground leading-tight">{title}</h3>
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <LuTable size={12} /> Past paper planner
            </p>
          </div>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${a.chip}`}>{pct}%</span>
      </div>

      <div className="mt-4">
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            className={`h-full ${a.bar}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {done} / {total} papers
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-foreground/80 group-hover:text-foreground">
            Open <LuArrowRight size={12} className="transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
