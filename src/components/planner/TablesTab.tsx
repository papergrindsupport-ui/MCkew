// Tables tab — reuses PlannerTable from /dashboard with subject sub-tabs.

import { useState } from "react";
import { motion } from "framer-motion";
import { LuLeaf, LuFlaskConical, LuAtom } from "react-icons/lu";
import { PlannerTable } from "@/components/dashboard/PlannerTable";
import { usePlannerState, progress, type Subject } from "@/lib/plannerStore";
import { cn } from "@/lib/utils";

const SUBJECTS = [
  {
    id: "bio" as const,
    label: "Biology",
    Icon: LuLeaf,
    color: "text-emerald-500",
    bar: "bg-emerald-500",
  },
  {
    id: "chem" as const,
    label: "Chemistry",
    Icon: LuFlaskConical,
    color: "text-violet-500",
    bar: "bg-violet-500",
  },
  { id: "phys" as const, label: "Physics", Icon: LuAtom, color: "text-sky-500", bar: "bg-sky-500" },
];

export function TablesTab() {
  const [active, setActive] = useState<Subject>("bio");
  const meta = SUBJECTS.find((s) => s.id === active)!;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {SUBJECTS.map((s) => {
          const Icon = s.Icon;
          const isActive = s.id === active;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(s.id)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-bold transition cursor-pointer",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:border-foreground/30",
              )}
            >
              <Icon size={14} className={cn(!isActive && s.color)} />
              {s.label}
            </button>
          );
        })}
      </div>

      <SubjectProgress subject={active} bar={meta.bar} />

      <motion.div
        key={active}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <PlannerTable subject={active} />
      </motion.div>
    </div>
  );
}

function SubjectProgress({ subject, bar }: { subject: Subject; bar: string }) {
  const state = usePlannerState(subject);
  const { done, total, pct } = progress(state);
  return (
    <section className="rounded-2xl border-2 border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-sm">
          <span className="font-bold text-foreground">{done}</span>{" "}
          <span className="text-muted-foreground">/ {total} papers completed</span>
        </p>
        <span className="text-xl font-bold tabular-nums">{pct}%</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          className={cn("h-full", bar)}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
    </section>
  );
}
