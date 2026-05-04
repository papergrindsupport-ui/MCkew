import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LuChevronDown,
  LuShuffle,
  LuArrowDown,
  LuArrowUp,
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
  LuLeaf,
  LuBolt,
  LuDroplet,
  LuHeartPulse,
  LuGlobe,
  LuArrowDownUp,
} from "react-icons/lu";
import { FaFlask } from "react-icons/fa";
import { cn } from "@/lib/utils";
import {
  type Paper,
  SUBJECTS,
  SUBJECT_COLORS,
  YEARS,
  SESSIONS,
  SESSION_VARIANTS,
  GRADE_THRESHOLDS,
  TOPICS,
  SKILLS,
  TAG_GROUPS,
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
  type TriState,
  buildTriMap,
  applyTriFilter,
  FilterControls,
  randomTriMap,
  allTriMap,
  activeKeys,
} from "./TriCheckbox";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { goToPricing, useUnlockStore } from "@/stores/useUnlockStore";

const ALL_VARIANTS = Array.from(new Set(Object.values(SESSION_VARIANTS).flat()));
const ALL_TOPIC_KEYS = TOPICS.map((t) => t.key);
const ALL_SKILL_KEYS = SKILLS.flatMap((s) => s.sub.map((x) => x.key));

export type SortKey =
  | "year"
  | "session"
  | "variant"
  | "subject"
  | "gradeThresholds"
  | "tags"
  | "difficulty"
  | "priority";
export type SortDir = "asc" | "desc" | "shuffle";

export interface GeneratorFilters {
  subjects: TriMap;
  years: TriMap;
  sessions: TriMap;
  variants: TriMap;
  gts: TriMap;
  topics: TriMap;
  skills: TriMap;
  tags: TriMap;
  difficulty: TriMap;
  priority: TriMap;
  sortBy: SortKey;
  sortDir: SortDir;
}

export function makeDefaultFilters(): GeneratorFilters {
  return {
    subjects: buildTriMap(SUBJECTS.map((s) => s.key)),
    years: buildTriMap(YEARS.map(String)),
    sessions: buildTriMap(SESSIONS.map((s) => s.key)),
    variants: buildTriMap(ALL_VARIANTS),
    gts: buildTriMap(GRADE_THRESHOLDS),
    topics: buildTriMap(ALL_TOPIC_KEYS),
    skills: buildTriMap(ALL_SKILL_KEYS),
    tags: buildTriMap(ALL_TAGS),
    difficulty: buildTriMap(DIFFICULTIES),
    priority: buildTriMap(PRIORITIES),
    sortBy: "year",
    sortDir: "desc",
  };
}

export function applyFilters(papers: Paper[], f: GeneratorFilters): Paper[] {
  let out = papers;
  out = applyTriFilter(out, f.subjects, (p) => [p.subject]);
  out = applyTriFilter(out, f.years, (p) => [String(p.year)]);
  out = applyTriFilter(out, f.sessions, (p) => [p.session]);
  out = applyTriFilter(out, f.variants, (p) => [p.variant]);
  out = applyTriFilter(out, f.gts, (p) => p.gradeThresholds);
  out = applyTriFilter(out, f.topics, (p) => p.topics);
  out = applyTriFilter(out, f.skills, (p) => p.skills);
  out = applyTriFilter(out, f.tags, (p) => p.tags);
  out = applyTriFilter(out, f.difficulty, (p) => (p.difficulty ? [p.difficulty] : []));
  out = applyTriFilter(out, f.priority, (p) => (p.priority ? [p.priority] : []));

  const dir = f.sortDir;
  if (dir === "shuffle") {
    out = [...out].sort(() => Math.random() - 0.5);
  } else {
    const m = dir === "asc" ? 1 : -1;
    const get = (p: Paper): string | number => {
      switch (f.sortBy) {
        case "year":
          return p.year;
        case "session":
          return p.session;
        case "variant":
          return p.variant;
        case "subject":
          return p.subject;
        case "gradeThresholds":
          return p.gradeThresholds[0] ?? "";
        case "tags":
          return p.tags[0] ?? "";
        case "difficulty":
          return p.difficulty ?? "";
        case "priority":
          return p.priority ?? "";
      }
    };
    out = [...out].sort((a, b) => {
      const av = get(a),
        bv = get(b);
      if (av < bv) return -1 * m;
      if (av > bv) return 1 * m;
      return 0;
    });
  }
  return out;
}

export function Generator({
  filters,
  setFilters,
  resultCount,
}: {
  filters: GeneratorFilters;
  setFilters: (f: GeneratorFilters) => void;
  resultCount: number;
}) {
  const [showMore, setShowMore] = useState(false);
  const [open, setOpen] = useState(true);
  const isYearLocked = useUnlockStore((s) => s.isYearLocked);
  const isTopicLocked = useUnlockStore((s) => s.isTopicLocked);
  const update = <K extends keyof GeneratorFilters>(k: K, v: GeneratorFilters[K]) =>
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
          <span className="text-xs text-muted-foreground">· {resultCount} papers</span>
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
                <CheckDropdown
                  label="Subject"
                  icon={LuLayers}
                  map={filters.subjects}
                  onChange={(m) => update("subjects", m)}
                  options={SUBJECTS.map((s) => ({ key: s.key, label: s.label }))}
                />
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
                  label="Session"
                  icon={LuClock}
                  map={filters.sessions}
                  onChange={(m) => update("sessions", m)}
                  options={SESSIONS.map((s) => ({ key: s.key, label: s.label }))}
                />
                <CheckDropdown
                  label="Variant"
                  icon={LuHash}
                  map={filters.variants}
                  onChange={(m) => update("variants", m)}
                  options={ALL_VARIANTS.map((v) => ({ key: v, label: v }))}
                />
                <CheckDropdown
                  label="Grade Thresholds"
                  icon={LuTarget}
                  map={filters.gts}
                  onChange={(m) => update("gts", m)}
                  options={GRADE_THRESHOLDS.map((g) => ({ key: g, label: g }))}
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
                      <TopicsDrawer
                        map={filters.topics}
                        onChange={(m) => update("topics", m)}
                        isLocked={(k) => isTopicLocked(k)}
                      />
                      <SkillsDropdown map={filters.skills} onChange={(m) => update("skills", m)} />
                      <TagsDrawer map={filters.tags} onChange={(m) => update("tags", m)} />
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

              {/* Sort row */}
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/40 items-center">
                <span className="text-xs font-bold text-muted-foreground">Sort by:</span>
                <SortByPicker value={filters.sortBy} onChange={(s) => update("sortBy", s)} />
                <DirDropdown value={filters.sortDir} onChange={(d) => update("sortDir", d)} />
                <button
                  type="button"
                  onClick={() => setFilters(makeDefaultFilters())}
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

/* ======== Sub-components ======== */

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
                  className="flex items-center gap-2 w-full text-left rounded-md px-1 py-0.5 hover:bg-accent transition group"
                >
                  <span className="text-xs text-muted-foreground group-hover:text-foreground">
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

function TopicsDrawer({
  map,
  onChange,
  isLocked,
}: {
  map: TriMap;
  onChange: (m: TriMap) => void;
  isLocked?: (key: string) => boolean;
}) {
  const count = activeKeys(map).length;
  const allKeys = [...ALL_TOPIC_KEYS, ...TOPICS.flatMap((t) => t.lessons.map((l) => l.key))];
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const isLessonLocked = (topicKey: string, lessonKey: string) =>
    (isLocked?.(topicKey) ?? false) || (isLocked?.(lessonKey) ?? false);
  const unlockedKeys = groupedTopicKeys(TOPICS, isLessonLocked, isLocked);
  const unlockedTopicKeys = TOPICS.filter((topic) => !isLocked?.(topic.key)).map(
    (topic) => topic.key,
  );

  useState(() => {
    const next = { ...map };
    let changed = false;
    TOPICS.forEach((topic) => {
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

  const onTopicChange = (topicKey: string, v: TriState) => {
    if (isLocked?.(topicKey)) {
      goToPricing();
      return;
    }
    const lessons = TOPICS.find((t) => t.key === topicKey)?.lessons.map((l) => l.key) ?? [];
    const next = { ...map, [topicKey]: v };
    lessons.forEach((l) => {
      if (!isLessonLocked(topicKey, l)) next[l] = v;
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

  const SUBJECT_LABEL: Record<Subject, string> = {
    bio: "Biology",
    chem: "Chemistry",
    phys: "Physics",
  };
  const grouped = (["bio", "chem", "phys"] as Subject[]).map((s) => ({
    subject: s,
    label: SUBJECT_LABEL[s],
    topics: TOPICS.filter((t) => t.subject === s),
  }));

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
            {grouped.map((group) => (
              <div key={group.subject}>
                <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {group.label}
                </p>
                <div className="space-y-2">
                  {group.topics.map((topic) => {
                    const isOpen = expanded[topic.key] ?? map[topic.key] === true;
                    const topicLocked = isLocked?.(topic.key) ?? false;
                    const topicColors = SUBJECT_COLORS[topic.subject];
                    const TopicIcon = getTopicIcon(topic.label);
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
              </div>
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function groupedTopicKeys(
  topics: typeof TOPICS,
  isLessonLocked: (topicKey: string, lessonKey: string) => boolean,
  isLocked?: (key: string) => boolean,
) {
  return topics.flatMap((topic) => {
    if (isLocked?.(topic.key)) return [];
    return [
      topic.key,
      ...topic.lessons
        .filter((lesson) => !isLessonLocked(topic.key, lesson.key))
        .map((lesson) => lesson.key),
    ];
  });
}

function SkillsDropdown({ map, onChange }: { map: TriMap; onChange: (m: TriMap) => void }) {
  const count = activeKeys(map).length;
  const allKeys = ALL_SKILL_KEYS;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PopButton active={count > 0}>
          <LuBrain size={12} /> Skill{count > 0 && ` · ${count}`}
          <LuChevronDown size={12} />
        </PopButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 p-3 max-h-80 overflow-auto">
        <FilterControls
          onAll={() => onChange(allTriMap(allKeys))}
          onRandom={() => onChange(randomTriMap(allKeys))}
          onReset={() => onChange(buildTriMap(allKeys))}
        />
        <div className="space-y-2">
          {SKILLS.map((cat) => {
            const subKeys = cat.sub.map((s) => s.key);
            const allChecked = subKeys.every((k) => map[k] === true);
            return (
              <Collapsible key={cat.key} defaultOpen={allChecked}>
                <div className="flex items-center gap-2 rounded-lg bg-muted/30 px-2 py-1">
                  <TriCheckbox
                    value={allChecked ? true : null}
                    onChange={(v) => {
                      const next = { ...map };
                      subKeys.forEach((k) => {
                        next[k] = v === true ? true : null;
                      });
                      onChange(next);
                    }}
                    label={<span className="font-bold">{cat.label}</span>}
                  />
                  <CollapsibleTrigger asChild>
                    <button type="button" className="ml-auto p-1">
                      <LuChevronDown size={14} />
                    </button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <div className="ml-5 mt-1 space-y-1">
                    {cat.sub.map((s) => (
                      <TriCheckbox
                        key={s.key}
                        value={map[s.key] ?? null}
                        onChange={(v) => onChange({ ...map, [s.key]: v })}
                        label={s.label}
                      />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TagsDrawer({ map, onChange }: { map: TriMap; onChange: (m: TriMap) => void }) {
  const count = activeKeys(map).length;
  return (
    <Sheet>
      <SheetTrigger asChild>
        <PopButton active={count > 0}>
          <LuTag size={12} /> Tags{count > 0 && ` · ${count}`}
        </PopButton>
      </SheetTrigger>
      <SheetContent className="w-[380px] overflow-auto">
        <SheetHeader>
          <SheetTitle>Tags</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <FilterControls
            onAll={() => onChange(allTriMap(ALL_TAGS))}
            onRandom={() => onChange(randomTriMap(ALL_TAGS))}
            onReset={() => onChange(buildTriMap(ALL_TAGS))}
          />
          <div className="space-y-4">
            {TAG_GROUPS.map((g) => (
              <div key={g.label}>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {g.label}
                </p>
                <div className="space-y-1">
                  {g.tags.map((t) => (
                    <TriCheckbox
                      key={t}
                      value={map[t] ?? null}
                      onChange={(v) => onChange({ ...map, [t]: v })}
                      label={t}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SortByPicker({ value, onChange }: { value: SortKey; onChange: (s: SortKey) => void }) {
  const options: SortKey[] = [
    "year",
    "session",
    "variant",
    "subject",
    "gradeThresholds",
    "tags",
    "difficulty",
    "priority",
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PopButton active>
          {value} <LuChevronDown size={12} />
        </PopButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="p-1">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={cn(
              "w-full text-left px-3 py-1.5 rounded text-xs hover:bg-muted capitalize",
              value === opt && "bg-primary/15 text-primary font-bold",
            )}
          >
            {opt}
          </button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DirDropdown({ value, onChange }: { value: SortDir; onChange: (d: SortDir) => void }) {
  const opts: { key: SortDir; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
    { key: "asc", label: "Ascending", Icon: LuArrowUp },
    { key: "desc", label: "Descending", Icon: LuArrowDown },
    { key: "shuffle", label: "Shuffle", Icon: LuShuffle },
  ];
  const current = opts.find((o) => o.key === value)!;
  const CurrentIcon = current.Icon;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <PopButton active>
          <LuArrowDownUp size={12} /> <CurrentIcon size={12} /> {current.label}
          <LuChevronDown size={12} />
        </PopButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="p-1 min-w-[160px]">
        {opts.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={cn(
              "w-full text-left px-3 py-1.5 rounded text-xs hover:bg-muted flex items-center gap-2",
              value === key && "bg-primary/15 text-primary font-bold",
            )}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
