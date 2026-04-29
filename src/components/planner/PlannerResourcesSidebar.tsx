import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  LuBookOpen,
  LuChevronLeft,
  LuChevronRight,
  LuFileText,
  LuGripVertical,
  LuLayers,
  LuPlus,
  LuSearch,
} from "react-icons/lu";
import { getMergedPapers } from "@/admin/merge";
import { subscribeAdminStore } from "@/admin/store";
import { SUBJECT_LABEL, SUBJECTS, SESSION_LABEL, type Paper, type Subject } from "@/data/paperData";
import { TOPICS } from "@/data/topics";
import {
  createTaskFromPlannerResource,
  setPlannerResourceDrag,
  type PlannerResourcePayload,
} from "@/lib/plannerResourceDrag";
import { cn } from "@/lib/utils";

type LessonResource = PlannerResourcePayload & {
  id: string;
  subject: Subject;
  topic: string;
};

type Variant = "papers" | "lessons";

export function PlannerResourcesSidebar({
  variant = "papers",
  side = "left",
}: {
  variant?: Variant;
  side?: "left" | "right";
}) {
  const storageKey = `planner-sidebar-collapsed:${variant}:${side}`;
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const raw = window.localStorage.getItem(storageKey);
    // Default: collapsed
    return raw === null ? true : raw === "1";
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, collapsed ? "1" : "0");
    } catch {
      /* ignore quota errors */
    }
  }, [collapsed, storageKey]);
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState<Subject | "all">("all");
  const papers = useSyncExternalStore(subscribeAdminStore, getMergedPapers, getMergedPapers);

  const paperItems = useMemo(() => {
    if (variant !== "papers") return [];
    const q = query.trim().toLowerCase();
    return papers
      .filter((p) => (subject === "all" ? true : p.subject === subject))
      .filter((p) => !q || paperText(p).includes(q))
      .sort((a, b) => b.year - a.year || a.subject.localeCompare(b.subject))
      .slice(0, 60);
  }, [papers, query, subject, variant]);

  const lessons = useMemo(() => {
    if (variant !== "lessons") return [];
    const q = query.trim().toLowerCase();
    return TOPICS.flatMap((topic) =>
      topic.lessons.map((lesson) => ({
        id: `${topic.key}:${lesson.key}`,
        kind: "lesson" as const,
        subject: topic.subject,
        topic: topic.label,
        title: lesson.label,
        subtitle: `${SUBJECT_LABEL[topic.subject]} · ${topic.label}`,
        description: `Review ${lesson.label} in ${topic.label}.`,
        tags: [SUBJECT_LABEL[topic.subject], topic.label],
      })),
    )
      .filter((l) => (subject === "all" ? true : l.subject === subject))
      .filter((l) => !q || `${l.title} ${l.subtitle} ${l.description}`.toLowerCase().includes(q))
      .slice(0, 60);
  }, [query, subject, variant]);

  const isPapers = variant === "papers";
  const heading = isPapers ? "Past papers" : "Topics & lessons";
  const HeadIcon = isPapers ? LuFileText : LuBookOpen;
  const ChevExpanded = side === "left" ? LuChevronLeft : LuChevronRight;
  const ChevCollapsed = side === "left" ? LuChevronRight : LuChevronLeft;

  return (
    <aside
      className={cn(
        "lg:sticky lg:top-20 h-fit rounded-2xl border-2 border-border bg-card transition-all overflow-hidden",
        collapsed ? "lg:w-14" : "lg:w-72",
      )}
    >
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <HeadIcon className="text-primary shrink-0" size={18} />
        {!collapsed && <h2 className="font-bold text-sm">{heading}</h2>}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="ml-auto w-8 h-8 rounded-full grid place-items-center hover:bg-muted/60 transition"
          aria-label={collapsed ? `Expand ${heading}` : `Collapse ${heading}`}
        >
          {collapsed ? <ChevCollapsed size={16} /> : <ChevExpanded size={16} />}
        </button>
      </div>

      {collapsed ? (
        <div className="hidden lg:flex flex-col items-center gap-3 py-4 text-muted-foreground">
          <LuSearch size={18} />
          <HeadIcon size={18} />
          <LuLayers size={18} />
        </div>
      ) : (
        <div className="p-3 space-y-3 max-h-[calc(100dvh-7rem)] overflow-y-auto">
          <div className="relative">
            <LuSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={14}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isPapers ? "Search papers" : "Search lessons"}
              className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-border bg-background text-sm outline-none focus:border-primary transition"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <SubjectChip label="All" active={subject === "all"} onClick={() => setSubject("all")} />
            {SUBJECTS.map((s) => (
              <SubjectChip
                key={s.key}
                label={s.short}
                active={subject === s.key}
                onClick={() => setSubject(s.key)}
              />
            ))}
          </div>
          {isPapers ? (
            <ResourceGroup
              title="Past papers"
              icon={<LuFileText size={14} />}
              count={paperItems.length}
            >
              {paperItems.map((paper) => (
                <PaperResource key={paper.id} paper={paper} />
              ))}
            </ResourceGroup>
          ) : (
            <ResourceGroup title="Lessons" icon={<LuBookOpen size={14} />} count={lessons.length}>
              {lessons.map((lesson) => (
                <LessonResourceCard key={lesson.id} lesson={lesson} />
              ))}
            </ResourceGroup>
          )}
        </div>
      )}
    </aside>
  );
}

function paperText(p: Paper) {
  return `${p.title} ${SUBJECT_LABEL[p.subject]} ${p.year} ${SESSION_LABEL[p.session]} ${p.variant} ${p.tags.join(" ")} ${p.topics.join(" ")}`.toLowerCase();
}

function SubjectChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 px-2.5 py-1 rounded-full border-2 text-xs font-bold transition",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card border-border hover:border-primary/60",
      )}
    >
      {label}
    </button>
  );
}

function ResourceGroup({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: ReactNode;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wide">
        {icon} {title} <span className="ml-auto">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function PaperResource({ paper }: { paper: Paper }) {
  const payload: PlannerResourcePayload = {
    kind: "paper",
    title: `Solve ${SUBJECT_LABEL[paper.subject]} ${paper.title}`,
    subtitle: `${SESSION_LABEL[paper.session]} · ${paper.variant}`,
    description: `Past paper task for ${SUBJECT_LABEL[paper.subject]} ${paper.year}.`,
    tags: [SUBJECT_LABEL[paper.subject], String(paper.year), SESSION_LABEL[paper.session]],
    link: `/smart-solve-papers/${paper.id}`,
  };
  return (
    <ResourceCard
      payload={payload}
      meta={`${SUBJECT_LABEL[paper.subject]} · ${paper.year}`}
      icon={<LuFileText size={14} />}
    />
  );
}

function LessonResourceCard({ lesson }: { lesson: LessonResource }) {
  return (
    <ResourceCard
      payload={lesson}
      meta={lesson.subtitle ?? lesson.topic}
      icon={<LuBookOpen size={14} />}
    />
  );
}

function ResourceCard({
  payload,
  meta,
  icon,
}: {
  payload: PlannerResourcePayload;
  meta?: string;
  icon: ReactNode;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => setPlannerResourceDrag(e, payload)}
      className="group rounded-xl border-2 border-border bg-background p-2.5 hover:border-primary/60 transition shadow-sm"
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-primary">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight break-words">{payload.title}</p>
          {meta && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{meta}</p>}
        </div>
        <LuGripVertical size={14} className="text-muted-foreground opacity-60" />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => createTaskFromPlannerResource(payload)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 transition"
        >
          <LuPlus size={12} /> Add
        </button>
        {payload.link && (
          <a
            href={payload.link}
            className="text-[11px] font-bold text-muted-foreground hover:text-primary transition"
          >
            Open
          </a>
        )}
      </div>
    </div>
  );
}
