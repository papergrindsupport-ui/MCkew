import { useState } from "react";
import type { Paper } from "@/data/paperData";
import { SUBJECTS, SESSIONS, SUBJECT_COLORS } from "@/data/paperData";
import { PaperCard } from "./PaperCard";
import { LuChevronDown } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

function Section({
  title,
  defaultOpen = true,
  className,
  badgeClass,
  children,
}: {
  title: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  badgeClass?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cn("rounded-2xl border-2 border-border/60 overflow-hidden", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base font-bold hover:bg-foreground/5 transition",
          badgeClass,
        )}
      >
        <span>{title}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }}>
          <LuChevronDown size={18} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-2 sm:p-3 space-y-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type PaperSelection = {
  active: boolean;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
};

export function OrganizedLayout({
  papers,
  selection,
}: {
  papers: Paper[];
  selection?: PaperSelection;
}) {
  return (
    <div className="space-y-3">
      {SUBJECTS.map((subj) => {
        const subjectPapers = papers.filter((p) => p.subject === subj.key);
        if (subjectPapers.length === 0) return null;
        const colors = SUBJECT_COLORS[subj.key];
        const years = Array.from(new Set(subjectPapers.map((p) => p.year))).sort((a, b) => b - a);
        return (
          <Section
            key={subj.key}
            title={`${subj.label} (${subjectPapers.length})`}
            badgeClass={cn(colors.bg, colors.text)}
            defaultOpen={subj.key === "bio"}
          >
            {years.map((year) => {
              const yearPapers = subjectPapers.filter((p) => p.year === year);
              return (
                <Section
                  key={year}
                  title={`${year}`}
                  defaultOpen={false}
                  className="bg-background/50"
                >
                  {SESSIONS.map((sess) => {
                    const sessPapers = yearPapers.filter((p) => p.session === sess.key);
                    if (sessPapers.length === 0) return null;
                    return (
                      <Section
                        key={sess.key}
                        title={sess.label}
                        defaultOpen={false}
                        className="bg-muted/30"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {sessPapers.map((p) => (
                            <PaperCard
                              key={p.id}
                              paper={p}
                              compact
                              selection={
                                selection && {
                                  active: selection.active,
                                  selected: selection.selectedIds.has(p.id),
                                  onToggle: () => selection.onToggle(p.id),
                                }
                              }
                            />
                          ))}
                        </div>
                      </Section>
                    );
                  })}
                </Section>
              );
            })}
          </Section>
        );
      })}
    </div>
  );
}
