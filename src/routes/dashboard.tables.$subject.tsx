import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  LuArrowLeft,
  LuSettings,
  LuLeaf,
  LuFlaskConical,
  LuAtom,
  LuDownload,
} from "react-icons/lu";
import Navbar from "@/components/Navbar";
import { PlannerSettingsModal } from "@/components/dashboard/PlannerSettingsModal";
import { PlannerTable } from "@/components/dashboard/PlannerTable";
import { usePlannerState, progress, type Subject } from "@/lib/plannerStore";

const SUBJECT_META: Record<
  Subject,
  { title: string; Icon: typeof LuLeaf; color: string; bar: string }
> = {
  bio: {
    title: "Biology",
    Icon: LuLeaf,
    color: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
  },
  chem: {
    title: "Chemistry",
    Icon: LuFlaskConical,
    color: "text-violet-600 dark:text-violet-400",
    bar: "bg-violet-500",
  },
  phys: {
    title: "Physics",
    Icon: LuAtom,
    color: "text-sky-600 dark:text-sky-400",
    bar: "bg-sky-500",
  },
};

export const Route = createFileRoute("/dashboard/tables/$subject")({
  head: () => ({
    meta: [
      { title: "Past Paper Planner — MCkew" },
      { name: "description", content: "Plan and track your past papers." },
    ],
  }),
  component: PlannerPage,
});

function PlannerPage() {
  const { subject } = useParams({ from: "/dashboard/tables/$subject" });
  const sub = (["bio", "chem", "phys"].includes(subject) ? subject : "bio") as Subject;
  const meta = SUBJECT_META[sub];
  const state = usePlannerState(sub);
  const { done, total, pct } = useMemo(() => progress(state), [state]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const Icon = meta.Icon;

  return (
    <div className="min-h-screen bg-background planner-print-root">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 print:p-0 print:max-w-none print:space-y-4">
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold border-2 border-border hover:bg-muted transition print:hidden"
            >
              <LuArrowLeft size={14} /> Back
            </Link>
            <div>
              <div
                className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${meta.color} print:hidden`}
              >
                <Icon /> Planner
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold mt-1">{meta.title} past papers</h1>
              <p className="text-sm text-muted-foreground print:hidden">
                Tick off papers as you complete them.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold border-2 border-border bg-card hover:bg-muted transition cursor-pointer"
              title="Export as PDF"
            >
              <LuDownload size={14} /> Export PDF
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold border-2 border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition cursor-pointer"
            >
              <LuSettings size={14} /> Settings
            </button>
          </div>
        </motion.header>

        <section className="rounded-2xl border-2 border-border bg-card p-5 print:rounded-lg">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Progress
              </p>
              <p className="text-sm">
                <span className="font-bold text-foreground">{done}</span>{" "}
                <span className="text-muted-foreground">/ {total} papers completed</span>
              </p>
            </div>
            <span className="text-2xl font-bold tabular-nums">{pct}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
            <motion.div
              className={`h-full ${meta.bar}`}
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </section>

        <PlannerTable subject={sub} />
      </main>

      <PlannerSettingsModal
        subject={sub}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <style>{`
        @media print {
          @page { margin: 12mm; }
          html, body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
