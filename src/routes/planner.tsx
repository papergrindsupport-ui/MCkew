import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LuLayoutDashboard, LuTable, LuKanban, LuChartGantt, LuTimer } from "react-icons/lu";
import Navbar from "@/components/Navbar";
import { PlannerResourcesSidebar } from "@/components/planner/PlannerResourcesSidebar";
import { TablesTab } from "@/components/planner/TablesTab";
import { cn } from "@/lib/utils";

// Heavier tabs lazy-loaded so the page paints fast and only the chosen tab's
// JS is downloaded.
const KanbanTab = lazy(() =>
  import("@/components/planner/KanbanTab").then((m) => ({ default: m.KanbanTab })),
);
const GanttTab = lazy(() =>
  import("@/components/planner/GanttTab").then((m) => ({ default: m.GanttTab })),
);
const CountdownTab = lazy(() =>
  import("@/components/planner/CountdownTab").then((m) => ({ default: m.CountdownTab })),
);

type TabId = "tables" | "kanban" | "gantt" | "countdown";

const TABS: { id: TabId; label: string; Icon: typeof LuTable }[] = [
  { id: "tables", label: "Tables", Icon: LuTable },
  { id: "kanban", label: "Kanban", Icon: LuKanban },
  { id: "gantt", label: "Gantt chart", Icon: LuChartGantt },
  { id: "countdown", label: "Countdown", Icon: LuTimer },
];

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Planner — MCkew" },
      {
        name: "description",
        content:
          "Plan and track your study with past-paper tables, kanban boards, gantt charts and an exam countdown timer.",
      },
    ],
  }),
  component: PlannerPage,
});

function PlannerPage() {
  const [tab, setTab] = useState<TabId>("tables");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-widest">
            <LuLayoutDashboard /> Planner
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mt-1">Productivity hub</h1>
          <p className="text-sm text-muted-foreground">
            Tables, kanban, gantt and a session countdown — all in one place.
          </p>
        </motion.header>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-2 border-b-2 border-border pb-2">
          {TABS.map((t) => {
            const Icon = t.Icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition cursor-pointer",
                  active
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "bg-card border-2 border-border text-foreground hover:border-primary/50",
                )}
              >
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)_auto] items-start">
          <PlannerResourcesSidebar variant="papers" side="left" />
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="min-w-0"
            >
              <Suspense
                fallback={
                  <div className="rounded-2xl border-2 border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
                    Loading…
                  </div>
                }
              >
                {tab === "tables" && <TablesTab />}
                {tab === "kanban" && <KanbanTab />}
                {tab === "gantt" && <GanttTab />}
                {tab === "countdown" && <CountdownTab />}
              </Suspense>
            </motion.div>
          </AnimatePresence>
          <PlannerResourcesSidebar variant="lessons" side="right" />
        </div>
      </main>
    </div>
  );
}
