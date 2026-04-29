import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  useInView,
} from "framer-motion";
import {
  LuChartLine,
  LuChartBar,
  LuChartPie,
  LuTarget,
  LuTrendingUp,
  LuTrendingDown,
  LuMinus,
  LuFlame,
  LuCheck,
  LuX,
  LuBookOpen,
  LuTrophy,
  LuLayers,
  LuBrain,
  LuClock,
  LuArrowLeft,
  LuRefreshCw,
  LuCompass,
  LuMedal,
  LuActivity,
  LuSparkles,
  LuZap,
  LuStar,
  LuRocket,
} from "react-icons/lu";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  RadialBarChart,
  RadialBar,
  Legend,
} from "recharts";
import Navbar from "@/components/Navbar";
import { useAnalyticsStore } from "@/stores/useAnalyticsStore";
import {
  headline,
  byTopic,
  byLesson,
  bySkill,
  byDifficulty,
  bySubject,
  classify,
  timeSeries,
  rollingAccuracy,
  improvement,
  improvementBySkill,
  confidence,
  confidenceByTopic,
  detectZone,
  paperResults,
  paperBuckets,
  subjectsToRevise,
  daysActive,
  getQuestion,
  MIN_ATTEMPTS_FOR_TRENDS,
  MIN_DAYS_FOR_RATE,
  MIN_ATTEMPTS_PER_GROUP,
} from "@/lib/analytics";
import { SUBJECT_LABEL, getPaperById } from "@/data/paperData";
import { DIFFICULTY_COLORS } from "@/data/topics";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { TopicSummarySection } from "@/components/analytics/TopicSummarySection";
import { PencilsExplainer } from "@/components/PencilsExplainer";
import { AnalyticsSearchModal } from "@/components/analytics/AnalyticsSearchModal";
import { SingleQuestionPlayModal } from "@/components/SingleQuestionPlayModal";
import { useStreakStore, streaksByDay } from "@/stores/useStreakStore";
import { GoalsHistorySection } from "@/components/goals/GoalsHistorySection";

export const Route = createFileRoute("/dashboard/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — MCkew" },
      { name: "description", content: "Comprehensive performance analytics and insights." },
    ],
  }),
  component: AnalyticsPage,
});

const PALETTE = [
  "hsl(var(--primary))",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#0ea5e9",
  "#ec4899",
  "#22d3ee",
];

type TabKey = "overview" | "skills" | "papers" | "timeline";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <LuSparkles size={14} /> },
  { key: "skills", label: "Skills & Topics", icon: <LuBrain size={14} /> },
  { key: "papers", label: "Papers", icon: <LuTrophy size={14} /> },
  { key: "timeline", label: "Timeline", icon: <LuClock size={14} /> },
];

function AnalyticsPage() {
  const attempts = useAnalyticsStore((s) => s.attempts);
  const papers = useAnalyticsStore((s) => s.papers);
  const clearAll = useAnalyticsStore((s) => s.clearAll);
  const [bucket, setBucket] = useState<"day" | "week" | "month">("day");
  const [tab, setTab] = useState<TabKey>("overview");
  const [searchOpen, setSearchOpen] = useState(false);
  const [playQuestion, setPlayQuestion] = useState<any>(null);
  const [highlightTopic, setHighlightTopic] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const stats = useMemo(() => {
    const h = headline(attempts);
    return {
      h,
      byTopic: byTopic(attempts),
      byLesson: byLesson(attempts),
      bySkill: bySkill(attempts),
      byDiff: byDifficulty(attempts),
      bySub: bySubject(attempts),
      ts: timeSeries(attempts, bucket),
      roll: rollingAccuracy(attempts, 10),
      imp: improvement(attempts),
      impSkill: improvementBySkill(attempts),
      conf: confidence(attempts),
      confTopic: confidenceByTopic(attempts),
      zone: detectZone(attempts),
      papers: paperResults(papers),
      pb: paperBuckets(papers),
      revise: subjectsToRevise(attempts),
      days: daysActive(attempts),
    };
  }, [attempts, papers, bucket]);

  const skillClass = useMemo(() => classify(stats.bySkill), [stats.bySkill]);
  const topicClass = useMemo(() => classify(stats.byTopic), [stats.byTopic]);
  const lessonClass = useMemo(() => classify(stats.byLesson), [stats.byLesson]);

  const empty = stats.h.attempted === 0 && stats.papers.length === 0;
  const accuracyPct = Math.round(stats.h.accuracy * 100);

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Animated background gradient blobs */}
      <BackgroundBlobs />

      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 relative z-10">
        {/* Hero Header */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group"
            >
              <motion.span whileHover={{ x: -2 }} className="inline-flex items-center gap-1">
                <LuArrowLeft size={12} /> Dashboard
              </motion.span>
            </Link>
            <h1 className="text-3xl sm:text-5xl font-bold mt-1 flex items-center gap-2">
              <motion.span
                animate={{ rotate: [0, 8, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="inline-block"
              >
                <LuChartLine className="text-primary" />
              </motion.span>
              <span className="text-primary">Analytics</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Every question, every paper, every skill — beautifully visualized.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-full border-2 border-border overflow-hidden text-xs font-bold bg-card shadow-sm">
              {(["day", "week", "month"] as const).map((b) => (
                <motion.button
                  key={b}
                  type="button"
                  onClick={() => setBucket(b)}
                  whileTap={{ scale: 0.95 }}
                  className={`px-3 py-1.5 cursor-pointer transition relative ${
                    bucket === b ? "text-primary-foreground" : "hover:bg-muted/60 text-foreground"
                  }`}
                >
                  {bucket === b && (
                    <motion.span
                      layoutId="bucket-pill"
                      className="absolute inset-0 bg-primary rounded-none"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 capitalize">{b}</span>
                </motion.button>
              ))}
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (confirm("Clear ALL analytics data? This cannot be undone.")) {
                  clearAll();
                  toast.success("Analytics cleared");
                }
              }}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold border-2 border-border bg-card hover:border-red-400/60 hover:text-red-500 cursor-pointer transition shadow-sm"
            >
              <LuRefreshCw size={12} /> Reset
            </motion.button>
          </div>
        </motion.header>

        {empty ? (
          <EmptyState />
        ) : (
          <>
            {/* HERO: Big accuracy gauge + key tiles */}
            <section className="grid lg:grid-cols-5 gap-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 22 }}
                className="lg:col-span-2 rounded-3xl border-2 border-border/60 bg-card p-6 relative overflow-hidden group"
              >
                <ShimmerOverlay />
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-primary">
                  <LuTarget size={14} /> Accuracy
                </div>
                <div className="flex items-center gap-6 mt-3">
                  <AccuracyGauge percent={accuracyPct} />
                  <div className="space-y-2">
                    <div>
                      <div className="text-5xl font-bold tabular-nums">
                        <Counter value={accuracyPct} />
                        <span className="text-2xl text-muted-foreground">%</span>
                      </div>
                      <div className="text-xs text-muted-foreground font-semibold">
                        <Counter value={stats.h.correct} /> correct of{" "}
                        <Counter value={stats.h.attempted} />
                      </div>
                    </div>
                    <ZoneBadge zone={stats.zone} />
                  </div>
                </div>
              </motion.div>

              <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Tile
                  label="Attempted"
                  value={stats.h.attempted}
                  icon={<LuTarget />}
                  delay={0.05}
                />
                <Tile
                  label="Correct"
                  value={stats.h.correct}
                  sub={`${accuracyPct}%`}
                  icon={<LuCheck />}
                  tone="emerald"
                  delay={0.1}
                />
                <Tile
                  label="Wrong"
                  value={stats.h.wrong}
                  sub={`${Math.round(stats.h.wrongPct * 100)}%`}
                  icon={<LuX />}
                  tone="red"
                  delay={0.15}
                />
                <Tile
                  label="Days active"
                  value={stats.days}
                  icon={<LuClock />}
                  tone="violet"
                  delay={0.2}
                />
                <Tile
                  label="Papers"
                  value={stats.pb.attempted}
                  sub={`${stats.pb.submitted} submitted`}
                  icon={<LuBookOpen />}
                  tone="sky"
                  delay={0.25}
                />
                <Tile
                  label="Passed"
                  value={stats.pb.passed}
                  sub={`${stats.pb.failed} failed`}
                  icon={<LuTrophy />}
                  tone="emerald"
                  delay={0.3}
                />
                <Tile
                  label="Marks earned"
                  value={stats.pb.totalMarks}
                  icon={<LuMedal />}
                  tone="violet"
                  delay={0.35}
                />
                <Tile
                  label="Confidence"
                  value={stats.conf.enoughData ? stats.conf.score : "—"}
                  sub={
                    stats.conf.enoughData
                      ? `${stats.conf.avgChanges.toFixed(1)} chg/q`
                      : "more data"
                  }
                  icon={<LuBrain />}
                  tone="amber"
                  delay={0.4}
                />
              </div>
            </section>

            {/* Status pills row */}
            <section className="flex flex-wrap gap-2">
              <TrendPill imp={stats.imp} />
              <ConfidencePill conf={stats.conf} />
              {stats.h.attempted < MIN_ATTEMPTS_FOR_TRENDS && (
                <DataNotePill>Trends need at least {MIN_ATTEMPTS_FOR_TRENDS} attempts</DataNotePill>
              )}
              {stats.days < MIN_DAYS_FOR_RATE && (
                <DataNotePill>
                  Improvement rate needs {MIN_DAYS_FOR_RATE}+ days of practice
                </DataNotePill>
              )}
            </section>

            {/* Tab nav */}
            <nav className="flex gap-1.5 p-1.5 rounded-2xl border-2 border-border/60 bg-card overflow-x-auto">
              {TABS.map((t) => (
                <motion.button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  whileTap={{ scale: 0.96 }}
                  className={`relative flex-1 min-w-fit px-4 py-2 rounded-xl text-xs sm:text-sm font-bold cursor-pointer transition flex items-center justify-center gap-1.5 ${
                    tab === t.key ? "text-primary-foreground" : "text-foreground hover:bg-muted/60"
                  }`}
                >
                  {tab === t.key && (
                    <motion.span
                      layoutId="tab-pill"
                      className="absolute inset-0 bg-primary rounded-xl shadow-lg"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 inline-flex items-center gap-1.5">
                    {t.icon}
                    {t.label}
                  </span>
                </motion.button>
              ))}
            </nav>

            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {tab === "overview" && <OverviewTab stats={stats} bucket={bucket} />}
                {tab === "skills" && (
                  <SkillsTab
                    stats={stats}
                    skillClass={skillClass}
                    topicClass={topicClass}
                    lessonClass={lessonClass}
                  />
                )}
                {tab === "papers" && <PapersTab stats={stats} />}
                {tab === "timeline" && (
                  <>
                    <Card title="Exam replay timeline" icon={<LuClock />} accent="violet">
                      <ExamReplayTimeline onPlayQuestion={setPlayQuestion} />
                    </Card>
                    <StreaksByDaySection />
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Topic summary — drill-in from search */}
            <TopicSummarySection highlightKey={highlightTopic} />

            <GoalsHistorySection />

            {/* How pencils work */}
            <PencilsExplainer />
          </>
        )}
      </main>

      {/* Search modal (Cmd/Ctrl+K) */}
      <AnalyticsSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onPickSection={(id: string) => {
          if (id === "overview" || id === "skills" || id === "papers" || id === "timeline") {
            setTab(id);
          } else if (id === "topic-summary") {
            document.getElementById("topic-summary-anchor")?.scrollIntoView({ behavior: "smooth" });
          } else if (id === "pencils-explainer") {
            document
              .getElementById("pencils-explainer-anchor")
              ?.scrollIntoView({ behavior: "smooth" });
          }
        }}
        onPickTopic={(key: string) => {
          setHighlightTopic(key);
          setTimeout(() => {
            document
              .getElementById(`topic-row-${key}`)
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 50);
        }}
        onPickQuestion={(q: any) => setPlayQuestion(q)}
      />

      {/* Play-mode single-question overlay */}
      {playQuestion && (
        <SingleQuestionPlayModal question={playQuestion} onClose={() => setPlayQuestion(null)} />
      )}
    </div>
  );
}

const SUBJECT_STYLES: Record<string, { label: string; cls: string }> = {
  bio: {
    label: "Biology",
    cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-400/40",
  },
  chem: {
    label: "Chemistry",
    cls: "bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-400/40",
  },
  phys: { label: "Physics", cls: "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-400/40" },
  mixed: {
    label: "Mixed",
    cls: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-400/40",
  },
  unknown: { label: "—", cls: "bg-muted text-muted-foreground border-border" },
};

function StreaksByDaySection() {
  const history = useStreakStore((s) => s.history);
  const [range, setRange] = useState<"week" | "month" | "all">("week");

  const filteredHistory = useMemo(() => {
    if (range === "all") return history;
    const days = range === "week" ? 7 : 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return history.filter((r) => r.endedAt >= cutoff);
  }, [history, range]);

  const rows = useMemo(() => streaksByDay(filteredHistory), [filteredHistory]);

  const total = useMemo(
    () => ({
      streaks: filteredHistory.length,
      points: filteredHistory.reduce((s, r) => s + r.points, 0),
      pencils: filteredHistory.reduce((s, r) => s + r.pencils, 0),
    }),
    [filteredHistory],
  );

  return (
    <div className="rounded-2xl border-2 border-border/60 bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <LuFlame size={14} />
        </div>
        <h3 className="text-sm font-bold">Streaks by day</h3>
        <div className="ml-auto inline-flex rounded-lg border-2 border-border/60 overflow-hidden">
          {(["week", "month", "all"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider cursor-pointer transition",
                range === r
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {r === "week" ? "Week" : r === "month" ? "Month" : "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Totals strip */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-xl border-2 border-border/60 bg-background p-2 text-center">
          <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Streaks
          </div>
          <div className="text-lg font-bold tabular-nums">{total.streaks}</div>
        </div>
        <div className="rounded-xl border-2 border-border/60 bg-background p-2 text-center">
          <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Points
          </div>
          <div className="text-lg font-bold tabular-nums">{total.points}</div>
        </div>
        <div className="rounded-xl border-2 border-border/60 bg-background p-2 text-center">
          <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Pencils
          </div>
          <div className="text-lg font-bold tabular-nums text-primary">+{total.pencils}</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-xs text-muted-foreground py-6 text-center border-2 border-dashed border-border/60 rounded-xl">
          No streaks in this range. Get 3 correct answers in a row to start one.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.day} className="rounded-xl border-2 border-border/60 bg-background p-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-sm font-bold">{r.day}</div>
                <div className="text-[11px] text-muted-foreground font-semibold tabular-nums">
                  {r.count} streak{r.count === 1 ? "" : "s"} · {r.totalPoints} pts · +
                  {r.totalPencils} pencils
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {r.streaks.map((s, i) => {
                  const subj = SUBJECT_STYLES[s.subject ?? "unknown"] ?? SUBJECT_STYLES.unknown;
                  return (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border-2 border-primary/40 bg-primary/10 text-primary tabular-nums"
                      title={`${subj.label} · ${s.points} pts · +${s.pencils} pencils`}
                    >
                      <LuFlame size={10} /> {s.points} pts · +{s.pencils}
                      <span
                        className={cn(
                          "inline-flex items-center px-1.5 py-[1px] rounded-md text-[9px] font-bold uppercase tracking-wider border",
                          subj.cls,
                        )}
                      >
                        {subj.label}
                      </span>
                    </span>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ========================== TABS ========================== */

function OverviewTab({ stats, bucket }: { stats: any; bucket: string }) {
  return (
    <>
      <section className="grid lg:grid-cols-2 gap-4">
        <Card title="Subject mastery rings" icon={<LuLayers />} accent="emerald" delay={0}>
          <ResponsiveContainer width="100%" height={260}>
            <RadialBarChart
              innerRadius="20%"
              outerRadius="100%"
              data={ringsData(stats.bySub)}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar
                background
                dataKey="value"
                cornerRadius={8}
                isAnimationActive
                animationDuration={1200}
              />
              <Legend
                iconSize={8}
                wrapperStyle={{ fontSize: 11 }}
                formatter={(v) => <span className="text-foreground">{v}</span>}
              />
              <Tooltip contentStyle={chartTooltipStyle} />
            </RadialBarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Difficulty distribution" icon={<LuChartPie />} accent="amber" delay={0.1}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData(stats.byDiff)}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={3}
                isAnimationActive
                animationDuration={1100}
                label={(e) => `${e.name}`}
              >
                {pieData(stats.byDiff).map((_, i) => (
                  <Cell
                    key={i}
                    fill={PALETTE[i % PALETTE.length]}
                    stroke="hsl(var(--card))"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </section>

      <section className="grid lg:grid-cols-2 gap-4">
        <Card title={`Activity per ${bucket}`} icon={<LuActivity />} accent="primary">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={stats.ts}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Area
                type="monotone"
                dataKey="attempted"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="hsl(var(--primary))"
                fillOpacity={0.25}
                isAnimationActive
                animationDuration={900}
              />
              <Area
                type="monotone"
                dataKey="correct"
                stroke="#10b981"
                strokeWidth={2}
                fill="#10b981"
                fillOpacity={0.2}
                isAnimationActive
                animationDuration={1100}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Accuracy over time (rolling 10)" icon={<LuTrendingUp />} accent="emerald">
          {stats.roll.length < 5 ? (
            <Note>Need at least 5 attempts to plot a rolling accuracy curve.</Note>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={stats.roll}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="i" tick={{ fontSize: 10 }} />
                <YAxis
                  domain={[0, 1]}
                  tickFormatter={(v) => `${Math.round(v * 100)}%`}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(v: unknown) => [`${Math.round(Number(v) * 100)}%`, "Accuracy"]}
                />
                <Line
                  type="monotone"
                  dataKey="acc"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={false}
                  isAnimationActive
                  animationDuration={1200}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <Card title="Subjects you need to revise" icon={<LuTrendingDown />} accent="red">
          {stats.revise.weakest.length === 0 ? (
            <Note>Need {MIN_ATTEMPTS_PER_GROUP}+ attempts per subject.</Note>
          ) : (
            <div className="space-y-3">
              {stats.revise.weakest.map((s: any, i: number) => (
                <SubjectStrengthBar key={s.key} stat={s} tone="red" delay={i * 0.1} />
              ))}
            </div>
          )}
        </Card>
        <Card title="Subjects you're strong at" icon={<LuTrophy />} accent="emerald">
          {stats.revise.strongest.length === 0 ? (
            <Note>Need {MIN_ATTEMPTS_PER_GROUP}+ attempts per subject.</Note>
          ) : (
            <div className="space-y-3">
              {stats.revise.strongest.map((s: any, i: number) => (
                <SubjectStrengthBar key={s.key} stat={s} tone="emerald" delay={i * 0.1} />
              ))}
            </div>
          )}
        </Card>
      </section>
    </>
  );
}

function SkillsTab({
  stats,
  skillClass,
  topicClass,
  lessonClass,
}: {
  stats: any;
  skillClass: any;
  topicClass: any;
  lessonClass: any;
}) {
  return (
    <>
      <section className="grid lg:grid-cols-2 gap-4">
        <Card title="Performance by topic" icon={<LuBookOpen />} accent="primary">
          <GroupBars data={stats.byTopic} />
        </Card>
        <Card title="Performance by skill" icon={<LuBrain />} accent="violet">
          <GroupBars data={stats.bySkill} />
        </Card>
        <Card title="Performance by lesson" icon={<LuLayers />} accent="emerald">
          <GroupBars data={stats.byLesson} />
        </Card>
        <Card title="Performance by difficulty" icon={<LuChartBar />} accent="amber">
          <GroupBars data={stats.byDiff} />
        </Card>
      </section>

      <section className="grid lg:grid-cols-3 gap-4">
        <ChecklistCard
          title="Skills you're strong at"
          icon={<LuStar />}
          items={skillClass.strong}
          tone="emerald"
          emptyMsg={`Need ${MIN_ATTEMPTS_PER_GROUP}+ attempts in a skill to qualify.`}
        />
        <ChecklistCard
          title="Skills to focus on"
          icon={<LuZap />}
          items={skillClass.weak}
          tone="red"
          emptyMsg="No weak skills detected — keep at it!"
        />
        <ChecklistCard
          title="Topics to revise"
          icon={<LuFlame />}
          items={topicClass.weak}
          tone="amber"
          emptyMsg="No weak topics detected."
        />
        <ChecklistCard
          title="Strong topics"
          icon={<LuTrophy />}
          items={topicClass.strong}
          tone="emerald"
          emptyMsg="Build up topic mastery!"
        />
        <ChecklistCard
          title="Strong lessons"
          icon={<LuMedal />}
          items={lessonClass.strong}
          tone="emerald"
          emptyMsg="Build up lesson mastery!"
        />
        <ChecklistCard
          title="Lessons to revise"
          icon={<LuFlame />}
          items={lessonClass.weak}
          tone="amber"
          emptyMsg="No weak lessons detected."
        />
      </section>

      <Card title="Improvement rate per skill" icon={<LuTrendingUp />} accent="emerald">
        {Object.keys(stats.impSkill).length === 0 ? (
          <Note>Need {MIN_ATTEMPTS_FOR_TRENDS}+ attempts per skill to estimate improvement.</Note>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.entries(stats.impSkill).map(([k, info], i) => {
              const skLabel = stats.bySkill.find((s: any) => s.key === k)?.label ?? k;
              return (
                <ImprovementChip key={k} label={skLabel} info={info as any} delay={i * 0.04} />
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Confidence per topic" icon={<LuBrain />} accent="violet">
        <p className="text-xs text-muted-foreground mb-3">Fewer answer changes = more confident</p>
        {stats.confTopic.length === 0 ? (
          <Note>Answer some questions to estimate confidence.</Note>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(180, stats.confTopic.length * 36)}>
            <BarChart data={stats.confTopic} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
              <YAxis dataKey="label" type="category" tick={{ fontSize: 10 }} width={80} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(v: unknown) => [`${v}/100`, "Confidence"]}
              />
              <Bar
                dataKey="strength"
                fill="hsl(var(--primary))"
                radius={[0, 8, 8, 0]}
                isAnimationActive
                animationDuration={1100}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </>
  );
}

function PapersTab({ stats }: { stats: any }) {
  return (
    <>
      <section className="grid md:grid-cols-4 gap-3">
        <Tile label="Papers attempted" value={stats.pb.attempted} icon={<LuBookOpen />} delay={0} />
        <Tile
          label="Submitted"
          value={stats.pb.submitted}
          icon={<LuCheck />}
          tone="sky"
          delay={0.05}
        />
        <Tile
          label="Passed"
          value={stats.pb.passed}
          sub={`${stats.pb.failed} failed`}
          tone="emerald"
          icon={<LuTrophy />}
          delay={0.1}
        />
        <Tile
          label="Total marks"
          value={stats.pb.totalMarks}
          icon={<LuMedal />}
          tone="violet"
          delay={0.15}
        />
      </section>

      <section className="grid lg:grid-cols-2 gap-4">
        <Card title="Papers per subject" icon={<LuChartBar />} accent="primary">
          {stats.pb.bySubject.length === 0 ? (
            <Note>Submit a paper to see this.</Note>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.pb.bySubject}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="passed"
                  stackId="a"
                  fill="#10b981"
                  radius={[0, 0, 0, 0]}
                  isAnimationActive
                  animationDuration={900}
                />
                <Bar
                  dataKey="failed"
                  stackId="a"
                  fill="#ef4444"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive
                  animationDuration={1000}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card title="Papers per difficulty" icon={<LuFlame />} accent="amber">
          {stats.pb.byDifficulty.length === 0 ? (
            <Note>Submit a paper to see this.</Note>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.pb.byDifficulty}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="key" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="passed"
                  stackId="a"
                  fill="#10b981"
                  radius={[0, 0, 0, 0]}
                  isAnimationActive
                  animationDuration={900}
                />
                <Bar
                  dataKey="failed"
                  stackId="a"
                  fill="#ef4444"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive
                  animationDuration={1000}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </section>

      <Card title="Recent papers" icon={<LuRocket />} accent="violet">
        {stats.papers.length === 0 ? (
          <Note>No submitted papers yet.</Note>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.papers.slice(0, 9).map((p: any, i: number) => (
              <PaperResultCard key={p.paperId + p.ts} result={p} delay={i * 0.05} />
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

/* ========================== UI BITS ========================== */

function BackgroundBlobs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-primary/15 blur-3xl"
      />
      <motion.div
        animate={{ x: [0, -50, 0], y: [0, 40, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/3 -right-20 w-96 h-96 rounded-full bg-fuchsia-500/10 blur-3xl"
      />
      <motion.div
        animate={{ x: [0, 30, 0], y: [0, -30, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full bg-violet-500/10 blur-3xl"
      />
    </div>
  );
}

function ShimmerOverlay() {
  return (
    <motion.div
      aria-hidden
      initial={{ x: "-150%" }}
      animate={{ x: "150%" }}
      transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }}
      className="absolute inset-y-0 -left-1/2 w-1/2 bg-foreground/10 skew-x-12 pointer-events-none"
    />
  );
}

function Counter({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 80, damping: 18, duration: duration * 1000 });
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString());

  useEffect(() => {
    if (inView) mv.set(value);
  }, [inView, value, mv]);

  return <motion.span ref={ref}>{display}</motion.span>;
}

function AccuracyGauge({ percent }: { percent: number }) {
  const size = 140;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ref = useRef<SVGSVGElement | null>(null);
  const inView = useInView(ref, { once: true });
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg ref={ref} width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={stroke}
          opacity={0.4}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: inView ? c - (c * percent) / 100 : c }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      </svg>
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <LuTarget className="text-primary" size={28} />
      </motion.div>
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  icon,
  tone = "primary",
  delay = 0,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon?: React.ReactNode;
  tone?: "primary" | "emerald" | "red" | "violet" | "amber" | "sky";
  delay?: number;
}) {
  const colorMap = {
    primary: "bg-primary/10 text-primary border-primary/30",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    red: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
  }[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 220, damping: 22 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className={`relative rounded-2xl border-2 p-4 cursor-default group overflow-hidden ${colorMap}`}
    >
      <motion.div
        className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-current opacity-10 blur-2xl"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay }}
      />
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider opacity-90 relative">
        <motion.span whileHover={{ rotate: 15 }}>{icon}</motion.span>
        {label}
      </div>
      <div className="text-3xl font-bold mt-1 text-foreground tabular-nums relative">
        {typeof value === "number" ? <Counter value={value} /> : value}
      </div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5 relative">{sub}</div>}
    </motion.div>
  );
}

function Card({
  title,
  icon,
  children,
  className = "",
  accent = "primary",
  delay = 0,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  accent?: "primary" | "emerald" | "amber" | "red" | "violet" | "sky";
  delay?: number;
}) {
  const accentMap = {
    primary: "text-primary",
    emerald: "text-emerald-500",
    amber: "text-amber-500",
    red: "text-red-500",
    violet: "text-violet-500",
    sky: "text-sky-500",
  }[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ delay, type: "spring", stiffness: 200, damping: 24 }}
      whileHover={{ y: -2 }}
      className={`rounded-2xl border-2 border-border/60 bg-card p-4 sm:p-5 hover:border-border transition-colors hover:shadow-lg ${className}`}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon && (
          <motion.span
            whileHover={{ rotate: 12, scale: 1.15 }}
            className={`inline-flex items-center justify-center w-8 h-8 rounded-xl bg-current/10 ${accentMap}`}
          >
            <span className={accentMap}>{icon}</span>
          </motion.span>
        )}
        <h3 className="text-sm font-bold">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs text-muted-foreground py-6 text-center border-2 border-dashed border-border/60 rounded-xl">
      {children}
    </div>
  );
}

function GroupBars({
  data,
}: {
  data: { key: string; label: string; attempted: number; correct: number; strength: number }[];
}) {
  if (data.length === 0) return <Note>No data yet.</Note>;
  const chartData = data.slice(0, 12).map((d) => ({
    label: d.label,
    correct: d.correct,
    wrong: d.attempted - d.correct,
    strength: d.strength,
  }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 32)}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
        <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
        <XAxis type="number" tick={{ fontSize: 10 }} />
        <YAxis dataKey="label" type="category" tick={{ fontSize: 10 }} width={80} />
        <Tooltip
          contentStyle={chartTooltipStyle}
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar
          dataKey="correct"
          stackId="a"
          fill="#10b981"
          radius={[0, 0, 0, 0]}
          isAnimationActive
          animationDuration={1000}
        />
        <Bar
          dataKey="wrong"
          stackId="a"
          fill="#ef4444"
          radius={[0, 8, 8, 0]}
          isAnimationActive
          animationDuration={1100}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ChecklistCard({
  title,
  icon,
  items,
  tone,
  emptyMsg,
}: {
  title: string;
  icon?: React.ReactNode;
  items: { key: string; label: string; strength: number; attempted: number }[];
  tone: "emerald" | "red" | "amber";
  emptyMsg: string;
}) {
  const ring = {
    emerald: "border-emerald-400/40 bg-emerald-500/10",
    red: "border-red-400/40 bg-red-500/10",
    amber: "border-amber-400/40 bg-amber-500/10",
  }[tone];
  const dot = {
    emerald: "bg-emerald-500",
    red: "bg-red-500",
    amber: "bg-amber-500",
  }[tone];
  const iconColor = {
    emerald: "text-emerald-500",
    red: "text-red-500",
    amber: "text-amber-500",
  }[tone];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-30px" }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className={`rounded-2xl border-2 ${ring} bg-card p-4 hover:shadow-lg transition-shadow`}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon && <span className={iconColor}>{icon}</span>}
        <h3 className="text-sm font-bold">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyMsg}</p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 6).map((it, i) => (
            <motion.li
              key={it.key}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ x: 3 }}
              className="flex items-center gap-2 group cursor-default"
            >
              <motion.span
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                className={`w-2 h-2 rounded-full ${dot} shadow-sm`}
              />
              <span className="text-sm font-semibold flex-1 truncate group-hover:text-primary transition-colors">
                {it.label}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                {it.strength}/100 · {it.attempted}q
              </span>
            </motion.li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

function SubjectStrengthBar({
  stat,
  tone,
  delay = 0,
}: {
  stat: { key: string; label: string; strength: number; attempted: number; correct: number };
  tone: "emerald" | "red";
  delay?: number;
}) {
  const color = tone === "emerald" ? "bg-emerald-500" : "bg-red-500";
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
    >
      <div className="flex justify-between text-xs font-bold mb-1">
        <span>{stat.label}</span>
        <span className="text-muted-foreground font-mono tabular-nums">
          {stat.strength}/100 · {stat.correct}/{stat.attempted}
        </span>
      </div>
      <div className="h-3 rounded-full bg-muted overflow-hidden relative">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${stat.strength}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, delay: delay + 0.1, ease: "easeOut" }}
          className={`h-full ${color}`}
        />
      </div>
    </motion.div>
  );
}

function ImprovementChip({
  label,
  info,
  delay = 0,
}: {
  label: string;
  info: { slope: number; direction: "up" | "down" | "flat"; enoughData: boolean };
  delay?: number;
}) {
  const Icon =
    info.direction === "up" ? LuTrendingUp : info.direction === "down" ? LuTrendingDown : LuMinus;
  const color = !info.enoughData
    ? "text-muted-foreground border-border bg-muted"
    : info.direction === "up"
      ? "text-emerald-600 dark:text-emerald-400 border-emerald-400/40 bg-emerald-500/10"
      : info.direction === "down"
        ? "text-red-600 dark:text-red-400 border-red-400/40 bg-red-500/10"
        : "text-muted-foreground border-border bg-muted";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      whileHover={{ y: -2, scale: 1.02 }}
      className={`rounded-xl border-2 px-3 py-2 cursor-default ${color}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold truncate">{label}</span>
        <motion.span
          animate={
            info.direction === "up"
              ? { y: [0, -2, 0] }
              : info.direction === "down"
                ? { y: [0, 2, 0] }
                : {}
          }
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Icon size={14} />
        </motion.span>
      </div>
      <div className="text-[10px] mt-0.5 font-mono">
        {info.enoughData ? `${(info.slope * 100).toFixed(2)} pp/attempt` : "Need more data"}
      </div>
    </motion.div>
  );
}

function ZoneBadge({ zone }: { zone: ReturnType<typeof detectZone> }) {
  if (zone.kind === "insufficient")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-muted text-muted-foreground border border-border">
        Insufficient data
      </span>
    );
  const meta = {
    comfort: {
      label: "Comfort zone",
      color: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/50",
      icon: <LuFlame size={10} />,
    },
    overconfidence: {
      label: "Over-confident",
      color: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-400/50",
      icon: <LuFlame size={10} />,
    },
    balanced: {
      label: "Balanced",
      color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/50",
      icon: <LuCheck size={10} />,
    },
  }[zone.kind];
  return (
    <motion.span
      whileHover={{ scale: 1.05 }}
      title={"reason" in zone ? zone.reason : ""}
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border-2 ${meta.color}`}
    >
      {meta.icon}
      {meta.label}
    </motion.span>
  );
}

function TrendPill({ imp }: { imp: ReturnType<typeof improvement> }) {
  if (!imp.enoughData)
    return (
      <BigPill tone="muted" title="Trend">
        Need {MIN_ATTEMPTS_FOR_TRENDS}+ attempts to detect a trend
      </BigPill>
    );
  const Icon =
    imp.direction === "up" ? LuTrendingUp : imp.direction === "down" ? LuTrendingDown : LuMinus;
  const tone = imp.direction === "up" ? "emerald" : imp.direction === "down" ? "red" : "muted";
  return (
    <BigPill icon={<Icon size={12} />} tone={tone as any} title="Trend">
      Accuracy{" "}
      {imp.direction === "up" ? "improving" : imp.direction === "down" ? "declining" : "stable"} (
      {(imp.slope * 100).toFixed(2)} pp/attempt)
    </BigPill>
  );
}

function ConfidencePill({ conf }: { conf: ReturnType<typeof confidence> }) {
  if (!conf.enoughData)
    return (
      <BigPill tone="muted" title="Confidence">
        Need more attempts to score confidence
      </BigPill>
    );
  const tone = conf.score >= 70 ? "emerald" : conf.score >= 40 ? "amber" : "red";
  return (
    <BigPill icon={<LuBrain size={12} />} tone={tone as any} title="Confidence">
      {conf.score}/100 · {conf.avgChanges.toFixed(1)} changes/q on average
    </BigPill>
  );
}

function DataNotePill({ children }: { children: React.ReactNode }) {
  return (
    <BigPill tone="muted" title="ℹ︎">
      {children}
    </BigPill>
  );
}

function BigPill({
  children,
  tone,
  icon,
  title,
}: {
  children: React.ReactNode;
  tone: "amber" | "red" | "emerald" | "muted";
  icon?: React.ReactNode;
  title: string;
}) {
  const cls = {
    amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/50",
    red: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-400/50",
    emerald: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/50",
    muted: "bg-muted text-muted-foreground border-border",
  }[tone];
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05, y: -2 }}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 cursor-default shadow-sm ${cls}`}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{title}</span>
      <span className="text-xs font-semibold">{children}</span>
    </motion.span>
  );
}

function PaperResultCard({ result, delay = 0 }: { result: any; delay?: number }) {
  const meta = getPaperById(result.paperId);
  const pct = Math.round(result.pct * 100);
  const tone = result.passed ? "emerald" : "red";
  const ring =
    tone === "emerald"
      ? "border-emerald-400/40 bg-emerald-500/10"
      : "border-red-400/40 bg-red-500/10";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, type: "spring", stiffness: 200, damping: 20 }}
      whileHover={{ y: -3, scale: 1.02 }}
      className={`rounded-2xl border-2 ${ring} bg-card p-3 hover:shadow-lg transition-shadow`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {meta?.subject ? SUBJECT_LABEL[meta.subject] : "Paper"}
        </span>
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${result.passed ? "border-emerald-400/40 text-emerald-600 dark:text-emerald-400" : "border-red-400/40 text-red-600 dark:text-red-400"}`}
        >
          {result.passed ? "PASS" : "FAIL"}
        </span>
      </div>
      <div className="text-sm font-bold truncate">{meta?.title ?? result.paperId}</div>
      <div className="flex items-end justify-between mt-2">
        <div>
          <div className="text-2xl font-bold tabular-nums">
            <Counter value={result.marks} />
            <span className="text-sm text-muted-foreground">/{result.total}</span>
          </div>
          <div className="text-[10px] text-muted-foreground">Grade {result.grade}</div>
        </div>
        <div className="text-right">
          <div
            className={`text-xl font-bold tabular-nums ${result.passed ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
          >
            {pct}%
          </div>
          <Link
            to="/smart-solve-papers/$paperId"
            params={{ paperId: result.paperId }}
            className="text-[10px] font-bold text-primary hover:underline"
          >
            Open →
          </Link>
        </div>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: delay + 0.2 }}
          className={`h-full ${result.passed ? "bg-emerald-500" : "bg-red-500"}`}
        />
      </div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-3xl border-2 border-dashed border-border/60 p-12 flex flex-col items-center gap-4 text-center bg-card/50"
    >
      <motion.div
        animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="w-20 h-20 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg"
      >
        <LuChartLine size={32} />
      </motion.div>
      <h3 className="text-2xl font-bold">No analytics yet</h3>
      <p className="text-sm text-muted-foreground max-w-md">
        Solve a few questions and submit a paper to start building your dashboard. Improvement
        trends and confidence scores need at least {MIN_ATTEMPTS_FOR_TRENDS} attempts and{" "}
        {MIN_DAYS_FOR_RATE} days to be meaningful.
      </p>
      <Link to="/smart-solve-papers">
        <motion.span
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.97 }}
          className="inline-flex items-center gap-1 rounded-full px-5 py-2.5 text-sm font-bold bg-primary text-primary-foreground cursor-pointer shadow-lg"
        >
          <LuBookOpen size={14} /> Browse papers
        </motion.span>
      </Link>
    </motion.div>
  );
}

/* ========================== TIMELINE ========================== */

function ExamReplayTimeline({ onPlayQuestion }: { onPlayQuestion: (q: any) => void }) {
  const attempts = useAnalyticsStore((s) => s.attempts);
  const papers = useAnalyticsStore((s) => s.papers);
  const events = useMemo(() => {
    type T =
      | { kind: "q"; ts: number; questionId: string; paperId: string; isCorrect: boolean }
      | {
          kind: "paper";
          ts: number;
          paperId: string;
          subKind: "attempt" | "submit";
          marks?: number;
          total?: number;
        };
    const list: T[] = [];
    for (const a of attempts)
      list.push({
        kind: "q",
        ts: a.ts,
        questionId: a.questionId,
        paperId: a.paperId,
        isCorrect: a.isCorrect,
      });
    for (const p of papers)
      list.push({
        kind: "paper",
        ts: p.ts,
        paperId: p.paperId,
        subKind: p.kind,
        marks: p.marks,
        total: p.total,
      });
    return list.sort((a, b) => b.ts - a.ts).slice(0, 80);
  }, [attempts, papers]);

  if (events.length === 0) return <Note>Your activity timeline will appear here.</Note>;

  return (
    <div className="relative pl-6 max-h-[600px] overflow-y-auto pr-2 custom-scroll">
      <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
      <ul className="space-y-2">
        {events.map((e, i) => {
          const date = new Date(e.ts);
          const dateStr = date.toLocaleString();
          if (e.kind === "paper") {
            const meta = getPaperById(e.paperId);
            return (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.6) }}
                whileHover={{ x: 4 }}
                className="relative"
              >
                <motion.span
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                  className={`absolute -left-[18px] top-3 w-3 h-3 rounded-full border-2 border-background shadow ${
                    e.subKind === "submit" ? "bg-violet-500" : "bg-sky-500"
                  }`}
                />
                <div className="rounded-xl border-2 border-border/60 bg-background p-2.5 flex items-center gap-2 hover:border-violet-400/60 transition-colors">
                  <LuTrophy size={14} className="text-violet-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate">
                      {e.subKind === "submit" ? "Submitted" : "Attempted"}:{" "}
                      {meta?.title ?? e.paperId}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {dateStr}
                      {e.subKind === "submit" && e.marks !== undefined
                        ? ` · ${e.marks}/${e.total} (${Math.round(((e.marks ?? 0) / (e.total ?? 1)) * 100)}%)`
                        : ""}
                      {meta?.subject ? ` · ${SUBJECT_LABEL[meta.subject]}` : ""}
                    </div>
                  </div>
                  <a
                    href={`/smart-solve-papers/${e.paperId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-primary hover:underline shrink-0"
                  >
                    Open ↗
                  </a>
                </div>
              </motion.li>
            );
          }
          const q = getQuestion(e.questionId);
          const diff = q?.difficulty;
          const diffCls = diff ? DIFFICULTY_COLORS[diff] : "";
          return (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.6) }}
              whileHover={{ x: 4 }}
              className="relative"
            >
              <span
                className={`absolute -left-[18px] top-3 w-3 h-3 rounded-full border-2 border-background shadow ${
                  e.isCorrect ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
              <div
                className={`rounded-xl border-2 border-border/60 bg-background p-2.5 flex items-center gap-2 transition-colors ${e.isCorrect ? "hover:border-emerald-400/60" : "hover:border-red-400/60"}`}
              >
                {e.isCorrect ? (
                  <LuCheck size={14} className="text-emerald-500 shrink-0" />
                ) : (
                  <LuX size={14} className="text-red-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">
                    Q{q?.number ?? "?"} — {q?.topics.join(", ") || "untagged"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {dateStr} · paper {e.paperId}
                  </div>
                </div>
                {diff && (
                  <span
                    className={`text-[9px] font-bold uppercase rounded-full px-1.5 py-0.5 border shrink-0 ${diffCls}`}
                  >
                    {diff}
                  </span>
                )}
                {q && (
                  <button
                    type="button"
                    onClick={() => onPlayQuestion(q)}
                    className="text-[10px] font-bold text-primary hover:underline shrink-0 cursor-pointer"
                  >
                    Play ▶
                  </button>
                )}
              </div>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

/* ========== chart helpers ========== */

const chartTooltipStyle: React.CSSProperties = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "0 10px 30px -10px rgba(0,0,0,0.2)",
};

function compassData(stats: ReturnType<typeof bySkill>) {
  const base = stats.length
    ? stats
    : [{ key: "—", label: "—", attempted: 0, correct: 0, accuracy: 0, strength: 0 }];
  return base.slice(0, 8).map((s) => ({ label: s.label, strength: s.strength }));
}

function ringsData(stats: ReturnType<typeof bySubject>) {
  return stats.map((s, i) => ({
    name: s.label,
    value: Math.round(s.accuracy * 100),
    fill: PALETTE[i % PALETTE.length],
  }));
}

function pieData(stats: ReturnType<typeof byDifficulty>) {
  return stats.map((s) => ({ name: s.label, value: s.attempted }));
}
