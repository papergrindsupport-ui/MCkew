import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LuChevronRight, LuPlay, LuArrowLeft } from "react-icons/lu";
import { FaDna, FaFlask, FaAtom } from "react-icons/fa";
import { cn } from "@/lib/utils";
import {
  type Paper,
  type Subject,
  type SessionKey,
  type Variant,
  SUBJECTS,
  SESSIONS,
  SESSION_VARIANTS,
  YEARS,
  UNLOCKED_YEARS,
  SUBJECT_COLORS,
} from "@/data/paperData";
import { SelectionCheckbox } from "@/components/smart-solve/SelectionCheckbox";

type Step = "subject" | "year" | "session" | "variant" | "go";

const SUBJECT_ICONS = { bio: FaDna, chem: FaFlask, phys: FaAtom };

type PaperSelection = {
  active: boolean;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
};

export function MultistepLayout({
  papers,
  selection,
}: {
  papers: Paper[];
  selection?: PaperSelection;
}) {
  const [subject, setSubject] = useState<Subject | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [session, setSession] = useState<SessionKey | null>(null);
  const [variant, setVariant] = useState<Variant | null>(null);

  const step: Step = !subject
    ? "subject"
    : !year
      ? "year"
      : !session
        ? "session"
        : !variant
          ? "variant"
          : "go";

  const goTo = (s: Step) => {
    if (s === "subject") {
      setSubject(null);
      setYear(null);
      setSession(null);
      setVariant(null);
    }
    if (s === "year") {
      setYear(null);
      setSession(null);
      setVariant(null);
    }
    if (s === "session") {
      setSession(null);
      setVariant(null);
    }
    if (s === "variant") setVariant(null);
  };

  const matched = useMemo(
    () =>
      papers.find(
        (p) =>
          p.subject === subject &&
          p.year === year &&
          p.session === session &&
          p.variant === variant,
      ),
    [papers, subject, year, session, variant],
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex flex-wrap items-center gap-1.5 text-sm">
        <Crumb active={step === "subject"} onClick={() => goTo("subject")}>
          Subject{subject && `: ${SUBJECTS.find((s) => s.key === subject)?.short}`}
        </Crumb>
        {subject && (
          <>
            <LuChevronRight size={14} className="opacity-50" />
            <Crumb active={step === "year"} onClick={() => goTo("year")}>
              Year{year && `: ${year}`}
            </Crumb>
          </>
        )}
        {year && (
          <>
            <LuChevronRight size={14} className="opacity-50" />
            <Crumb active={step === "session"} onClick={() => goTo("session")}>
              Session{session && `: ${session}`}
            </Crumb>
          </>
        )}
        {session && (
          <>
            <LuChevronRight size={14} className="opacity-50" />
            <Crumb active={step === "variant"} onClick={() => goTo("variant")}>
              Variant{variant && `: ${variant}`}
            </Crumb>
          </>
        )}
      </nav>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          {step === "subject" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SUBJECTS.map((s) => {
                const Icon = SUBJECT_ICONS[s.key];
                const colors = SUBJECT_COLORS[s.key];
                return (
                  <motion.button
                    key={s.key}
                    whileHover={{ y: -6, rotate: -1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSubject(s.key)}
                    className={cn(
                      "rounded-3xl border-2 border-border/60 p-8 flex flex-col items-center gap-3",
                      colors.bg,
                    )}
                  >
                    <Icon size={48} className={colors.text} />
                    <span className="text-2xl font-bold">{s.label}</span>
                  </motion.button>
                );
              })}
            </div>
          )}

          {step === "year" && (
            <Dropdown
              label="Choose a Year"
              options={[...YEARS].sort((a, b) => b - a).map((y) => ({
                value: String(y),
                label: `${y}${UNLOCKED_YEARS.has(y) ? "" : " 🔒"}`,
                disabled: !UNLOCKED_YEARS.has(y),
              }))}
              onPick={(v) => setYear(Number(v))}
            />
          )}

          {step === "session" && (
            <Dropdown
              label="Choose a Session"
              options={SESSIONS.map((s) => ({ value: s.key, label: s.label }))}
              onPick={(v) => setSession(v as SessionKey)}
            />
          )}

          {step === "variant" && session && (
            <Dropdown
              label="Choose a Variant"
              options={SESSION_VARIANTS[session].map((v) => ({ value: v, label: v }))}
              onPick={(v) => setVariant(v as Variant)}
            />
          )}

          {step === "go" && matched && (
            <div className="flex flex-col items-center gap-6 py-6 sm:py-8 px-2">
              <div className="text-center">
                <p className="text-xs sm:text-sm uppercase tracking-widest text-muted-foreground">
                  You picked
                </p>
                <div className="mt-1 flex items-center justify-center gap-3">
                  {selection?.active && (
                    <SelectionCheckbox
                      checked={selection.selectedIds.has(matched.id)}
                      onChange={() => selection.onToggle(matched.id)}
                      label={`Select ${matched.title}`}
                    />
                  )}
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold break-words">
                    {matched.title}
                  </h2>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{ y: [0, -4, 0] }}
                transition={{ y: { duration: 1.5, repeat: Infinity } }}
                className="inline-flex items-center gap-2 sm:gap-3 rounded-2xl bg-foreground text-background px-6 sm:px-10 py-3.5 sm:py-5 text-base sm:text-xl font-bold shadow-xl"
              >
                <LuPlay size={20} className="sm:w-6 sm:h-6" /> Start solving paper
              </motion.button>
              <button
                onClick={() => goTo("variant")}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <LuArrowLeft size={14} /> Pick a different variant
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Crumb({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1 rounded-full text-xs font-semibold transition",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Dropdown({
  label,
  options,
  onPick,
}: {
  label: string;
  options: { value: string; label: string; disabled?: boolean }[];
  onPick: (v: string) => void;
}) {
  return (
    <div className="max-w-md mx-auto">
      <p className="text-sm font-bold text-muted-foreground mb-3">{label}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {options.map((opt) => (
          <motion.button
            key={opt.value}
            whileHover={opt.disabled ? undefined : { scale: 1.05 }}
            whileTap={opt.disabled ? undefined : { scale: 0.95 }}
            disabled={opt.disabled}
            onClick={() => onPick(opt.value)}
            className={cn(
              "rounded-xl border-2 border-border/60 px-4 py-3 font-semibold transition",
              opt.disabled
                ? "opacity-40 cursor-not-allowed bg-muted"
                : "bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary",
            )}
          >
            {opt.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
