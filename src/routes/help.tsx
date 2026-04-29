import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Command,
  LifeBuoy,
  FileText,
  ListChecks,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Play,
  ExternalLink,
  ArrowRight,
  HelpCircle,
  Lightbulb,
  Zap,
  Target,
  Trophy,
  Clock,
  Brain,
  X,
  Keyboard,
  Compass,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ContactSection from "@/components/ContactSection";

// ---------- Guide data ----------
type GuideStep = {
  title: string;
  body: string;
  bullets?: string[];
  tip?: string;
  imageUrl?: string;
  videoUrl?: string;
  links?: { label: string; to: string; external?: boolean }[];
};

const ROUTE_MAP: Record<
  string,
  | "/"
  | "/smart-solve-papers"
  | "/smart-solve-bio"
  | "/smart-solve-chem"
  | "/smart-solve-phys"
  | "/dashboard"
  | "/leaderboard"
  | "/feedback"
  | "/help"
> = {
  "/smart-solve-papers": "/smart-solve-papers",
  "/smart-solve": "/smart-solve-papers",
  "/smart-solve-bio": "/smart-solve-bio",
  "/smart-solve-chem": "/smart-solve-chem",
  "/smart-solve-phys": "/smart-solve-phys",
  "/analytics": "/dashboard",
  "/planner": "/dashboard",
  "/profile": "/dashboard",
  "/desk": "/dashboard",
  "/desk/allpapers": "/smart-solve-papers",
  "/leaderboard": "/leaderboard",
  "/help#shortcuts": "/help",
};

type Guide = {
  id: string;
  label: string;
  Icon: any;
  color: string;
  tagline: string;
  description: string;
  steps: GuideStep[];
};

const GUIDES: Guide[] = [
  {
    id: "paper-solving",
    label: "Paper Solving",
    Icon: FileText,
    color: "hsl(345,72%,60%)",
    tagline: "Conquer past papers with confidence",
    description:
      "Everything you need to pick a paper, solve it like an exam, mark it intelligently, and learn from every mistake.",
    steps: [
      {
        title: "Find the right paper",
        body: "Open the Papers explorer to browse every available past paper. Filter by board, year, subject, paper number and difficulty so you only see what matters.",
        bullets: [
          "Use search to jump straight to a paper",
          "Save favorites to your Desk for quick access",
          "Difficulty ratings come from the community",
        ],
        tip: "Stuck on a topic? Filter by topic tag to find papers loaded with that exact theme.",
        imageUrl:
          "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=70",
        links: [
          { label: "Open Papers", to: "/smart-solve-papers" },
          { label: "All Papers archive", to: "/desk/allpapers" },
        ],
      },
      {
        title: "Pick your mode",
        body: "Each paper offers Practice, Exam and Play modes. Practice is relaxed with markschemes a click away. Exam mode times you and locks distractions. Play mode is gamified.",
        bullets: [
          "Practice — learn at your pace",
          "Exam — full timer, lockdown, no peeking",
          "Play — XP, streaks, friendly chaos",
        ],
        tip: "First time on a paper? Practice it. Second time? Lock it down with Exam mode.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      },
      {
        title: "Solve like a pro",
        body: "Smart Solve gives you focus tools while you work: a draggable timer, scratch pad, ruler, and per-question flagging so you can come back to tricky ones.",
        bullets: [
          "Press F to flag a question",
          "Long-press a part to open the part-tools menu",
          "Use the periodic table modal for chemistry",
        ],
        links: [{ label: "Keyboard shortcuts", to: "/help#shortcuts" }],
      },
      {
        title: "Submit and auto-mark",
        body: "When you finish, hit submit. Smart Mark instantly compares your answers to the markscheme — including AI-graded long answers with reasoning.",
        bullets: [
          "MCQs are marked instantly",
          "Long answers get AI explanations",
          "You can override any mark manually",
        ],
        tip: "Disagree with a mark? Click 'Re-mark' to dispute and explain why.",
      },
      {
        title: "Review and learn",
        body: "After marking, dive into the review screen. See your grade band, weak topics, and a per-question breakdown with model answers and tutor commentary.",
        bullets: [
          "Save highlights to the Desk for revision",
          "Send questions to the Planner to retry later",
          "Share results with collab partners",
        ],
        links: [
          { label: "Open Analytics", to: "/analytics" },
          { label: "Open Planner", to: "/planner" },
        ],
      },
    ],
  },
  {
    id: "questions-solving",
    label: "Questions Solving",
    Icon: ListChecks,
    color: "hsl(160,65%,45%)",
    tagline: "Master one question at a time",
    description:
      "Smart Solve's question-by-question mode is the fastest way to drill weak topics, learn command words, and build exam intuition.",
    steps: [
      {
        title: "Choose your subject",
        body: "Pick Biology, Chemistry, Physics or All. Each subject has thousands of categorized questions tagged by topic, difficulty, and question style.",
        bullets: [
          "Filter by board (Edexcel, AQA, IAL, etc.)",
          "Search by keyword or command word",
          "Save filter combos for repeat sessions",
        ],
        links: [
          { label: "Smart Solve hub", to: "/smart-solve" },
          { label: "Biology", to: "/smart-solve-bio" },
          { label: "Chemistry", to: "/smart-solve-chem" },
          { label: "Physics", to: "/smart-solve-phys" },
        ],
      },
      {
        title: "Use filters like a surgeon",
        body: "The filter drawer is where the magic happens. Combine multiple filters — topic, mark range, year, command word — to build the perfect question set.",
        bullets: [
          "Multi-select inside any filter chip",
          "'My Tags' lets you build private collections",
          "Reset all with one click",
        ],
        tip: "Stuck at 6/10s? Filter by command word 'Explain' and grind 20 of them in a row.",
        imageUrl:
          "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?auto=format&fit=crop&w=1200&q=70",
      },
      {
        title: "Answer with the right tools",
        body: "Different question types need different inputs — MCQs, drag-on-image, fill-in-the-blank tables, drawing canvases. Smart Solve picks the right UI automatically.",
        bullets: [
          "Drawing tools for graphs and diagrams",
          "Word banks for fill-in-the-blanks",
          "Annotation tools for image questions",
        ],
      },
      {
        title: "Mark instantly, learn deeply",
        body: "Smart Mark gives a verdict in seconds plus tutor-style commentary. For tricky questions, open 'More Insights' for worked examples and related questions.",
        bullets: [
          "AI explains where you went wrong",
          "GIF reactions for full marks (you'll see)",
          "Voice comments from contributors on select Qs",
        ],
        tip: "Hit a Full-Mark Streak of 5+ to unlock a celebration widget.",
      },
      {
        title: "Tag and revisit",
        body: "Save any question to your Desk with a custom tag. Build a 'Mistakes I always make' folder, or 'Top Bio long-answers' — your call.",
        bullets: [
          "Drag questions into Desk folders",
          "Add to Planner for spaced revision",
          "Share question links with study partners",
        ],
        links: [
          { label: "Open your Desk", to: "/desk" },
          { label: "Planner", to: "/planner" },
        ],
      },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    Icon: BarChart3,
    color: "hsl(220,75%,60%)",
    tagline: "Turn data into a study plan",
    description:
      "Your Analytics page is the mission control of your prep. Track grades, see weak topics, predict outcomes, and set goals that actually stick.",
    steps: [
      {
        title: "Read your overview",
        body: "The Stats Overview shows total questions answered, average accuracy, time spent, and your current grade band. It updates in real time as you solve.",
        bullets: [
          "Streaks show consistency, not just total volume",
          "Compare this week vs last week",
          "Toggle subjects to focus your view",
        ],
        links: [{ label: "Open Analytics", to: "/analytics" }],
      },
      {
        title: "Find your weak spots",
        body: "Performance Charts break your accuracy down by topic, command word, and question type. The lowest bars are where the easy wins live.",
        bullets: [
          "Hover any bar for sample questions",
          "Click a topic to filter Smart Solve to it",
          "'Time per mark' reveals pacing issues",
        ],
        tip: "Pick the 3 weakest topics and dedicate one focused session each per week.",
        imageUrl:
          "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=70",
      },
      {
        title: "Predict your grade",
        body: "The Grade Predictor uses your recent paper performance (with weighting) to estimate your real exam grade — not a guess, an actual model.",
        bullets: [
          "Weighted by recency",
          "Subject-by-subject breakdown",
          "Updates after every paper",
        ],
        links: [{ label: "Profile & predictor", to: "/profile" }],
      },
      {
        title: "Set goals that stick",
        body: "Use the Goals panel to set targets — 'Solve 50 Bio Qs this week', 'Finish 3 Chem papers', 'Hit A* in Physics'. Get a celebration when you nail one.",
        bullets: [
          "Daily, weekly and monthly goals",
          "Confetti and a custom modal on completion",
          "Share goals with your collab room",
        ],
      },
      {
        title: "Earn XP and climb the leaderboard",
        body: "Every solved question, every correct answer, every streak earns XP. See your rank on the global leaderboard or just compete with friends.",
        bullets: [
          "Bonus XP for full-mark streaks",
          "Daily login XP",
          "Friend leaderboards (private)",
        ],
        links: [{ label: "Leaderboard", to: "/leaderboard" }],
      },
    ],
  },
];

// FAQ data
const FAQS: Array<{ q: string; a: string; Icon: any; tag: string }> = [
  {
    q: "Is Smart Solve free?",
    a: "The core experience — questions, papers, marking — is free. Some advanced AI marking features require a subscription, but you can earn free access by volunteering or using a promo code.",
    Icon: Sparkles,
    tag: "Pricing",
  },
  {
    q: "Does the AI marker actually work?",
    a: "Yes — and surprisingly well. It compares your answer to the markscheme using semantic understanding, not just keyword matching. You can always override its decision.",
    Icon: Brain,
    tag: "Marking",
  },
  {
    q: "What if I find a wrong answer or bug?",
    a: "Use the contact form below — pick 'Bug Report'. Every report is read by a real human (Salah) and most fixes ship within 48 hours.",
    Icon: Target,
    tag: "Bugs",
  },
  {
    q: "Can I study with friends?",
    a: "Yes! Open any paper or question and click 'Collab' to invite up to 6 people. You'll see each other's cursors, answers, and even shared annotations live.",
    Icon: Trophy,
    tag: "Social",
  },
  {
    q: "How do I get exam-mode lockdown to work?",
    a: "Open a paper, choose Exam mode, and accept the focus prompt. The navbar disappears, distractions are blocked, and a stopwatch tracks every minute.",
    Icon: Clock,
    tag: "Focus",
  },
  {
    q: "Are my answers private?",
    a: "Always. Your submissions, drafts, and analytics are tied to your account or device — never shared, never sold. Public things (like Feedback Wall) are clearly labeled.",
    Icon: HelpCircle,
    tag: "Privacy",
  },
];

// Build a flat searchable index from guides
type SearchHit = {
  guideId: string;
  guideLabel: string;
  stepIndex: number;
  stepTitle: string;
  snippet: string;
  Icon: any;
};

function buildSearchHaystack(): SearchHit[] {
  const hits: SearchHit[] = [];
  for (const g of GUIDES) {
    g.steps.forEach((s, i) => {
      const text = [s.title, s.body, s.tip ?? "", ...(s.bullets ?? [])].join(" ");
      hits.push({
        guideId: g.id,
        guideLabel: g.label,
        stepIndex: i,
        stepTitle: s.title,
        snippet: text,
        Icon: g.Icon,
      });
    });
  }
  return hits;
}

const SEARCH_INDEX = buildSearchHaystack();

// =====================================================
// Page
// =====================================================
export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help Center — MCkew" },
      { name: "description", content: "Guides, answers, and support for using MCkew." },
    ],
  }),
  component: Help,
});

function Help() {
  const [activeGuide, setActiveGuide] = useState<string>(GUIDES[0].id);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  // ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SEARCH_INDEX.slice(0, 12);
    return SEARCH_INDEX.map((h) => {
      const text = (h.stepTitle + " " + h.snippet).toLowerCase();
      const idx = text.indexOf(q);
      if (idx === -1) return null;
      const start = Math.max(0, idx - 40);
      const end = Math.min(text.length, idx + 80);
      return {
        ...h,
        snippet: (start > 0 ? "…" : "") + h.snippet.slice(start, end) + "…",
        _score: idx,
      };
    })
      .filter(Boolean)
      .sort((a: any, b: any) => a._score - b._score)
      .slice(0, 20) as SearchHit[];
  }, [query]);

  function goToHit(h: SearchHit) {
    setActiveGuide(h.guideId);
    setSearchOpen(false);
    setTimeout(() => {
      document
        .getElementById(`step-${h.guideId}-${h.stepIndex}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      <AnimatedBlobs />

      <Link
        to="/"
        className="fixed top-4 left-4 z-50 inline-flex items-center gap-2 rounded-full bg-card/80 backdrop-blur px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground border border-border shadow-sm transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      {/* Hero */}
      <section className="relative pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ scale: 0, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 14 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 mb-6"
          >
            <LifeBuoy className="w-10 h-10 text-primary" />
          </motion.div>
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-5xl sm:text-6xl font-bold tracking-tight mb-4"
          >
            Help Center
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-lg text-muted-foreground mb-8"
          >
            Guides, answers, and a way to reach a real human. Press <Kbd>⌘</Kbd>+<Kbd>K</Kbd>{" "}
            anytime to search.
          </motion.p>

          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            onClick={() => setSearchOpen(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="group w-full max-w-xl mx-auto flex items-center gap-3 rounded-full border border-border bg-card/70 backdrop-blur px-5 py-4 text-left text-muted-foreground hover:border-primary hover:shadow-lg transition-all"
          >
            <Search className="w-5 h-5 text-primary" />
            <span className="flex-1 text-sm">Search every guide…</span>
            <span className="hidden sm:inline-flex items-center gap-1 text-xs">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </span>
          </motion.button>
        </div>
      </section>

      {/* Guides */}
      <section className="relative py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <p className="text-sm font-mono uppercase tracking-widest text-primary mb-3 inline-flex items-center gap-2 justify-center">
              <Compass className="w-4 h-4" /> Guides
            </p>
            <h2 className="text-4xl md:text-5xl font-bold">
              Pick a path. We'll walk you through it.
            </h2>
          </motion.div>

          <Tabs value={activeGuide} onValueChange={setActiveGuide}>
            <TabsList className="w-full h-auto bg-transparent p-0 mb-8 flex flex-wrap justify-center gap-2">
              {GUIDES.map((g) => {
                const Icon = g.Icon;
                return (
                  <TabsTrigger
                    key={g.id}
                    value={g.id}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg rounded-full px-5 py-2.5 text-sm font-semibold border border-border bg-card hover:border-primary/50 transition-colors"
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {g.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {GUIDES.map((g) => (
              <TabsContent key={g.id} value={g.id} className="mt-0">
                <GuideView guide={g} />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* FAQ */}
      <FaqSection />

      {/* Contact (identical to /about) */}
      <ContactSection
        heading="Need a human?"
        eyebrow="Contact us"
        subheading="No bots, no tickets — just send us a note and we'll get back to you."
      />

      {/* Search modal */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <div className="border-b border-border p-4 flex items-center gap-3">
            <Search className="w-5 h-5 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search guides…"
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 text-base shadow-none"
            />
            <button
              onClick={() => setSearchOpen(false)}
              className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {results.length === 0 ? (
              <p className="text-center text-muted-foreground py-12 text-sm">
                Nothing matched "{query}". Try another keyword.
              </p>
            ) : (
              <ul className="space-y-1">
                {results.map((h, i) => {
                  const Icon = h.Icon;
                  return (
                    <li key={i}>
                      <button
                        onClick={() => goToHit(h)}
                        className="w-full text-left px-3 py-3 rounded-xl hover:bg-muted/60 flex items-start gap-3 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground font-mono">
                            {h.guideLabel} · Step {h.stepIndex + 1}
                          </div>
                          <div className="font-semibold text-sm">{h.stepTitle}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {h.snippet}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="border-t border-border px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5" /> Navigate with arrows
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd>esc</Kbd> to close
            </span>
          </div>
        </DialogContent>
      </Dialog>

      <footer className="relative py-12 text-center text-sm text-muted-foreground">
        <p className="inline-flex items-center gap-1.5">
          Couldn't find what you needed?{" "}
          <Link to="/feedback" className="text-primary font-semibold hover:underline">
            Tell us
          </Link>
          .
        </p>
      </footer>
    </div>
  );
}

// =====================================================
// Guide view — multi-step walkthrough
// =====================================================
function GuideView({ guide }: { guide: Guide }) {
  const [stepIdx, setStepIdx] = useState(0);
  const total = guide.steps.length;
  const step = guide.steps[stepIdx];
  const Icon = guide.Icon;

  return (
    <motion.div
      key={guide.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative rounded-3xl border border-border bg-card/60 backdrop-blur p-6 md:p-10 shadow-xl"
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <motion.div
          whileHover={{ rotate: 8, scale: 1.05 }}
          className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-white shadow-lg"
          style={{ background: guide.color }}
        >
          <Icon className="w-7 h-7" />
        </motion.div>
        <div className="flex-1 min-w-0">
          <h3 className="text-2xl md:text-3xl font-bold">{guide.label}</h3>
          <p className="text-muted-foreground text-sm">{guide.tagline}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
          <span>
            Step {stepIdx + 1} of {total}
          </span>
          <span>{Math.round(((stepIdx + 1) / total) * 100)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            animate={{ width: `${((stepIdx + 1) / total) * 100}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
        {/* Step dots */}
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {guide.steps.map((s, i) => (
            <button
              key={i}
              onClick={() => setStepIdx(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIdx
                  ? "w-8 bg-primary"
                  : i < stepIdx
                    ? "w-3 bg-primary/40"
                    : "w-3 bg-muted-foreground/20"
              }`}
              aria-label={`Go to step ${i + 1}: ${s.title}`}
            />
          ))}
        </div>
      </div>

      {/* Active step */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stepIdx}
          id={`step-${guide.id}-${stepIdx}`}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-primary mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Step {stepIdx + 1}
          </div>
          <h4 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">{step.title}</h4>
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">{step.body}</p>

          {/* Media */}
          {step.imageUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="relative rounded-2xl overflow-hidden border border-border mb-6 aspect-video bg-muted"
            >
              <img
                src={step.imageUrl}
                alt={step.title}
                loading="lazy"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-background/80 backdrop-blur px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider">
                <BookOpen className="w-3 h-3" /> Visual
              </div>
            </motion.div>
          )}

          {step.videoUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              className="relative rounded-2xl overflow-hidden border border-border mb-6 aspect-video bg-black"
            >
              <iframe
                src={step.videoUrl}
                title={`${step.title} — video`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
              <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-background/80 backdrop-blur px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider">
                <Play className="w-3 h-3" /> Video
              </div>
            </motion.div>
          )}

          {/* Bullets */}
          {step.bullets && step.bullets.length > 0 && (
            <ul className="space-y-2 mb-6">
              {step.bullets.map((b, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="flex items-start gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/90">{b}</span>
                </motion.li>
              ))}
            </ul>
          )}

          {/* Tip */}
          {step.tip && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-2xl border-l-4 border-primary bg-primary/5 p-4 mb-6 flex gap-3"
            >
              <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
                  Pro tip
                </div>
                <div className="text-sm text-foreground/90">{step.tip}</div>
              </div>
            </motion.div>
          )}

          {/* Links */}
          {step.links && step.links.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {step.links.map((l) => (
                <Link
                  key={l.label}
                  to={ROUTE_MAP[l.to] ?? "/"}
                  target={l.external ? "_blank" : undefined}
                  rel={l.external ? "noopener noreferrer" : undefined}
                  className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border hover:border-primary hover:bg-primary hover:text-primary-foreground px-4 py-2 text-sm font-semibold transition-colors"
                >
                  {l.label}
                  {l.external ? (
                    <ExternalLink className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5" />
                  )}
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Nav */}
      <div className="flex items-center justify-between pt-6 border-t border-border mt-6">
        <Button
          variant="outline"
          onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
          disabled={stepIdx === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
        </Button>
        {stepIdx === total - 1 ? (
          <Button onClick={() => setStepIdx(0)} variant="default">
            <Trophy className="w-4 h-4 mr-2" /> Restart guide
          </Button>
        ) : (
          <Button onClick={() => setStepIdx((i) => Math.min(total - 1, i + 1))}>
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// =====================================================
// Interactive FAQ — peel-back cards with reveal
// =====================================================
function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-sm font-mono uppercase tracking-widest text-primary mb-3 inline-flex items-center gap-2 justify-center">
            <HelpCircle className="w-4 h-4" /> Frequently asked
          </p>
          <h2 className="text-4xl md:text-5xl font-bold">Tap a card. Get an answer.</h2>
          <p className="text-muted-foreground mt-3">
            Hover, flip, click — these aren't your boring FAQs.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-4">
          {FAQS.map((faq, i) => {
            const isOpen = openIdx === i;
            const Icon = faq.Icon;
            return (
              <FaqCard
                key={i}
                faq={faq}
                isOpen={isOpen}
                onToggle={() => setOpenIdx(isOpen ? null : i)}
                Icon={Icon}
                index={i}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FaqCard({
  faq,
  isOpen,
  onToggle,
  Icon,
  index,
}: {
  faq: { q: string; a: string; tag: string; Icon: any };
  isOpen: boolean;
  onToggle: () => void;
  Icon: any;
  index: number;
}) {
  const cardRef = useRef<HTMLButtonElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  function onMouseMove(e: React.MouseEvent) {
    if (isOpen) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -8, y: x * 8 });
  }

  function onMouseLeave() {
    setTilt({ x: 0, y: 0 });
  }

  return (
    <motion.button
      ref={cardRef}
      onClick={onToggle}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ delay: index * 0.06 }}
      animate={{
        rotateX: tilt.x,
        rotateY: tilt.y,
      }}
      style={{ transformStyle: "preserve-3d" }}
      className={`relative text-left rounded-3xl border bg-card p-6 overflow-hidden transition-all ${
        isOpen
          ? "border-primary shadow-2xl ring-2 ring-primary/20"
          : "border-border hover:border-primary/40 hover:shadow-lg"
      }`}
    >
      {/* Accent corner */}
      <motion.div
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-primary/10"
        animate={isOpen ? { scale: 1.5 } : { scale: 1 }}
        transition={{ duration: 0.4 }}
      />

      <div className="relative flex items-start gap-3 mb-3">
        <motion.div
          animate={isOpen ? { rotate: [0, -10, 10, 0] } : { rotate: 0 }}
          transition={{ duration: 0.5 }}
          className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"
        >
          <Icon className="w-5 h-5" />
        </motion.div>
        <div className="flex-1 min-w-0">
          <span className="inline-block text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
            {faq.tag}
          </span>
          <h3 className="font-bold text-base leading-snug">{faq.q}</h3>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0"
        >
          <ChevronRight className="w-4 h-4 rotate-90" />
        </motion.div>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="text-sm text-muted-foreground leading-relaxed pt-2 border-t border-border mt-2">
              {faq.a}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-primary mt-3">
              <Zap className="w-3 h-3" /> Helpful?
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// =====================================================
// Background blobs
// =====================================================
function AnimatedBlobs() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
      <motion.div
        className="absolute top-[10%] left-[15%] w-[28rem] h-[28rem] rounded-full bg-primary/10 blur-3xl"
        animate={{ x: [0, 80, -40, 0], y: [0, -60, 40, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-[45%] right-[10%] w-[24rem] h-[24rem] rounded-full bg-accent/15 blur-3xl"
        animate={{ x: [0, -70, 30, 0], y: [0, 50, -30, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[5%] left-[40%] w-[30rem] h-[30rem] rounded-full bg-primary/5 blur-3xl"
        animate={{ x: [0, 50, -50, 0], y: [0, -40, 30, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 h-5 rounded border border-border bg-muted text-[10px] font-mono font-semibold text-foreground">
      {children}
    </kbd>
  );
}
