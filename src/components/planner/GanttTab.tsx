// Gantt tab — modern timeline with drag-to-move + drag-edges-to-resize.
// Day / week / month zoom. Tasks colored by status (today / overdue / done).

import { useMemo, useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LuPlus, LuZoomIn, LuZoomOut, LuChevronLeft, LuChevronRight } from "react-icons/lu";
import {
  usePlannerTasks,
  type Task,
  createTask,
  updateTask,
  isOverdue,
  isToday,
} from "@/lib/plannerTasksStore";
import {
  createTaskFromPlannerResource,
  hasPlannerResourceDrag,
  readPlannerResourceDrag,
} from "@/lib/plannerResourceDrag";
import { TaskModal } from "./TaskModal";
import { cn } from "@/lib/utils";

type Zoom = "day" | "week" | "month";

const ZOOM_PX: Record<Zoom, number> = {
  day: 60,
  week: 28,
  month: 12,
};

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const parseYmd = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const dayDiff = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);

const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

function getEffectiveRange(task: Task): { start: string; end: string } | null {
  if (task.startDate && task.endDate) return { start: task.startDate, end: task.endDate };
  if (task.dueDate) return { start: task.dueDate, end: task.dueDate };
  return null;
}

export function GanttTab() {
  const { tasks } = usePlannerTasks();
  const [zoom, setZoom] = useState<Zoom>("week");
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [externalOver, setExternalOver] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  });

  const dayPx = ZOOM_PX[zoom];
  const totalDays = zoom === "day" ? 30 : zoom === "week" ? 84 : 180;

  const days = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < totalDays; i++) arr.push(addDays(anchor, i));
    return arr;
  }, [anchor, totalDays]);

  const todayYmd = ymd(new Date());
  const todayIdx = days.findIndex((d) => ymd(d) === todayYmd);

  // Tasks with dates
  const scheduled = useMemo(() => {
    return tasks
      .map((t) => ({ task: t, range: getEffectiveRange(t) }))
      .filter((x) => x.range !== null) as { task: Task; range: { start: string; end: string } }[];
  }, [tasks]);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => setAnchor((a) => addDays(a, -Math.round(totalDays / 2)))}
          className="w-8 h-8 rounded-full border-2 border-border bg-card grid place-items-center hover:border-primary cursor-pointer transition"
          aria-label="Earlier"
        >
          <LuChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => {
            const d = new Date();
            d.setDate(d.getDate() - Math.round(totalDays / 4));
            setAnchor(d);
          }}
          className="px-3 py-1.5 rounded-full border-2 border-border bg-card text-xs font-bold hover:border-primary cursor-pointer transition"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setAnchor((a) => addDays(a, Math.round(totalDays / 2)))}
          className="w-8 h-8 rounded-full border-2 border-border bg-card grid place-items-center hover:border-primary cursor-pointer transition"
          aria-label="Later"
        >
          <LuChevronRight size={16} />
        </button>

        <div className="ml-auto flex items-center gap-2">
          <div className="inline-flex rounded-full border-2 border-border bg-card p-0.5">
            {(["day", "week", "month"] as Zoom[]).map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZoom(z)}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-full transition cursor-pointer capitalize",
                  zoom === z
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {z}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setZoom(zoom === "month" ? "week" : zoom === "week" ? "day" : "day")}
            className="w-8 h-8 rounded-full border-2 border-border bg-card grid place-items-center hover:border-primary cursor-pointer transition"
            aria-label="Zoom in"
          >
            <LuZoomIn size={14} />
          </button>
          <button
            type="button"
            onClick={() => setZoom(zoom === "day" ? "week" : zoom === "week" ? "month" : "month")}
            className="w-8 h-8 rounded-full border-2 border-border bg-card grid place-items-center hover:border-primary cursor-pointer transition"
            aria-label="Zoom out"
          >
            <LuZoomOut size={14} />
          </button>
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              const t = createTask({
                title: "New task",
                startDate: ymd(today),
                endDate: ymd(addDays(today, 2)),
              });
              setOpenTaskId(t.id);
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition cursor-pointer"
          >
            <LuPlus size={14} /> Task
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div
        className={cn(
          "rounded-2xl border-2 bg-card overflow-hidden transition",
          externalOver ? "border-primary bg-primary/5" : "border-border",
        )}
      >
        <div
          ref={timelineRef}
          className="overflow-x-auto"
          onDragOver={(e) => {
            if (!hasPlannerResourceDrag(e)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            setExternalOver(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setExternalOver(false);
          }}
          onDrop={(e) => {
            const resource = readPlannerResourceDrag(e);
            if (!resource || !timelineRef.current) return;
            e.preventDefault();
            setExternalOver(false);
            const rect = timelineRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left + timelineRef.current.scrollLeft - 240;
            const offset = Math.max(0, Math.round(x / dayPx));
            const date = ymd(addDays(anchor, offset));
            const task = createTaskFromPlannerResource(resource, {
              startDate: date,
              endDate: date,
              dueDate: date,
            });
            setOpenTaskId(task.id);
          }}
        >
          <div style={{ minWidth: totalDays * dayPx + 240 }}>
            {/* Header row */}
            <div className="flex border-b border-border bg-muted/30 sticky top-0 z-10">
              <div className="shrink-0 w-60 px-3 py-2 text-xs font-bold text-muted-foreground border-r border-border">
                Task
              </div>
              <div className="flex-1 flex">
                {days.map((d, i) => {
                  const isMonthStart = d.getDate() === 1;
                  const isWeekStart = d.getDay() === 1;
                  const showLabel =
                    zoom === "day" ||
                    (zoom === "week" && isWeekStart) ||
                    (zoom === "month" && isMonthStart);
                  return (
                    <div
                      key={i}
                      style={{ width: dayPx }}
                      className={cn(
                        "shrink-0 text-[10px] text-center border-r border-border/40 py-2",
                        i === todayIdx && "bg-primary/10 text-primary font-bold",
                        d.getDay() === 0 || d.getDay() === 6 ? "bg-muted/40" : "",
                      )}
                    >
                      {showLabel ? (
                        <div className="font-bold">
                          {zoom === "month"
                            ? d.toLocaleDateString(undefined, { month: "short", year: "2-digit" })
                            : zoom === "week"
                              ? `${d.getDate()}/${d.getMonth() + 1}`
                              : d.getDate()}
                        </div>
                      ) : (
                        <span className="opacity-30">·</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Body rows */}
            {scheduled.length === 0 && (
              <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                No scheduled tasks. Add a task with a date or schedule one in the Kanban tab.
              </div>
            )}
            {scheduled.map(({ task, range }) => (
              <GanttRow
                key={task.id}
                task={task}
                range={range}
                anchor={anchor}
                totalDays={totalDays}
                dayPx={dayPx}
                onOpen={() => setOpenTaskId(task.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <TaskModal taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
    </div>
  );
}

function GanttRow({
  task,
  range,
  anchor,
  totalDays,
  dayPx,
  onOpen,
}: {
  task: Task;
  range: { start: string; end: string };
  anchor: Date;
  totalDays: number;
  dayPx: number;
  onOpen: () => void;
}) {
  const start = parseYmd(range.start);
  const end = parseYmd(range.end);
  const startOffset = dayDiff(anchor, start);
  const span = Math.max(1, dayDiff(start, end) + 1);

  // Drag state for move + resize edges
  const [dragMode, setDragMode] = useState<null | "move" | "left" | "right">(null);
  const [dragDelta, setDragDelta] = useState(0); // days
  const dragStartXRef = useRef(0);
  const initialOffsetRef = useRef(startOffset);
  const initialSpanRef = useRef(span);

  useEffect(() => {
    if (!dragMode) return;
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - dragStartXRef.current;
      setDragDelta(Math.round(dx / dayPx));
    };
    const onUp = () => {
      const delta = dragDelta;
      if (delta !== 0) {
        if (dragMode === "move") {
          const newStart = addDays(parseYmd(range.start), delta);
          const newEnd = addDays(parseYmd(range.end), delta);
          updateTask(task.id, {
            startDate: ymd(newStart),
            endDate: ymd(newEnd),
            dueDate: ymd(newEnd),
          });
        } else if (dragMode === "left") {
          const newStart = addDays(parseYmd(range.start), delta);
          if (newStart <= parseYmd(range.end)) {
            updateTask(task.id, { startDate: ymd(newStart) });
          }
        } else if (dragMode === "right") {
          const newEnd = addDays(parseYmd(range.end), delta);
          if (newEnd >= parseYmd(range.start)) {
            updateTask(task.id, { endDate: ymd(newEnd), dueDate: ymd(newEnd) });
          }
        }
      }
      setDragMode(null);
      setDragDelta(0);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragMode, dragDelta, dayPx, range.start, range.end, task.id]);

  const startDrag = (mode: "move" | "left" | "right") => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    dragStartXRef.current = e.clientX;
    initialOffsetRef.current = startOffset;
    initialSpanRef.current = span;
    setDragMode(mode);
  };

  const liveOffset =
    dragMode === "move" || dragMode === "left"
      ? initialOffsetRef.current + dragDelta
      : initialOffsetRef.current;
  const liveSpan =
    dragMode === "right"
      ? Math.max(1, initialSpanRef.current + dragDelta)
      : dragMode === "left"
        ? Math.max(1, initialSpanRef.current - dragDelta)
        : initialSpanRef.current;

  // Visible portion (clip if outside viewport range)
  const visibleStart = Math.max(0, liveOffset);
  const visibleSpan = Math.min(totalDays - visibleStart, liveSpan - (visibleStart - liveOffset));

  const overdue = isOverdue(task);
  const today = isToday(task);
  const completed = task.completed;

  const barColor = completed
    ? "bg-emerald-500/85 border-emerald-600"
    : overdue
      ? "bg-destructive/85 border-destructive"
      : today
        ? "bg-primary border-primary"
        : "bg-foreground/70 border-foreground/80";

  return (
    <div className="flex border-b border-border/60 hover:bg-muted/20 transition">
      <div className="shrink-0 w-60 px-3 py-2 text-sm border-r border-border truncate flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            updateTask(task.id, { completed: !task.completed });
          }}
          className={cn(
            "w-4 h-4 rounded border-2 grid place-items-center text-[10px] shrink-0 transition cursor-pointer",
            task.completed
              ? "bg-emerald-500 border-emerald-500 text-white"
              : "border-border hover:border-primary",
          )}
          aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
        >
          {task.completed ? "✓" : ""}
        </button>
        <button
          type="button"
          onClick={onOpen}
          className={cn(
            "truncate text-left hover:text-primary transition cursor-pointer flex-1",
            completed && "line-through text-muted-foreground",
          )}
        >
          {task.title}
        </button>
      </div>

      <div className="flex-1 relative h-12">
        {/* Today marker line */}
        {(() => {
          const tIdx = dayDiff(anchor, new Date(new Date().setHours(0, 0, 0, 0)));
          if (tIdx < 0 || tIdx >= totalDays) return null;
          return (
            <div
              className="absolute top-0 bottom-0 w-px bg-primary/60 pointer-events-none"
              style={{ left: tIdx * dayPx + dayPx / 2 }}
            />
          );
        })()}

        {visibleSpan > 0 && (
          <motion.div
            layout={false}
            onPointerDown={startDrag("move")}
            onClick={(e) => {
              if (Math.abs(dragDelta) > 0) return;
              e.stopPropagation();
              onOpen();
            }}
            className={cn(
              "absolute top-2 h-8 rounded-lg border-2 cursor-grab active:cursor-grabbing select-none flex items-center px-2 shadow-sm hover:shadow-md transition",
              barColor,
              completed && "opacity-80",
              dragMode && "shadow-xl",
            )}
            style={{
              left: visibleStart * dayPx + 1,
              width: visibleSpan * dayPx - 2,
            }}
          >
            {/* Left resize handle */}
            <div
              onPointerDown={startDrag("left")}
              className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize"
              aria-label="Resize start"
            />
            <span
              className={cn(
                "text-[11px] font-bold text-white truncate pointer-events-none",
                completed && "line-through opacity-90",
              )}
            >
              {task.title}
            </span>
            {/* Right resize handle */}
            <div
              onPointerDown={startDrag("right")}
              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize"
              aria-label="Resize end"
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
