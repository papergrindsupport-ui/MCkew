// Shared task editor modal for kanban + gantt views.
// Provides: title, description, due date+time, tags, comments, activity log.
// Modal is fixed/centered with body-scroll lock and is fully accessible.

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LuX,
  LuCalendar,
  LuClock,
  LuTag,
  LuMessageSquare,
  LuHistory,
  LuTrash2,
  LuExternalLink,
  LuChevronDown,
} from "react-icons/lu";
import {
  type Task,
  updateTask,
  deleteTask,
  addComment,
  usePlannerTasks,
  isOverdue,
} from "@/lib/plannerTasksStore";
import { cn } from "@/lib/utils";

function formatRelative(t: number) {
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(t).toLocaleString();
}

export function TaskModal({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const { tasks, columns } = usePlannerTasks();
  const task = tasks.find((t) => t.id === taskId) ?? null;
  const open = !!task;

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && task && (
        <motion.div
          key="task-modal-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[120] overflow-y-auto overscroll-contain"
        >
          <div
            className="fixed inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <div className="relative min-h-full flex items-start sm:items-center justify-center p-3 sm:p-6 pointer-events-none">
            <motion.div
              initial={{ y: 16, scale: 0.97 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="pointer-events-auto relative w-full max-w-[640px] my-4 rounded-3xl border-[2.5px] border-border bg-card shadow-2xl"
              role="dialog"
              aria-modal="true"
            >
              <TaskEditor task={task} columns={columns} onClose={onClose} />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TaskEditor({
  task,
  columns,
  onClose,
}: {
  task: Task;
  columns: { id: string; title: string }[];
  onClose: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [dueTime, setDueTime] = useState(task.dueTime ?? "");
  const [hasTime, setHasTime] = useState(!!task.dueTime);
  const [tagInput, setTagInput] = useState("");
  const [commentInput, setCommentInput] = useState("");
  const [showActivity, setShowActivity] = useState(false);

  // Sync local state when switching tasks
  const prevId = useRef(task.id);
  useEffect(() => {
    if (prevId.current !== task.id) {
      setTitle(task.title);
      setDescription(task.description);
      setDueDate(task.dueDate ?? "");
      setDueTime(task.dueTime ?? "");
      setHasTime(!!task.dueTime);
      prevId.current = task.id;
    }
  }, [task]);

  // Persist title on blur / debounce description
  const commitTitle = () => {
    const t = title.trim() || "Untitled task";
    if (t !== task.title) updateTask(task.id, { title: t });
  };
  const commitDescription = () => {
    if (description !== task.description) updateTask(task.id, { description });
  };
  const commitDue = (nextDate: string, nextTime: string, nextHasTime: boolean) => {
    const date = nextDate || undefined;
    const time = nextHasTime && nextTime ? nextTime : undefined;
    updateTask(task.id, { dueDate: date, dueTime: time });
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (task.tags.includes(t)) {
      setTagInput("");
      return;
    }
    updateTask(task.id, { tags: [...task.tags, t] });
    setTagInput("");
  };
  const removeTag = (tag: string) => {
    updateTask(task.id, { tags: task.tags.filter((t) => t !== tag) });
  };

  const submitComment = () => {
    if (!commentInput.trim()) return;
    addComment(task.id, commentInput);
    setCommentInput("");
  };

  const overdue = isOverdue(task);

  return (
    <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-3xl">
      <div className="p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => updateTask(task.id, { completed: !task.completed })}
            aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
            className={cn(
              "mt-1 w-6 h-6 shrink-0 rounded-md border-2 grid place-items-center transition cursor-pointer",
              task.completed
                ? "bg-emerald-500 border-emerald-500 text-white"
                : "border-border hover:border-primary",
            )}
          >
            {task.completed ? "✓" : ""}
          </button>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className={cn(
              "flex-1 bg-transparent text-xl sm:text-2xl font-bold outline-none border-b-2 border-transparent focus:border-primary transition pb-0.5",
              task.completed && "line-through text-muted-foreground",
            )}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full grid place-items-center hover:bg-muted/60 transition cursor-pointer"
          >
            <LuX size={18} />
          </button>
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap gap-2 text-xs">
          <select
            value={task.columnId}
            onChange={(e) => updateTask(task.id, { columnId: e.target.value })}
            className="px-2.5 py-1 rounded-full border-2 border-border bg-card font-bold cursor-pointer hover:border-primary transition"
          >
            {columns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          {overdue && (
            <span className="px-2.5 py-1 rounded-full bg-destructive/15 text-destructive font-bold">
              Overdue
            </span>
          )}
          {task.link && (
            <a
              href={task.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border-2 border-border bg-card font-bold hover:border-primary transition"
            >
              <LuExternalLink size={12} /> Open paper
            </a>
          )}
        </div>

        {/* Due date */}
        <Section icon={<LuCalendar size={14} />} title="Due">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => {
                const v = e.target.value;
                setDueDate(v);
                commitDue(v, dueTime, hasTime);
              }}
              className="px-3 py-2 rounded-xl border-2 border-border bg-card text-sm focus:outline-none focus:border-primary transition"
            />
            <label className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={hasTime}
                onChange={(e) => {
                  setHasTime(e.target.checked);
                  commitDue(dueDate, dueTime, e.target.checked);
                }}
              />
              <LuClock size={12} /> include time
            </label>
            {hasTime && (
              <input
                type="time"
                value={dueTime}
                onChange={(e) => {
                  setDueTime(e.target.value);
                  commitDue(dueDate, e.target.value, true);
                }}
                className="px-3 py-2 rounded-xl border-2 border-border bg-card text-sm focus:outline-none focus:border-primary transition"
              />
            )}
            {dueDate && (
              <button
                type="button"
                onClick={() => {
                  setDueDate("");
                  setDueTime("");
                  setHasTime(false);
                  commitDue("", "", false);
                }}
                className="text-xs font-bold text-muted-foreground hover:text-destructive transition cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </Section>

        {/* Description */}
        <Section title="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={commitDescription}
            placeholder="Add a description…"
            rows={4}
            className="w-full px-3 py-2 rounded-xl border-2 border-border bg-card text-sm focus:outline-none focus:border-primary transition resize-y min-h-[80px]"
          />
        </Section>

        {/* Tags */}
        <Section icon={<LuTag size={14} />} title="Tags">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {task.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="opacity-60 hover:opacity-100 cursor-pointer"
                  aria-label={`Remove ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Add a tag and press Enter"
              className="flex-1 px-3 py-2 rounded-xl border-2 border-border bg-card text-sm focus:outline-none focus:border-primary transition"
            />
            <button
              type="button"
              onClick={addTag}
              className="px-3 py-2 rounded-xl border-2 border-border text-sm font-bold hover:border-primary hover:text-primary transition cursor-pointer"
            >
              Add
            </button>
          </div>
        </Section>

        {/* Comments */}
        <Section icon={<LuMessageSquare size={14} />} title={`Comments (${task.comments.length})`}>
          <div className="space-y-2 mb-2 max-h-48 overflow-y-auto pr-1">
            {task.comments.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No comments yet.</p>
            )}
            {task.comments.map((c) => (
              <div key={c.id} className="rounded-xl bg-muted/40 px-3 py-2 text-sm">
                <p className="whitespace-pre-wrap break-words">{c.text}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatRelative(c.createdAt)}
                </p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitComment();
              }}
              placeholder="Write a comment…"
              className="flex-1 px-3 py-2 rounded-xl border-2 border-border bg-card text-sm focus:outline-none focus:border-primary transition"
            />
            <button
              type="button"
              onClick={submitComment}
              className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition cursor-pointer"
            >
              Post
            </button>
          </div>
        </Section>

        {/* Activity log (collapsible) */}
        <div className="rounded-2xl border-2 border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setShowActivity((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/60 transition cursor-pointer"
          >
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <LuHistory size={14} /> Activity log ({task.activity.length})
            </span>
            <motion.span animate={{ rotate: showActivity ? 180 : 0 }}>
              <LuChevronDown size={16} />
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {showActivity && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <ol className="p-3 space-y-2 max-h-60 overflow-y-auto">
                  {task.activity.map((a) => (
                    <li key={a.id} className="flex gap-2 text-xs">
                      <span className="mt-1.5 inline-block w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-foreground break-words">{a.message}</p>
                        <p className="text-[10px] text-muted-foreground">{formatRelative(a.at)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-2">
          <button
            type="button"
            onClick={() => {
              if (confirm("Delete this task? This cannot be undone.")) {
                deleteTask(task.id);
                onClose();
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-destructive transition cursor-pointer"
          >
            <LuTrash2 size={14} /> Delete task
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-foreground text-background text-sm font-bold hover:opacity-90 transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5 inline-flex items-center gap-1.5">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}
