import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LuFlame,
  LuLeaf,
  LuFlaskConical,
  LuAtom,
  LuPlay,
  LuTrophy,
  LuCheck,
  LuCalendar,
  LuChevronRight,
} from "react-icons/lu";
import { cn } from "@/lib/utils";
import { SUBJECTS, SUBJECT_COLORS, SUBJECT_LABEL, type Subject } from "@/data/paperData";
import {
  useDailyChallengeStore,
  resolveChallengeRows,
  dayKey,
  type ChallengeDayRecord,
} from "@/stores/useDailyChallengeStore";
import { DailyChallengeRunner } from "./DailyChallengeRunner";

const SUBJECT_ICON: Record<Subject, typeof LuLeaf> = {
  bio: LuLeaf,
  chem: LuFlaskConical,
  phys: LuAtom,
};

export function DailyChallengeSection() {
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [viewing, setViewing] = useState<{
    subject: Subject;
    record: ChallengeDayRecord;
  } | null>(null);

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-widest">
            <LuFlame size={14} /> Daily Challenge
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mt-1">Today's hard 3</h2>
          <p className="text-sm text-muted-foreground">
            Three random difficult questions per subject — fresh every day, never repeats.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {SUBJECTS.map((s, i) => (
          <SubjectChallengeCard
            key={s.key}
            subject={s.key}
            index={i}
            onLaunch={() => setActiveSubject(s.key)}
          />
        ))}
      </div>

      {/* Streak Timelines removed — analytics now lives on the dashboard's
          "Today's Analytics" section and the /dashboard/analytics page. */}

      <AnimatePresence>
        {activeSubject && (
          <ChallengeLauncher
            key={activeSubject}
            subject={activeSubject}
            onClose={() => setActiveSubject(null)}
          />
        )}
        {viewing && (
          <DailyChallengeRunner
            key={`view-${viewing.subject}-${viewing.record.day}`}
            subject={viewing.subject}
            rows={resolveChallengeRows(viewing.record.questionIds)}
            readOnly
            initialAnswers={viewing.record.answers}
            onClose={() => setViewing(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

function ChallengeLauncher({ subject, onClose }: { subject: Subject; onClose: () => void }) {
  const getOrPickToday = useDailyChallengeStore((s) => s.getOrPickToday);
  const qids = useMemo(() => getOrPickToday(subject), [subject, getOrPickToday]);
  const rows = useMemo(() => resolveChallengeRows(qids), [qids]);
  return <DailyChallengeRunner subject={subject} rows={rows} onClose={onClose} />;
}

function SubjectChallengeCard({
  subject,
  index,
  onLaunch,
}: {
  subject: Subject;
  index: number;
  onLaunch: () => void;
}) {
  const Icon = SUBJECT_ICON[subject];
  const colors = SUBJECT_COLORS[subject];
  const history = useDailyChallengeStore((s) => s.history[subject]);
  const streak = useDailyChallengeStore((s) => s.currentStreak(subject));
  const today = dayKey();
  const todayRecord = history.find((r) => r.day === today);
  const completedToday = !!todayRecord;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: "spring", stiffness: 200, damping: 22 }}
      whileHover={{ y: -4 }}
      className={cn(
        "relative overflow-hidden rounded-3xl border-2 border-border/50 bg-card/70 backdrop-blur p-5 group",
      )}
    >
      <div
        className={cn(
          "absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-40",
          colors.soft,
        )}
      />
      <div className="relative flex items-start gap-3">
        <motion.span
          whileHover={{ rotate: [0, -8, 8, 0] }}
          transition={{ duration: 0.5 }}
          className={cn(
            "inline-flex items-center justify-center w-12 h-12 rounded-2xl ring-2",
            colors.soft,
            colors.ring,
          )}
        >
          <Icon size={22} />
        </motion.span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
            {SUBJECT_LABEL[subject]}
          </div>
          <div className="text-lg font-bold leading-tight">Daily Challenge</div>
        </div>
        <motion.div
          animate={{ scale: streak > 0 ? [1, 1.15, 1] : 1 }}
          transition={{ duration: 1.5, repeat: streak > 0 ? Infinity : 0 }}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold",
            streak > 0
              ? "bg-orange-500/15 text-orange-600 dark:text-orange-300"
              : "bg-muted/40 text-muted-foreground",
          )}
        >
          <LuFlame size={12} /> {streak}
        </motion.div>
      </div>

      <p className="relative text-sm text-muted-foreground mt-3">
        3 difficult questions · ~3 min · per-question timer
      </p>

      {completedToday ? (
        <div className="relative mt-4 flex items-center gap-2 text-sm font-bold">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white">
            <LuCheck size={14} />
          </span>
          <span>
            Done today — {todayRecord.marks}/{todayRecord.questionIds.length}
          </span>
        </div>
      ) : (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onLaunch}
          className="relative mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm cursor-pointer shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
        >
          <LuPlay size={14} /> Take Challenge
        </motion.button>
      )}
    </motion.div>
  );
}

const TIMELINE_DAYS = 14;

function StreakTimeline({
  subject,
  onPickDay,
}: {
  subject: Subject;
  onPickDay: (record: ChallengeDayRecord) => void;
}) {
  const history = useDailyChallengeStore((s) => s.history[subject]);
  const colors = SUBJECT_COLORS[subject];
  const Icon = SUBJECT_ICON[subject];

  const byDay = useMemo(() => {
    const m = new Map<string, ChallengeDayRecord>();
    for (const r of history) m.set(r.day, r);
    return m;
  }, [history]);

  // Build last N days, oldest first
  const days = useMemo(() => {
    const out: { day: string; date: Date }[] = [];
    const now = new Date();
    for (let i = TIMELINE_DAYS - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      out.push({ day: dayKey(d), date: d });
    }
    return out;
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border-2 border-border/50 bg-card/70 backdrop-blur p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <span
          className={cn(
            "inline-flex items-center justify-center w-8 h-8 rounded-xl ring-2",
            colors.soft,
            colors.ring,
          )}
        >
          <Icon size={14} />
        </span>
        <div className="font-bold text-sm flex-1">{SUBJECT_LABEL[subject]}</div>
        <div className="text-xs text-muted-foreground">last {TIMELINE_DAYS} days</div>
      </div>

      <div className="relative">
        {/* connecting line */}
        <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-0.5 bg-border/40" />
        <div className="relative flex items-center justify-between gap-1">
          {days.map((d, i) => {
            const record = byDay.get(d.day);
            const done = !!record;
            const isToday = d.day === dayKey();
            const dayNum = d.date.getDate();
            // streak coloring: bright if part of contiguous streak ending today
            return (
              <motion.button
                key={d.day}
                disabled={!done}
                onClick={() => record && onPickDay(record)}
                whileHover={done ? { scale: 1.25, y: -3 } : {}}
                whileTap={done ? { scale: 0.92 } : {}}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.03, type: "spring", stiffness: 260, damping: 18 }}
                title={
                  done
                    ? `${d.day} · ${record!.marks}/${record!.questionIds.length} — click to view`
                    : `${d.day} · no challenge`
                }
                className={cn(
                  "relative z-10 inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold border-2 transition-colors",
                  done
                    ? "border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-500/30 cursor-pointer"
                    : "border-border/60 bg-background/80 text-muted-foreground/60",
                  isToday && !done && "ring-2 ring-primary/50 border-primary/60 text-primary",
                  isToday && done && "ring-2 ring-primary/60 ring-offset-2 ring-offset-card",
                )}
              >
                {done ? <LuFlame size={11} /> : dayNum}
                {done && (
                  <span className="absolute -bottom-4 text-[8px] text-muted-foreground font-medium">
                    {dayNum}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="mt-7 flex items-center justify-between text-xs">
        <div className="text-muted-foreground">
          {history.length} {history.length === 1 ? "day" : "days"} completed
        </div>
        {history.length > 0 && (
          <button
            onClick={() => onPickDay(history[history.length - 1])}
            className="inline-flex items-center gap-1 font-bold text-primary hover:underline cursor-pointer"
          >
            Latest <LuChevronRight size={12} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
