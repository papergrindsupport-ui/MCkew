import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LuChevronDown,
  LuSlidersHorizontal,
  LuLayers,
  LuCalendar,
  LuClock,
  LuHash,
  LuTarget,
  LuBookOpen,
  LuBrain,
  LuTag,
  LuFlame,
  LuStar,
  LuEyeOff,
  LuLock,
  LuLeaf,
  LuBolt,
  LuDroplet,
  LuHeartPulse,
  LuGlobe,
} from "react-icons/lu";
import { FaAtom, FaDna, FaFlask } from "react-icons/fa";
import { useUnlockStore, goToPricing } from "@/stores/useUnlockStore";
import { cn } from "@/lib/utils";
import {
  SUBJECTS,
  SUBJECT_COLORS,
  SUBJECT_LABEL,
  YEARS,
  SESSIONS,
  SESSION_VARIANTS,
  GRADE_THRESHOLDS,
  SKILLS,
  ALL_TAGS,
  DIFFICULTIES,
  PRIORITIES,
  DIFFICULTY_COLORS,
  PRIORITY_COLORS,
  type Subject,
} from "@/data/paperData";
import {
  TriCheckbox,
  type TriMap,
  FilterControls,
  randomTriMap,
  allTriMap,
  activeKeys,
  buildTriMap,
} from "@/components/papers/TriCheckbox";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import {
  type QuestionFilters,
  makeDefaultQuestionFilters,
  topicsForSubject,
  type SortKey,
  type SortDir,
} from "./filterQuestions";

const ALL_VARIANTS = Array.from(new Set(Object.values(SESSION_VARIANTS).flat()));
const ALL_SKILL_KEYS = SKILLS.flatMap((s) => s.sub.map((x) => x.key));

const SUBJECT_ICON: Record<Subject, typeof FaDna> = {
  bio: FaDna,
  chem: FaFlask,
  phys: FaAtom,
};

export function QuestionGenerator({
  filters,
  setFilters,
  resultCount,
  showSubjectFilter,
  subject,
}: {
  filters: QuestionFilters;
  setFilters: (f: QuestionFilters) => void;
  resultCount: number;
  showSubjectFilter: boolean;
  subject?: Subject;
}) {
  const [showMore, setShowMore] = useState(false);
  const [open, setOpen] = useState(true);
  const isYearLocked = useUnlockStore((s) => s.isYearLocked);
  const isTopicLocked = useUnlockStore((s) => s.isTopicLocked);
  const update = <K extends keyof QuestionFilters>(k: K, v: QuestionFilters[K]) =>
    setFilters({ ...filters, [k]: v });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border-2 border-border/60 bg-card/50 backdrop-blur p-4 mb-6"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          <LuSlidersHorizontal size={18} className="text-primary" />
          <h2 className="font-bold">Generator</h2>
          <span className="text-xs text-muted-foreground">· {resultCount} questions</span>
        </div>
        <LuChevronDown
          size={16}
          className={cn("text-muted-foreground transition", open && "rotate-180")}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3">
              <div className="flex flex-wrap gap-2">
                {showSubjectFilter && (
                  <CheckDropdown
                    label="Subject(s)"
                    icon={LuLayers}
                    map={filters.subjects}
                    onChange={(m) => update("subjects", m)}
                    options={SUBJECTS.map((s) => ({ key: s.key, label: s.label }))}
                  />
                )}
                <CheckDropdown
                  label="Year"
                  icon={LuCalendar}
                  map={filters.years}
                  onChange={(m) => update("years", m)}
                  options={[...YEARS]
                    .sort((a, b) => b - a)
                    .map((y) => ({ key: String(y), label: String(y) }))}
                  isLocked={(k) => isYearLocked(k)}
                />
                <CheckDropdown
                  label="Variant"
                  icon={LuHash}
                  map={filters.variants}
                  onChange={(m) => update("variants", m)}
                  options={ALL_VARIANTS.map((v) => ({ key: v, label: v }))}
                />
                <CheckDropdown
                  label="Session"
                  icon={LuClock}
                  map={filters.sessions}
                  onChange={(m) => update("sessions", m)}
                  options={SESSIONS.map((s) => ({ key: s.key, label: s.label }))}
                />
                <TopicsDrawer
                  map={filters.topics}
                  onChange={(m) => update("topics", m)}
                  isLocked={(k) => isTopicLocked(k)}
                  subject={subject}
                />
                <CheckDropdown
                  label="Skill"
                  icon={LuBrain}
                  map={filters.skills}
                  onChange={(m) => update("skills", m)}
                  options={ALL_SKILL_KEYS.map((k) => ({ key: k, label: k }))}
                />
                <CheckDropdown
                  label="Tags"
                  icon={LuTag}
                  map={filters.tags}
                  onChange={(m) => update("tags", m)}
                  options={ALL_TAGS.map((t) => ({ key: t, label: t }))}
                />

                <button
                  type="button"
                  onClick={() => setShowMore((s) => !s)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold bg-primary/15 text-primary hover:bg-primary/25 transition"
                >
                  {showMore ? "Less −" : "More +"}
                </button>
              </div>

              <AnimatePresence>
                {showMore && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/40">
                      <CheckDropdown
                        label="Grade Thresholds"
                        icon={LuTarget}
                        map={filters.gts}
                        onChange={(m) => update("gts", m)}
                        options={GRADE_THRESHOLDS.map((g) => ({ key: g, label: g }))}
                      />
                      <ColoredDropdown
                        label="Difficulty"
                        icon={LuFlame}
                        map={filters.difficulty}
                        onChange={(m) => update("difficulty", m)}
                        options={DIFFICULTIES.map((d) => ({
                          key: d,
                          label: d,
                          color: DIFFICULTY_COLORS[d],
                        }))}
                      />
                      <ColoredDropdown
                        label="Priority"
                        icon={LuStar}
                        map={filters.priority}
                        onChange={(m) => update("priority", m)}
                        options={PRIORITIES.map((p) => ({
                          key: p,
                          label: p,
                          color: PRIORITY_COLORS[p],
                        }))}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-border/40 items-center">
                <span className="text-xs font-bold text-muted-foreground">Sort:</span>
                <SortByPicker value={filters.sortBy} onChange={(s) => update("sortBy", s)} />
                <DirDropdown value={filters.sortDir} onChange={(d) => update("sortDir", d)} />

                <label className="ml-2 inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <Switch
                    checked={filters.excludeOldSyllabus}
                    onCheckedChange={(v) => update("excludeOldSyllabus", v)}
                  />
                  Exclude Old Syllabus (pre-2020)
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <Switch
                    checked={filters.hideLocked}
                    onCheckedChange={(v) => update("hideLocked", v)}
                  />
                  <LuEyeOff size={12} /> Hide locked
                </label>

                <button
                  type="button"
                  onClick={() => setFilters(makeDefaultQuestionFilters(subject))}
                  className="ml-auto px-3 py-1.5 rounded-full text-xs font-bold bg-muted text-muted-foreground hover:bg-muted/70 transition"
                >
                  Reset all
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TopicsDrawer({
  map,
  onChange,
  isLocked,
  subject,
}: {
  map: TriMap;
  onChange: (m: TriMap) => void;
  isLocked?: (key: string) => boolean;
  subject?: Subject;
}) {
  const visibleTopics = topicsForSubject(subject);
  const count = activeKeys(map).length;
  const allKeys = visibleTopics.flatMap((topic) => [
    topic.key,
    ...topic.lessons.map((lesson) => lesson.key),
  ]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const isLessonLocked = (topicKey: string, lessonKey: string) =>
    (isLocked?.(topicKey) ?? false) || (isLocked?.(lessonKey) ?? false);
  const unlockedTopicKeys = visibleTopics
    .filter((topic) => !isLocked?.(topic.key))
    .map((topic) => topic.key);
  const unlockedKeys = visibleTopics.flatMap((topic) => {
    if (isLocked?.(topic.key)) return [];
    return [
      topic.key,
      ...topic.lessons
        .filter((lesson) => !isLessonLocked(topic.key, lesson.key))
        .map((lesson) => lesson.key),
    ];
  });

  useState(() => {
    const next = { ...map };
    let changed = false;
    const visibleKeys = new Set(allKeys);

    Object.keys(next).forEach((key) => {
      if (!visibleKeys.has(key) && next[key] != null) {
        next[key] = null;
        changed = true;
      }
    });

    visibleTopics.forEach((topic) => {
      if ((isLocked?.(topic.key) ?? false) && next[topic.key] != null) {
        next[topic.key] = null;
        changed = true;
      }
      topic.lessons.forEach((lesson) => {
        if (isLessonLocked(topic.key, lesson.key) && next[lesson.key] != null) {
          next[lesson.key] = null;
          changed = true;
        }
      });
    });
    if (changed) onChange(next);
    return null;
  });

  const onTopicChange = (topicKey: string, v: "true" | "false" | "null" | boolean | null) => {
    if (isLocked?.(topicKey)) {
      goToPricing();
      return;
    }
    const lessons = visibleTopics.find((t) => t.key === topicKey)?.lessons.map((l) => l.key) ?? [];
    const next = { ...map, [topicKey]: v as any };
    lessons.forEach((l) => {
      if (!isLessonLocked(topicKey, l)) next[l] = v as any;
    });
    if (v === true) setExpanded((e) => ({ ...e, [topicKey]: true }));
    onChange(next);
  };

  const getTopicIcon = (label: string) => {
    const text = label.toLowerCase();
    if (
      text.includes("plant") ||
      text.includes("photosynthesis") ||
      text.includes("chlorophyll") ||
      text.includes("leaf") ||
      text.includes("xylem") ||
      text.includes("phloem") ||
      text.includes("transpiration")
    ) {
      return LuLeaf;
    }
    if (
      text.includes("enzyme") ||
      text.includes("chemical") ||
      text.includes("reaction") ||
      text.includes("acid") ||
      text.includes("molecule") ||
      text.includes("food tests") ||
      text.includes("nutrition") ||
      text.includes("digestion") ||
      text.includes("fermentation")
    ) {
      return FaFlask;
    }
    if (
      text.includes("current") ||
      text.includes("electric") ||
      text.includes("power") ||
      text.includes("energy") ||
      text.includes("charge") ||
      text.includes("force") ||
      text.includes("waves") ||
      text.includes("sound")
    ) {
      return LuBolt;
    }
    if (
      text.includes("respiration") ||
      text.includes("breathing") ||
      text.includes("heart") ||
      text.includes("blood") ||
      text.includes("kidney") ||
      text.includes("immune") ||
      text.includes("disease") ||
      text.includes("vaccination") ||
      text.includes("gas exchange") ||
      text.includes("circulatory")
    ) {
      return LuHeartPulse;
    }
    if (
      text.includes("osmosis") ||
      text.includes("diffusion") ||
      text.includes("transport") ||
      text.includes("translocation") ||
      text.includes("water")
    ) {
      return LuDroplet;
    }
    if (
      text.includes("classification") ||
      text.includes("ecosystem") ||
      text.includes("organism") ||
      text.includes("biodiversity") ||
      text.includes("pollution") ||
      text.includes("sustainability") ||
      text.includes("population") ||
      text.includes("food chain")
    ) {
      return LuGlobe;
    }
    return LuLayers;
  };

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <PopButton active={count > 0}>
          <LuBookOpen size={12} /> Topic{count > 0 && ` · ${count}`}
        </PopButton>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>Topics</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 overflow-auto">
          <FilterControls
            onAll={() => onChange(allTriMap(unlockedKeys))}
            onRandom={() => onChange(randomTriMap(unlockedTopicKeys))}
            onReset={() => onChange(buildTriMap(allKeys))}
          />
          <div className="space-y-5 max-w-2xl mx-auto">
            {(subject
              ? [{ subject, topics: visibleTopics }]
              : SUBJECTS.map((entry) => ({
                  subject: entry.key,
                  topics: visibleTopics.filter((topic) => topic.subject === entry.key),
                }))
            ).map((group) => {
              if (group.topics.length === 0) return null;
              const SubjectIcon = SUBJECT_ICON[group.subject];
              const subjectColors = SUBJECT_COLORS[group.subject];
              return (
                <div key={group.subject} className="space-y-3">
                  {!subject && (
                    <div
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold",
                        subjectColors.soft,
                        subjectColors.ring,
                      )}
                    >
                      <SubjectIcon size={12} />
                      {SUBJECT_LABEL[group.subject]}
                    </div>
                  )}
                  {group.topics.map((topic) => {
                    const isOpen = expanded[topic.key] ?? map[topic.key] === true;
                    const topicLocked = isLocked?.(topic.key) ?? false;
                    const TopicIcon = getTopicIcon(topic.label);
                    const topicColors = SUBJECT_COLORS[topic.subject];
                    return (
                      <Collapsible
                        key={topic.key}
                        open={isOpen}
                        onOpenChange={(o) => setExpanded((e) => ({ ...e, [topic.key]: o }))}
                      >
                        <div className="flex items-center gap-3 rounded-2xl bg-muted/30 px-4 py-3 text-base">
                          {topicLocked ? (
                            <button
                              type="button"
                              onClick={() => goToPricing()}
                              className="flex items-center gap-3 text-left font-semibold text-muted-foreground hover:text-foreground"
                            >
                              <span
                                className={cn(
                                  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border",
                                  topicColors.soft,
                                  topicColors.ring,
                                )}
                              >
                                <TopicIcon size={16} />
                              </span>
                              <span>{topic.label}</span>
                              <span className="text-primary text-xs ml-1">Pro</span>
                            </button>
                          ) : (
                            <TriCheckbox
                              value={map[topic.key] ?? null}
                              onChange={(v) => onTopicChange(topic.key, v)}
                              label={
                                <span className="flex items-center gap-3 font-semibold text-base">
                                  <span
                                    className={cn(
                                      "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border",
                                      topicColors.soft,
                                      topicColors.ring,
                                    )}
                                  >
                                    <TopicIcon size={16} />
                                  </span>
                                  <span>{topic.label}</span>
                                </span>
                              }
                            />
                          )}
                          <CollapsibleTrigger asChild>
                            <button type="button" className="ml-auto p-1 hover:bg-muted rounded">
                              <LuChevronDown
                                size={14}
                                className={cn("transition", isOpen && "rotate-180")}
                              />
                            </button>
                          </CollapsibleTrigger>
                        </div>
                        <CollapsibleContent>
                          <div className="ml-6 mt-1 space-y-1">
                            {topic.lessons.map((l) =>
                              isLessonLocked(topic.key, l.key) ? (
                                <button
                                  key={l.key}
                                  type="button"
                                  onClick={() => goToPricing()}
                                  className="flex items-center w-full text-left rounded-lg px-2 py-1 hover:bg-accent/40 transition"
                                >
                                  <span className="text-sm text-muted-foreground">{l.label}</span>
                                  <span className="ml-auto text-xs font-bold text-primary">
                                    Pro
                                  </span>
                                </button>
                              ) : (
                                <TriCheckbox
                                  key={l.key}
                                  value={map[l.key] ?? null}
                                  onChange={(v) => {
                                    if (isLessonLocked(topic.key, l.key)) {
                                      goToPricing();
                                      return;
                                    }
                                    onChange({ ...map, [l.key]: v });
                                  }}
                                  label={<span className="text-sm">{l.label}</span>}
                                />
                              ),
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function PopButton({
  active,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card border-border hover:border-primary/50",
        props.className,
      )}
    >
      {children}
    </button>
  );
}

function CheckDropdown({
  label,
  icon: Icon,
  map,
  onChange,
  options,
  isLocked,
}: {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  map: TriMap;
  onChange: (m: TriMap) => void;
  options: { key: string; label: string }[];
  isLocked?: (key: string) => boolean;
}) {
  const count = activeKeys(map).length;
  const keys = options.map((o) => o.key);
  // Bulk actions should only act on unlocked options.
  const unlockedKeys = isLocked ? keys.filter((k) => !isLocked(k)) : keys;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PopButton active={count > 0}>
          <Icon size={12} /> {label}
          {count > 0 && ` · ${count}`}
          <LuChevronDown size={12} />
        </PopButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 p-3">
        <FilterControls
          onAll={() => onChange({ ...map, ...allTriMap(unlockedKeys) })}
          onRandom={() => onChange({ ...map, ...randomTriMap(unlockedKeys) })}
          onReset={() => onChange({ ...map, ...buildTriMap(unlockedKeys) })}
        />
        <div className="space-y-1.5 max-h-60 overflow-auto">
          {options.map((opt) => {
            const locked = isLocked?.(opt.key) ?? false;
            if (locked) {
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => goToPricing()}
                  title="Locked — upgrade to unlock"
                  className="flex items-center gap-2 w-full text-left rounded-md px-1 py-0.5 hover:bg-accent transition group"
                >
                  <span className="h-4 w-4 rounded border-2 border-border bg-muted grid place-content-center shrink-0 group-hover:border-primary group-hover:text-primary transition">
                    <LuLock size={10} strokeWidth={2.5} />
                  </span>
                  <span className="text-sm text-muted-foreground group-hover:text-foreground">
                    {opt.label}
                  </span>
                  <span className="ml-auto text-[10px] font-bold text-primary uppercase tracking-wider">
                    Pro
                  </span>
                </button>
              );
            }
            return (
              <TriCheckbox
                key={opt.key}
                value={map[opt.key] ?? null}
                onChange={(v) => onChange({ ...map, [opt.key]: v })}
                label={opt.label}
              />
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ColoredDropdown({
  label,
  icon: Icon,
  map,
  onChange,
  options,
}: {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  map: TriMap;
  onChange: (m: TriMap) => void;
  options: { key: string; label: string; color: string }[];
}) {
  const count = activeKeys(map).length;
  const keys = options.map((o) => o.key);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PopButton active={count > 0}>
          <Icon size={12} /> {label}
          {count > 0 && ` · ${count}`}
          <LuChevronDown size={12} />
        </PopButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 p-3">
        <FilterControls
          onAll={() => onChange(allTriMap(keys))}
          onRandom={() => onChange(randomTriMap(keys))}
          onReset={() => onChange(buildTriMap(keys))}
        />
        <div className="space-y-1.5">
          {options.map((opt) => (
            <div
              key={opt.key}
              className={cn("flex items-center gap-2 rounded-lg px-2 py-1 border", opt.color)}
            >
              <TriCheckbox
                value={map[opt.key] ?? null}
                onChange={(v) => onChange({ ...map, [opt.key]: v })}
                label={<span className="capitalize">{opt.label}</span>}
              />
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const SORT_LABELS: Record<SortKey, string> = {
  year: "Year",
  session: "Session",
  variant: "Variant",
  subject: "Subject",
  qNumber: "Q number",
  difficulty: "Difficulty",
  priority: "Priority",
};

function SortByPicker({ value, onChange }: { value: SortKey; onChange: (s: SortKey) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PopButton>
          {SORT_LABELS[value]} <LuChevronDown size={12} />
        </PopButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <div className="p-1 min-w-[140px]">
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => onChange(k)}
              className={cn(
                "w-full text-left px-2 py-1.5 rounded-md text-xs hover:bg-accent",
                value === k && "bg-primary/15 text-primary font-bold",
              )}
            >
              {SORT_LABELS[k]}
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DirDropdown({ value, onChange }: { value: SortDir; onChange: (d: SortDir) => void }) {
  const labels: Record<SortDir, string> = { asc: "↑ Asc", desc: "↓ Desc", shuffle: "🔀 Shuffle" };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PopButton>
          {labels[value]} <LuChevronDown size={12} />
        </PopButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <div className="p-1 min-w-[120px]">
          {(["asc", "desc", "shuffle"] as SortDir[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onChange(d)}
              className={cn(
                "w-full text-left px-2 py-1.5 rounded-md text-xs hover:bg-accent",
                value === d && "bg-primary/15 text-primary font-bold",
              )}
            >
              {labels[d]}
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
