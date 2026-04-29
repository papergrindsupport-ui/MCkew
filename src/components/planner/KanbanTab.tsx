// Kanban tab — drag tasks between columns + reorder within column.
// Click a task to open the shared TaskModal.

import { useState, useMemo } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { LuPlus, LuTrash2, LuPencil, LuStickyNote, LuPalette, LuClock } from "react-icons/lu";
import {
  usePlannerTasks,
  type Task,
  type Column,
  createTask,
  createColumn,
  updateColumn,
  deleteColumn,
  updateTask,
  moveTask,
  isOverdue,
} from "@/lib/plannerTasksStore";
import {
  createTaskFromPlannerResource,
  hasPlannerResourceDrag,
  readPlannerResourceDrag,
} from "@/lib/plannerResourceDrag";
import { TaskModal } from "./TaskModal";
import { cn } from "@/lib/utils";

const COLUMN_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#0ea5e9",
];

export function KanbanTab() {
  const { columns, tasks } = usePlannerTasks();
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const sortedColumns = useMemo(() => [...columns].sort((a, b) => a.order - b.order), [columns]);

  const tasksByColumn = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const c of columns) map[c.id] = [];
    for (const t of tasks) {
      if (!map[t.columnId]) map[t.columnId] = [];
      map[t.columnId].push(t);
    }
    for (const id of Object.keys(map)) map[id].sort((a, b) => a.order - b.order);
    return map;
  }, [tasks, columns]);

  const activeTask = activeDragId ? tasks.find((t) => t.id === activeDragId) : null;

  const onDragStart = (e: DragStartEvent) => setActiveDragId(String(e.active.id));

  const onDragEnd = (e: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Dropped on a column container
    const targetCol =
      columns.find((c) => c.id === overId) ||
      columns.find((c) => c.id === tasks.find((t) => t.id === overId)?.columnId);
    if (!targetCol) return;

    const colTasks = tasksByColumn[targetCol.id] ?? [];
    let toIndex = colTasks.length;
    if (overId !== targetCol.id) {
      const overIdx = colTasks.findIndex((t) => t.id === overId);
      if (overIdx >= 0) toIndex = overIdx;
    }
    moveTask(activeId, targetCol.id, toIndex);
  };

  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-3 -mx-2 px-2">
          {sortedColumns.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={tasksByColumn[col.id] ?? []}
              onOpenTask={setOpenTaskId}
            />
          ))}
          <button
            type="button"
            onClick={() =>
              createColumn(
                "New column",
                COLUMN_COLORS[Math.floor(Math.random() * COLUMN_COLORS.length)],
              )
            }
            className="shrink-0 w-72 h-fit rounded-2xl border-2 border-dashed border-border bg-card/50 hover:border-primary hover:text-primary text-muted-foreground text-sm font-bold py-4 transition cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <LuPlus size={16} /> Add column
          </button>
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="rotate-2">
              <TaskCard task={activeTask} onOpen={() => {}} dragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskModal taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
    </div>
  );
}

function KanbanColumn({
  column,
  tasks,
  onOpenTask,
}: {
  column: Column;
  tasks: Task[];
  onOpenTask: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useSortable({ id: column.id });
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(column.title);
  const [showColors, setShowColors] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(column.notes);
  const [externalOver, setExternalOver] = useState(false);

  return (
    <div
      ref={setNodeRef}
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
        if (!resource) return;
        e.preventDefault();
        setExternalOver(false);
        const task = createTaskFromPlannerResource(resource, { columnId: column.id });
        onOpenTask(task.id);
      }}
      className={cn(
        "shrink-0 w-72 rounded-2xl border-2 bg-card/70 transition flex flex-col max-h-[70vh]",
        isOver || externalOver ? "border-primary" : "border-border",
        externalOver && "bg-primary/5",
      )}
      style={{ borderLeftWidth: 6, borderLeftColor: column.color }}
    >
      {/* Header */}
      <div className="p-3 flex items-center gap-2">
        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              setEditing(false);
              if (title.trim() && title !== column.title)
                updateColumn(column.id, { title: title.trim() });
              else setTitle(column.title);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") {
                setTitle(column.title);
                setEditing(false);
              }
            }}
            className="flex-1 px-2 py-1 rounded-lg border-2 border-primary bg-card text-sm font-bold outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex-1 text-left text-sm font-bold truncate hover:text-primary transition cursor-pointer"
            title="Rename"
          >
            {column.title}
            <span className="ml-2 text-xs font-normal text-muted-foreground">{tasks.length}</span>
          </button>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColors((v) => !v)}
            aria-label="Color"
            className="w-7 h-7 rounded-full grid place-items-center hover:bg-muted/60 cursor-pointer transition"
          >
            <LuPalette size={14} />
          </button>
          {showColors && (
            <div className="absolute right-0 top-8 z-20 p-2 rounded-xl border-2 border-border bg-card shadow-lg flex gap-1.5 flex-wrap w-44">
              {COLUMN_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    updateColumn(column.id, { color: c });
                    setShowColors(false);
                  }}
                  className="w-6 h-6 rounded-full ring-2 ring-transparent hover:ring-foreground/40 cursor-pointer transition"
                  style={{ background: c }}
                  aria-label={`Set color ${c}`}
                />
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowNotes((v) => !v)}
          aria-label="Notes"
          className={cn(
            "w-7 h-7 rounded-full grid place-items-center hover:bg-muted/60 cursor-pointer transition",
            column.notes && "text-primary",
          )}
        >
          <LuStickyNote size={14} />
        </button>

        <button
          type="button"
          onClick={() => {
            if (confirm(`Delete column "${column.title}"? Tasks will move to the first column.`))
              deleteColumn(column.id);
          }}
          aria-label="Delete column"
          className="w-7 h-7 rounded-full grid place-items-center hover:bg-destructive/10 hover:text-destructive cursor-pointer transition"
        >
          <LuTrash2 size={14} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showNotes && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-3 pb-2"
          >
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => {
                if (notes !== column.notes) updateColumn(column.id, { notes });
              }}
              placeholder="Notes for this column…"
              rows={3}
              className="w-full px-2 py-1.5 rounded-lg border-2 border-border bg-card text-xs focus:outline-none focus:border-primary transition resize-y"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onOpen={onOpenTask} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <p className="text-xs text-muted-foreground italic text-center py-4">Drop tasks here</p>
        )}

        <button
          type="button"
          onClick={() => {
            const t = createTask({ columnId: column.id, title: "New task" });
            onOpenTask(t.id);
          }}
          className="w-full mt-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border-2 border-dashed border-border text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary transition cursor-pointer"
        >
          <LuPlus size={14} /> Add task
        </button>
      </div>
    </div>
  );
}

function SortableTaskCard({ task, onOpen }: { task: Task; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onOpen={onOpen} />
    </div>
  );
}

function TaskCard({
  task,
  onOpen,
  dragging,
}: {
  task: Task;
  onOpen: (id: string) => void;
  dragging?: boolean;
}) {
  const overdue = isOverdue(task);
  return (
    <div
      onClick={(e) => {
        // Don't open if drag started
        if ((e.target as HTMLElement).closest("[data-no-open]")) return;
        onOpen(task.id);
      }}
      className={cn(
        "group rounded-xl border-2 p-2.5 bg-card cursor-pointer transition shadow-sm hover:shadow-md",
        overdue
          ? "border-destructive/60 bg-destructive/5"
          : task.completed
            ? "border-emerald-500/50 bg-emerald-500/5"
            : "border-border hover:border-primary/50",
        dragging && "shadow-xl",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          data-no-open
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            updateTask(task.id, { completed: !task.completed });
          }}
          className={cn(
            "mt-0.5 w-4 h-4 rounded border-2 grid place-items-center text-[10px] shrink-0 transition cursor-pointer",
            task.completed
              ? "bg-emerald-500 border-emerald-500 text-white"
              : "border-border hover:border-primary",
          )}
          aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
        >
          {task.completed ? "✓" : ""}
        </button>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm font-bold leading-snug break-words",
              task.completed && "line-through text-muted-foreground",
              overdue && !task.completed && "text-destructive",
            )}
          >
            {task.title}
          </p>
          {(task.dueDate || task.tags.length > 0) && (
            <div className="mt-1.5 flex flex-wrap gap-1 items-center text-[10px]">
              {task.dueDate && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-bold",
                    overdue
                      ? "bg-destructive/15 text-destructive"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <LuClock size={10} />
                  {task.dueDate}
                  {task.dueTime ? ` ${task.dueTime}` : ""}
                </span>
              )}
              {task.tags.map((t) => (
                <span
                  key={t}
                  className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <LuPencil size={12} className="opacity-0 group-hover:opacity-50 transition mt-1" />
      </div>
    </div>
  );
}
