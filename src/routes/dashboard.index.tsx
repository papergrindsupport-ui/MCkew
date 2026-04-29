import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  LuSettings,
  LuLayoutDashboard,
  LuHeartHandshake,
  LuInfo,
  LuMessageSquare,
  LuCircleHelp,
  LuTable,
  LuLeaf,
  LuFlaskConical,
  LuAtom,
  LuFolderOpen,
  LuTriangleAlert,
  LuLogIn,
  LuCalendar,
  LuArrowRight,
} from "react-icons/lu";
import { useUser } from "@clerk/clerk-react";
import { PlannerCard } from "@/components/dashboard/PlannerCard";
import Navbar from "@/components/Navbar";
import { DashboardSettingsModal } from "@/components/DashboardSettingsModal";
import { AnalyticsSummary } from "@/components/analytics/AnalyticsSummary";
import { DailyChallengeSection } from "@/components/dashboard/DailyChallengeSection";
import { TodayAnalyticsSection } from "@/components/dashboard/TodayAnalyticsSection";
import { DailyGoalsSection } from "@/components/goals/DailyGoalsSection";
import { EditGoalsModal } from "@/components/goals/EditGoalsModal";
import { SignInModal } from "@/components/auth/SignInModal";

const MORE_PAGES = [
  {
    label: "Desk",
    to: "/dashboard/desk",
    description: "Folders, notes, saved questions and papers.",
    Icon: LuFolderOpen,
  },
  {
    label: "Volunteer",
    to: "/volunteer",
    description: "Apply to help build MCkew.",
    Icon: LuHeartHandshake,
  },
  { label: "About", to: "/about", description: "Learn what MCkew is for.", Icon: LuInfo },
  {
    label: "Feedback",
    to: "/feedback",
    description: "Send ideas, bugs, and suggestions.",
    Icon: LuMessageSquare,
  },
  {
    label: "Help",
    to: "/help",
    description: "Get quick guidance and support.",
    Icon: LuCircleHelp,
  },
] as const;

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "Dashboard — MCkew" },
      { name: "description", content: "Your personal dashboard." },
    ],
  }),
  component: DashboardHome,
});

function DashboardHome() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const { isLoaded, isSignedIn } = useUser();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {isLoaded && !isSignedIn && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start sm:items-center gap-3 p-3 sm:p-4 rounded-2xl border-2 border-amber-500/40 bg-amber-500/10"
          >
            <LuTriangleAlert
              className="shrink-0 mt-0.5 sm:mt-0 text-amber-600 dark:text-amber-400"
              size={18}
            />
            <p className="text-xs sm:text-sm text-foreground flex-1 leading-relaxed">
              You need to sign in to save your data across devices. Right now, your progress is only
              stored on this browser.
            </p>
            <button
              type="button"
              onClick={() => setSignInOpen(true)}
              className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors"
            >
              <LuLogIn size={12} /> Sign in
            </button>
          </motion.div>
          <SignInModal open={signInOpen} onOpenChange={setSignInOpen} />
        </div>
      )}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <div>
            <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-widest">
              <LuLayoutDashboard /> Dashboard
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mt-1">Your Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Track your progress and tweak your settings.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold border-2 border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition cursor-pointer"
          >
            <LuSettings size={14} /> Settings
          </button>
        </motion.header>

        <AnalyticsSummary />

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Link
            to="/planner"
            className="group relative block overflow-hidden rounded-3xl border-2 border-primary/40 bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 p-6 sm:p-8 transition hover:border-primary hover:shadow-xl"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 sm:gap-5">
                <span className="inline-flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg transition group-hover:scale-110">
                  <LuCalendar size={28} />
                </span>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-primary">
                    Plan your studying
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-foreground mt-1">
                    Open the Planner
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    Kanban, Gantt, countdowns, and tables — all in one place.
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-md transition group-hover:gap-3">
                Launch Planner <LuArrowRight size={16} />
              </span>
            </div>
          </Link>
        </motion.section>

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">Past paper planners</h2>
            <p className="text-sm text-muted-foreground">
              Track which past papers you've completed for each subject.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <PlannerCard subject="bio" title="Biology" Icon={LuLeaf} accent="emerald" />
            <PlannerCard subject="chem" title="Chemistry" Icon={LuFlaskConical} accent="violet" />
            <PlannerCard subject="phys" title="Physics" Icon={LuAtom} accent="sky" />
          </div>
        </section>

        <DailyGoalsSection onEdit={() => setGoalsOpen(true)} />

        <TodayAnalyticsSection />

        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">More pages</h2>
            <p className="text-sm text-muted-foreground">
              Jump to support, feedback, volunteering, and project info.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {MORE_PAGES.map(({ label, to, description, Icon }) => (
              <Link
                key={to}
                to={to}
                className="group rounded-2xl border-2 border-border bg-card p-4 transition hover:border-primary/50 hover:bg-primary/5"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon size={18} />
                </span>
                <h3 className="mt-3 font-bold text-foreground">{label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              </Link>
            ))}
          </div>
        </section>

        <DailyChallengeSection />
      </main>

      <DashboardSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <EditGoalsModal open={goalsOpen} onClose={() => setGoalsOpen(false)} />
    </div>
  );
}
