// Shared task store for the /planner page.
// ---------------------------------------------------------------------------
// Migrated to the backend API (Supabase Edge Function `api`).
//
// Architecture:
//   - Tasks are persisted server-side (table `planner_tasks`, profile-scoped).
//   - Columns remain local-only (no DB table) — they're UI scaffolding.
//   - We keep an in-memory + localStorage CACHE so reads stay synchronous
//     (`usePlannerTasks()` is used in many components and must not suspend).
//   - Mutations are OPTIMISTIC: update cache immediately, then fire the API
//     call in the background. On failure, we re-fetch to reconcile.
//
// To bootstrap, mount <PlannerTasksHydrator/> once near the app root (already
// wired into __root.tsx). It fetches the user's tasks whenever the active
// profile changes and feeds them into the cache.

import { useEffect, useSyncExternalStore } from "react";
import { createApiClient, type ApiClient } from "@/lib/apiClient";
import { useAccountStore } from "@/stores/useAccountStore";
import { useAuth } from "@clerk/clerk-react";

export type TaskTag = string;

export type TaskComment = {
  id: string;
  text: string;
  createdAt: number;
};

export type ActivityKind =
  | "created"
  | "renamed"
  | "description"
  | "due-set"
  | "due-changed"
  | "due-cleared"
  | "completed"
  | "uncompleted"
  | "moved-column"
  | "tag-added"
  | "tag-removed"
  | "comment-added"
  | "color"
  | "schedule-set"
  | "schedule-changed";

export type ActivityEntry = {
  id: string;
  kind: ActivityKind;
  message: string;
  at: number;
};

export type Task = {
  id: string;
  columnId: string;
  order: number;
  title: string;
  description: string;
  completed: boolean;
  dueDate?: string;
  dueTime?: string;
  startDate?: string;
  endDate?: string;
  tags: TaskTag[];
  comments: TaskComment[];
  activity: ActivityEntry[];
  link?: string;
  createdAt: number;
};

export type Column = {
  id: string;
  title: string;
  color: string;
  notes: string;
  order: number;
};

export type PlannerTasksState = {
  columns: Column[];
  tasks: Task[];
};

const COLUMNS_KEY = "planner.columns.v1";
const TASKS_CACHE_KEY = "planner.tasks.cache.v1";
const EVENT = "planner-tasks-change";

const uid = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID?.()) ||
  Math.random().toString(36).slice(2) + Date.now().toString(36);

const DEFAULT_COLUMNS: Column[] = [
  { id: "todo", title: "To do", color: "#6366f1", notes: "", order: 0 },
  { id: "doing", title: "In progress", color: "#f59e0b", notes: "", order: 1 },
  { id: "done", title: "Done", color: "#10b981", notes: "", order: 2 },
];

/* ---------------------------- in-memory state ---------------------------- */

let state: PlannerTasksState = (() => {
  if (typeof window === "undefined") return { columns: DEFAULT_COLUMNS, tasks: [] };
  let columns = DEFAULT_COLUMNS;
  let tasks: Task[] = [];
  try {
    const c = window.localStorage.getItem(COLUMNS_KEY);
    if (c) columns = JSON.parse(c);
    const t = window.localStorage.getItem(TASKS_CACHE_KEY);
    if (t) tasks = JSON.parse(t);
  } catch {
    /* ignore */
  }
  // Migrate legacy combined key.
  try {
    const legacy = window.localStorage.getItem("planner.tasks.v1");
    if (legacy) {
      const parsed = JSON.parse(legacy) as Partial<PlannerTasksState>;
      if (parsed.columns?.length) columns = parsed.columns;
      if (parsed.tasks?.length) tasks = parsed.tasks;
      window.localStorage.removeItem("planner.tasks.v1");
    }
  } catch {
    /* ignore */
  }
  return { columns, tasks };
})();

function persistColumns() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COLUMNS_KEY, JSON.stringify(state.columns));
  } catch {
    /* ignore */
  }
}
function persistTasksCache() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TASKS_CACHE_KEY, JSON.stringify(state.tasks));
  } catch {
    /* ignore */
  }
}

function emit() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT));
}

function setState(next: PlannerTasksState, opts: { persistTasks?: boolean } = {}) {
  state = next;
  persistColumns();
  if (opts.persistTasks !== false) persistTasksCache();
  emit();
}

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const h = () => cb();
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}

export function usePlannerTasks(): PlannerTasksState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

export function getState(): PlannerTasksState {
  return state;
}

/* --------------------------- API client wiring --------------------------- */

let apiRef: ApiClient | null = null;
export function _setPlannerApi(api: ApiClient | null) {
  apiRef = api;
}

function api(): ApiClient | null {
  return apiRef;
}

/* ------------------------------ serialization ---------------------------- */

type DbTask = {
  id: string;
  column_id: string;
  order: number;
  title: string;
  description: string;
  completed: boolean;
  due_date: string | null;
  due_time: string | null;
  start_date: string | null;
  end_date: string | null;
  tags: TaskTag[] | null;
  comments: TaskComment[] | null;
  activity: ActivityEntry[] | null;
  link: string | null;
  created_at: string;
};

function fromDb(d: DbTask): Task {
  return {
    id: d.id,
    columnId: d.column_id,
    order: d.order ?? 0,
    title: d.title,
    description: d.description ?? "",
    completed: !!d.completed,
    dueDate: d.due_date ?? undefined,
    dueTime: d.due_time ?? undefined,
    startDate: d.start_date ?? undefined,
    endDate: d.end_date ?? undefined,
    tags: d.tags ?? [],
    comments: d.comments ?? [],
    activity: d.activity ?? [],
    link: d.link ?? undefined,
    createdAt: new Date(d.created_at).getTime(),
  };
}

function toDbPatch(patch: Partial<Task>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.columnId !== undefined) out.column_id = patch.columnId;
  if (patch.order !== undefined) out.order = patch.order;
  if (patch.title !== undefined) out.title = patch.title;
  if (patch.description !== undefined) out.description = patch.description;
  if (patch.completed !== undefined) out.completed = patch.completed;
  if (patch.dueDate !== undefined) out.due_date = patch.dueDate || null;
  if (patch.dueTime !== undefined) out.due_time = patch.dueTime || null;
  if (patch.startDate !== undefined) out.start_date = patch.startDate || null;
  if (patch.endDate !== undefined) out.end_date = patch.endDate || null;
  if (patch.tags !== undefined) out.tags = patch.tags;
  if (patch.comments !== undefined) out.comments = patch.comments;
  if (patch.activity !== undefined) out.activity = patch.activity;
  if (patch.link !== undefined) out.link = patch.link || null;
  return out;
}

/* ------------------------------ hydration -------------------------------- */

let hydratedForProfile: string | null = null;

async function hydrate(profileId: string) {
  const a = api();
  if (!a) return;
  if (hydratedForProfile === profileId) return;
  hydratedForProfile = profileId;
  try {
    const res = await a.listTasks();
    const tasks = (res.data as unknown as DbTask[]).map(fromDb);
    setState({ ...state, tasks });
  } catch (e) {
    // Network/auth issue — keep cached tasks visible, log only.
    console.warn("[plannerTasks] hydrate failed", e);
  }
}

async function refetch() {
  hydratedForProfile = null;
  const profile = useAccountStore.getState().profile;
  if (profile) await hydrate(profile.public_id);
}

/* ----------------------------- mutations -------------------------------- */

function logActivity(task: Task, kind: ActivityKind, message: string): Task {
  const entry: ActivityEntry = { id: uid(), kind, message, at: Date.now() };
  return { ...task, activity: [entry, ...task.activity] };
}

function fireApi<T>(p: Promise<T> | undefined) {
  if (!p) return;
  p.catch((e) => {
    console.warn("[plannerTasks] api error", e);
    void refetch();
  });
}

export function createTask(input: {
  columnId?: string;
  title: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  startDate?: string;
  endDate?: string;
  tags?: string[];
  link?: string;
}): Task {
  const cur = state;
  const columnId = input.columnId ?? cur.columns[0]?.id ?? "todo";
  const order =
    Math.max(-1, ...cur.tasks.filter((t) => t.columnId === columnId).map((t) => t.order)) + 1;
  const t: Task = {
    id: uid(),
    columnId,
    order,
    title: input.title.trim() || "Untitled task",
    description: input.description ?? "",
    completed: false,
    dueDate: input.dueDate,
    dueTime: input.dueTime,
    startDate: input.startDate,
    endDate: input.endDate,
    tags: input.tags ?? [],
    comments: [],
    activity: [{ id: uid(), kind: "created", message: `Task created`, at: Date.now() }],
    link: input.link,
    createdAt: Date.now(),
  };
  setState({ ...cur, tasks: [...cur.tasks, t] });

  const a = api();
  if (a) {
    fireApi(
      a
        .createTask({
          column_id: t.columnId,
          title: t.title,
          description: t.description,
          completed: t.completed,
          due_date: t.dueDate,
          due_time: t.dueTime,
          start_date: t.startDate,
          end_date: t.endDate,
          tags: t.tags,
          link: t.link,
          order: t.order,
        })
        .then((res) => {
          const real = fromDb(res.data as unknown as DbTask);
          // Replace temp id with server id; preserve activity/comments we just built.
          setState({
            ...state,
            tasks: state.tasks.map((x) =>
              x.id === t.id ? { ...real, activity: t.activity, comments: t.comments } : x,
            ),
          });
          // Persist server-known fields back to the row.
          fireApi(
            a.updateTask(real.id, {
              activity: t.activity,
              comments: t.comments,
            }),
          );
        }),
    );
  }
  return t;
}

export function updateTask(id: string, patch: Partial<Task>) {
  const cur = state;
  const idx = cur.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return;
  const old = cur.tasks[idx];
  let next: Task = { ...old, ...patch };

  if (patch.title !== undefined && patch.title !== old.title) {
    next = logActivity(next, "renamed", `Renamed to "${patch.title}"`);
  }
  if (patch.description !== undefined && patch.description !== old.description) {
    next = logActivity(next, "description", "Description updated");
  }
  if (patch.dueDate !== undefined || patch.dueTime !== undefined) {
    const oldDue = old.dueDate ? `${old.dueDate}${old.dueTime ? " " + old.dueTime : ""}` : "";
    const newDue = next.dueDate ? `${next.dueDate}${next.dueTime ? " " + next.dueTime : ""}` : "";
    if (oldDue !== newDue) {
      if (!oldDue && newDue) next = logActivity(next, "due-set", `Due date set: ${newDue}`);
      else if (oldDue && !newDue) next = logActivity(next, "due-cleared", `Due date cleared`);
      else next = logActivity(next, "due-changed", `Due date changed: ${oldDue} → ${newDue}`);
    }
  }
  if (patch.startDate !== undefined || patch.endDate !== undefined) {
    const oldS = `${old.startDate ?? ""}→${old.endDate ?? ""}`;
    const newS = `${next.startDate ?? ""}→${next.endDate ?? ""}`;
    if (oldS !== newS) {
      if (!old.startDate && !old.endDate)
        next = logActivity(next, "schedule-set", `Scheduled ${next.startDate} → ${next.endDate}`);
      else
        next = logActivity(
          next,
          "schedule-changed",
          `Schedule changed to ${next.startDate} → ${next.endDate}`,
        );
    }
  }
  if (patch.completed !== undefined && patch.completed !== old.completed) {
    next = logActivity(
      next,
      patch.completed ? "completed" : "uncompleted",
      patch.completed ? "Marked complete" : "Marked incomplete",
    );
  }
  if (patch.columnId !== undefined && patch.columnId !== old.columnId) {
    const colTitle = cur.columns.find((c) => c.id === patch.columnId)?.title ?? patch.columnId;
    next = logActivity(next, "moved-column", `Moved to ${colTitle}`);
  }
  if (patch.tags !== undefined) {
    const added = patch.tags.filter((t) => !old.tags.includes(t));
    const removed = old.tags.filter((t) => !patch.tags!.includes(t));
    for (const a2 of added) next = logActivity(next, "tag-added", `Tag added: ${a2}`);
    for (const r of removed) next = logActivity(next, "tag-removed", `Tag removed: ${r}`);
  }

  const tasks = [...cur.tasks];
  tasks[idx] = next;
  setState({ ...cur, tasks });

  const a = api();
  if (a) {
    fireApi(
      a.updateTask(id, {
        ...toDbPatch(patch),
        activity: next.activity,
      }),
    );
  }
}

export function deleteTask(id: string) {
  const cur = state;
  setState({ ...cur, tasks: cur.tasks.filter((t) => t.id !== id) });
  const a = api();
  if (a) fireApi(a.deleteTask(id));
}

export function addComment(taskId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const cur = state;
  const idx = cur.tasks.findIndex((t) => t.id === taskId);
  if (idx === -1) return;
  let task = cur.tasks[idx];
  const c: TaskComment = { id: uid(), text: trimmed, createdAt: Date.now() };
  task = { ...task, comments: [...task.comments, c] };
  task = logActivity(task, "comment-added", `Comment added: "${trimmed.slice(0, 60)}"`);
  const tasks = [...cur.tasks];
  tasks[idx] = task;
  setState({ ...cur, tasks });

  const a = api();
  if (a) fireApi(a.updateTask(taskId, { comments: task.comments, activity: task.activity }));
}

export function moveTask(taskId: string, toColumnId: string, toIndex: number) {
  const cur = state;
  const task = cur.tasks.find((t) => t.id === taskId);
  if (!task) return;
  const fromCol = task.columnId;
  const sameCol = fromCol === toColumnId;
  const otherTasks = cur.tasks.filter((t) => t.id !== taskId);
  const targetTasks = otherTasks
    .filter((t) => t.columnId === toColumnId)
    .sort((a, b) => a.order - b.order);
  const insertAt = Math.max(0, Math.min(toIndex, targetTasks.length));
  targetTasks.splice(insertAt, 0, { ...task, columnId: toColumnId });
  const reTarget = targetTasks.map((t, i) => ({ ...t, order: i }));

  let next: Task[] = otherTasks.filter((t) => t.columnId !== toColumnId).concat(reTarget);

  if (!sameCol) {
    const srcTasks = next
      .filter((t) => t.columnId === fromCol)
      .sort((a, b) => a.order - b.order)
      .map((t, i) => ({ ...t, order: i }));
    next = next.filter((t) => t.columnId !== fromCol).concat(srcTasks);
    const colTitle = cur.columns.find((c) => c.id === toColumnId)?.title ?? toColumnId;
    next = next.map((t) =>
      t.id === taskId ? logActivity(t, "moved-column", `Moved to ${colTitle}`) : t,
    );
  }

  setState({ ...cur, tasks: next });

  // Persist every affected row's order/column.
  const a = api();
  if (a) {
    const before = new Map(cur.tasks.map((t) => [t.id, t]));
    for (const t of next) {
      const prev = before.get(t.id);
      if (!prev) continue;
      if (prev.order !== t.order || prev.columnId !== t.columnId) {
        fireApi(
          a.updateTask(t.id, { order: t.order, column_id: t.columnId, activity: t.activity }),
        );
      }
    }
  }
}

/* ----------------------------- columns (local) --------------------------- */

export function createColumn(title: string, color = "#6366f1"): Column {
  const cur = state;
  const order = Math.max(-1, ...cur.columns.map((c) => c.order)) + 1;
  const col: Column = { id: uid(), title: title.trim() || "New column", color, notes: "", order };
  setState({ ...cur, columns: [...cur.columns, col] });
  return col;
}

export function updateColumn(id: string, patch: Partial<Column>) {
  const cur = state;
  const cols = cur.columns.map((c) => (c.id === id ? { ...c, ...patch } : c));
  setState({ ...cur, columns: cols });
}

export function deleteColumn(id: string) {
  const cur = state;
  const cols = cur.columns.filter((c) => c.id !== id);
  const fallback = cols[0]?.id;
  const tasks = fallback
    ? cur.tasks.map((t) => (t.columnId === id ? { ...t, columnId: fallback } : t))
    : cur.tasks.filter((t) => t.columnId !== id);
  setState({ columns: cols, tasks });

  // Sync moved tasks to API.
  const a = api();
  if (a && fallback) {
    for (const t of tasks) {
      if (cur.tasks.find((x) => x.id === t.id)?.columnId === id) {
        fireApi(a.updateTask(t.id, { column_id: fallback }));
      }
    }
  }
  if (a && !fallback) {
    for (const t of cur.tasks.filter((x) => x.columnId === id)) {
      fireApi(a.deleteTask(t.id));
    }
  }
}

/* ----------------------------- helpers ----------------------------------- */

export function isOverdue(task: Task): boolean {
  if (task.completed || !task.dueDate) return false;
  const due = new Date(`${task.dueDate}T${task.dueTime ?? "23:59"}:00`);
  return due.getTime() < Date.now();
}

export function isToday(task: Task): boolean {
  const today = new Date();
  const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (task.dueDate === ymd) return true;
  if (task.startDate && task.endDate) {
    return task.startDate <= ymd && ymd <= task.endDate;
  }
  return false;
}

/* ---------------------- React hydrator (mount once) ---------------------- */

export function PlannerTasksHydrator() {
  const profile = useAccountStore((s) => s.profile);
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (!profile) {
      _setPlannerApi(null);
      hydratedForProfile = null;
      return;
    }
    const a = createApiClient({
      getToken: isSignedIn ? () => getToken({ template: "supabase" }).catch(() => null) : undefined,
      publicId: !isSignedIn ? profile.public_id : null,
    });
    _setPlannerApi(a);
    void hydrate(profile.public_id);
  }, [profile?.public_id, isSignedIn, getToken]);

  return null;
}
