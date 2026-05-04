import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Download,
  Check,
  FileText,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import VolunteerWizard from "@/components/volunteer/VolunteerWizard";
import {
  loadApplications,
  type VolunteerApplication,
  ROLE_INFO,
} from "@/components/volunteer/volunteer-types";
import heroImg from "@/assets/volunteer-hero.svg";

type View = "landing" | "wizard" | "thanks";

export const Route = createFileRoute("/volunteer")({
  head: () => ({
    meta: [
      { title: "Volunteer — MCkew" },
      {
        name: "description",
        content: "Apply to volunteer with MCkew and help students learn smarter.",
      },
    ],
  }),
  component: Volunteer,
});

function Volunteer() {
  const effectiveUserId = null;
  const [view, setView] = useState<View>("landing");
  const [apps, setApps] = useState<VolunteerApplication[]>([]);
  const [submitted, setSubmitted] = useState<VolunteerApplication | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadApplications(effectiveUserId).then((rows) => {
      if (!cancelled) setApps(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [effectiveUserId, view]);

  const onSubmitted = (app: VolunteerApplication) => {
    setSubmitted(app);
    setView("thanks");
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-fredoka flex flex-col">
      <Navbar />

      <main className="flex-1">
        <AnimatePresence mode="wait">
          {view === "landing" && (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* HERO */}
              <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/30">
                <motion.div
                  className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/15 blur-3xl"
                  animate={{ scale: [1, 1.15, 1], rotate: [0, 30, 0] }}
                  transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-secondary/40 blur-3xl"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                />

                <div className="relative max-w-6xl mx-auto px-6 sm:px-10 py-16 sm:py-24 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/30 mb-6"
                    >
                      <Sparkles size={12} className="text-primary" />
                      <span className="text-[11px] font-bold text-primary uppercase tracking-wide">
                        Now welcoming volunteers
                      </span>
                    </motion.div>

                    <motion.h1
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.05] text-foreground"
                    >
                      Let's create
                      <br />
                      <span className="text-primary">something great</span>
                      <br />
                      together.
                    </motion.h1>

                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                      className="mt-5 text-base text-muted-foreground max-w-md leading-relaxed"
                    >
                      Help thousands of students learn smarter. Pick a role, set your own hours, and
                      join a small team obsessed with quality.
                    </motion.p>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="mt-8 flex items-center gap-3"
                    >
                      <motion.button
                        whileHover={{ scale: 1.04, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setView("wizard")}
                        className="group relative inline-flex items-center gap-2 pl-2 pr-6 py-2 rounded-full bg-foreground text-background font-bold text-sm shadow-xl"
                      >
                        <span className="w-9 h-9 rounded-full bg-background text-foreground flex items-center justify-center font-black tracking-wide text-[10px]">
                          GO
                        </span>
                        APPLY
                        <ArrowRight
                          size={16}
                          className="transition-transform group-hover:translate-x-1"
                        />
                      </motion.button>
                    </motion.div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, rotate: -3 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
                    className="relative"
                  >
                    <motion.img
                      src={heroImg}
                      alt="Two cartoon hands reaching toward each other"
                      className="w-full rounded-3xl shadow-2xl"
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </motion.div>
                </div>
              </section>

              {/* APPLICATION HISTORY */}
              <section className="max-w-3xl mx-auto px-6 sm:px-10 py-12 sm:py-16">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-2xl font-bold text-foreground">My application history</h2>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {apps.length} {apps.length === 1 ? "entry" : "entries"}
                  </span>
                </div>

                {apps.length === 0 ? (
                  <div className="rounded-3xl border-2 border-dashed border-border bg-card/50 p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No applications yet — your history will appear here once you apply.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {apps.map((a) => (
                      <ApplicationCard key={a.id} app={a} />
                    ))}
                  </div>
                )}
              </section>
            </motion.div>
          )}

          {view === "wizard" && (
            <motion.div
              key="wizard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <VolunteerWizard onSubmitted={onSubmitted} onCancel={() => setView("landing")} />
            </motion.div>
          )}

          {view === "thanks" && submitted && (
            <ThanksScreen
              key="thanks"
              app={submitted}
              onBack={() => {
                setSubmitted(null);
                setView("landing");
              }}
            />
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}

function ApplicationCard({ app }: { app: VolunteerApplication }) {
  const info = ROLE_INFO[app.role];
  const StatusIcon =
    app.status === "accepted" ? CheckCircle2 : app.status === "rejected" ? XCircle : Clock;
  const statusColor =
    app.status === "accepted"
      ? "text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/30"
      : app.status === "rejected"
        ? "text-destructive bg-destructive/10 border-destructive/30"
        : "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="p-4 rounded-2xl border-2 border-border bg-card flex items-center gap-4"
    >
      <span className="text-3xl shrink-0">{info.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-bold text-foreground">{info.name}</h3>
          <span className="text-[10px] font-semibold text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">
            {new Date(app.createdAt).toLocaleDateString()}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {app.fullName} · {app.subjects.length} subject{app.subjects.length === 1 ? "" : "s"} ·{" "}
          {app.hoursPerDay}h/day
        </p>
      </div>
      <div
        className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 ${statusColor}`}
      >
        <StatusIcon size={10} />
        {app.status}
      </div>
    </motion.div>
  );
}

function ThanksScreen({ app, onBack }: { app: VolunteerApplication; onBack: () => void }) {
  const downloadSummary = () => {
    const summary = buildSummaryText(app);
    const blob = new Blob([summary], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `volunteer-application-${app.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      key="thanks"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="max-w-2xl mx-auto px-6 py-12 sm:py-20"
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-xl shadow-primary/40"
      >
        <Check size={40} className="text-primary-foreground" strokeWidth={3} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-4xl sm:text-5xl font-bold text-center text-foreground"
      >
        Application sent! 🎉
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-4 text-center text-base text-muted-foreground max-w-md mx-auto leading-relaxed"
      >
        Thank you so much for applying,{" "}
        <span className="font-bold text-foreground">{app.fullName}</span>! We'll reach you on the
        contact methods you chose with our acceptance or rejection notice.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        <a href="/volunteer-guide.pdf" download>
          <Button variant="outline" className="w-full h-12 rounded-2xl border-2 font-semibold">
            <Download size={14} className="mr-2" /> Volunteer guide
          </Button>
        </a>
        <Button
          onClick={downloadSummary}
          variant="outline"
          className="w-full h-12 rounded-2xl border-2 font-semibold"
        >
          <FileText size={14} className="mr-2" /> Application summary
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-6 p-5 rounded-2xl border-2 border-border bg-card"
      >
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Sparkles size={14} className="text-primary" /> Your application
        </h3>
        <pre className="text-[11px] text-muted-foreground font-mono whitespace-pre-wrap leading-relaxed max-h-64 overflow-auto">
          {buildSummaryText(app)}
        </pre>
      </motion.div>

      <div className="mt-8 text-center">
        <Button
          onClick={onBack}
          className="rounded-full h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
        >
          Back to /volunteer
        </Button>
      </div>
    </motion.div>
  );
}

function buildSummaryText(a: VolunteerApplication): string {
  const role = ROLE_INFO[a.role];
  const lines = [
    `SMART SOLVE — VOLUNTEER APPLICATION`,
    `Submitted: ${new Date(a.createdAt).toLocaleString()}`,
    `Status: ${a.status}`,
    `─────────────────────────────────────`,
    `Name: ${a.fullName}`,
    `Role: ${role.name} (${role.tagline})${a.customRole ? ` — ${a.customRole}` : ""}`,
    ``,
    `Contact methods:`,
    ...a.contactMethods.map((m) => {
      if (m.kind === "phone")
        return `  • ${m.dialCode} ${m.number} (${m.subtype}${m.customSubtype ? `: ${m.customSubtype}` : ""})`;
      if (m.kind === "email") return `  • ${m.email}`;
      if (m.kind === "social")
        return `  • ${m.platform}: ${m.username}${m.customLink ? ` (${m.customLink})` : ""}`;
      return `  • ${m.label}: ${m.value}${m.link ? ` (${m.link})` : ""}`;
    }),
    ``,
    a.dateOfBirth
      ? `Date of birth: ${new Date(a.dateOfBirth).toLocaleDateString()}`
      : `Date of birth: —`,
    a.availableFrom && a.availableTo
      ? `Availability: ${new Date(a.availableFrom).toLocaleDateString()} → ${new Date(a.availableTo).toLocaleDateString()} (${a.hoursPerDay}h/day)`
      : `Availability: —`,
    ``,
    `Subjects: ${a.subjects.map((s) => (s.subject === "biology" ? `Biology (${s.level})` : s.subject)).join(", ") || "—"}`,
    `Education: ${a.educationLevel || a.customEducation || "—"}`,
    `Nationality: ${a.nationality || "—"}`,
    `Lives in home country: ${a.livesInHomeCountry ? "yes" : "no"}`,
    a.currentLocation ? `Current location: ${a.currentLocation}` : ``,
    ``,
    a.customFields.length > 0 ? `Custom fields:` : ``,
    ...a.customFields.map((f) => `  • ${f.label}: ${f.value}`),
    ``,
    `Terms accepted: ${a.acceptedTerms ? "yes" : "no"}`,
  ];
  return lines.filter((l) => l !== undefined).join("\n");
}
