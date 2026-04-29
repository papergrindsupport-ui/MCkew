// Desk store — folders, items (notes/questions/papers), comments, archive,
// flags, and pinned-papers. Everything is persisted to localStorage.

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DeskItemType = "note" | "question" | "paper";

export interface DeskItemBase {
  id: string;
  type: DeskItemType;
  folderId: string | null; // null = root
  createdAt: number;
  order: number;
}

export interface NoteItem extends DeskItemBase {
  type: "note";
  title: string;
  body: string;
}

export interface QuestionItem extends DeskItemBase {
  type: "question";
  paperId: string;
  qid: string;
}

export interface PaperItem extends DeskItemBase {
  type: "paper";
  paperId: string;
}

export type DeskItem = NoteItem | QuestionItem | PaperItem;

export interface FolderComment {
  id: string;
  body: string;
  at: number;
}

export type FolderFlag = "" | "red" | "amber" | "yellow" | "green" | "sky" | "violet" | "pink";

export interface DeskFolder {
  id: string;
  parentId: string | null; // null = root
  name: string;
  description: string;
  icon: string; // lucide-react name (e.g. "Folder")
  color: string; // hsl color, e.g. "210 90% 60%"
  builtin?: "history" | "saved-questions" | "saved-papers";
  createdAt: number;
  order: number;
  archived: boolean;
  flag: FolderFlag;
  comments: FolderComment[];
}

interface DeskState {
  folders: DeskFolder[];
  items: DeskItem[];
  pinnedPapers: string[];

  // ---------- folders ----------
  createFolder: (input: {
    name: string;
    parentId: string | null;
    icon?: string;
    color?: string;
    description?: string;
  }) => string;
  renameFolder: (id: string, name: string) => void;
  updateFolder: (
    id: string,
    patch: Partial<Pick<DeskFolder, "name" | "description" | "icon" | "color" | "flag">>,
  ) => void;
  archiveFolder: (id: string, archived: boolean) => void;
  deleteFolder: (id: string) => void;
  moveFolder: (id: string, parentId: string | null) => void;
  reorderFolders: (parentId: string | null, orderedIds: string[]) => void;
  addFolderComment: (folderId: string, body: string) => void;
  deleteFolderComment: (folderId: string, commentId: string) => void;

  // ---------- items ----------
  addNote: (folderId: string | null, title: string, body?: string) => string;
  addQuestion: (folderId: string | null, paperId: string, qid: string) => string;
  addPaper: (folderId: string | null, paperId: string) => string;
  updateNote: (id: string, patch: Partial<Pick<NoteItem, "title" | "body">>) => void;
  deleteItem: (id: string) => void;
  moveItem: (id: string, folderId: string | null) => void;
  reorderItems: (folderId: string | null, orderedIds: string[]) => void;

  // ---------- pinned papers ----------
  togglePinPaper: (paperId: string) => void;
  isPinned: (paperId: string) => boolean;

  // ---------- helpers ----------
  ensureDailySubfolder: (parentId: string) => string;
  ensureTimedSubfolder: (parentId: string, label?: string) => string;
}

const now = () => Date.now();
const uid = () => Math.random().toString(36).slice(2, 10) + now().toString(36);

const builtinFolders = (): DeskFolder[] => {
  const t = now();
  return [
    {
      id: "builtin-history",
      parentId: null,
      name: "History & logs",
      description: "Auto-tracked papers you've worked on.",
      icon: "History",
      color: "32 90% 55%",
      builtin: "history",
      createdAt: t,
      order: 0,
      archived: false,
      flag: "",
      comments: [],
    },
    {
      id: "builtin-saved-questions",
      parentId: null,
      name: "Saved questions",
      description: "Questions you've sent to your desk.",
      icon: "BookmarkCheck",
      color: "265 85% 65%",
      builtin: "saved-questions",
      createdAt: t,
      order: 1,
      archived: false,
      flag: "",
      comments: [],
    },
    {
      id: "builtin-saved-papers",
      parentId: null,
      name: "Saved papers",
      description: "Papers you've sent to your desk.",
      icon: "FileText",
      color: "200 90% 55%",
      builtin: "saved-papers",
      createdAt: t,
      order: 2,
      archived: false,
      flag: "",
      comments: [],
    },
  ];
};

const dayLabel = (d = new Date()) => {
  // e.g. "Sat 24th Aug 2026"
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const dayNum = d.getDate();
  const suffix =
    dayNum % 10 === 1 && dayNum !== 11
      ? "st"
      : dayNum % 10 === 2 && dayNum !== 12
        ? "nd"
        : dayNum % 10 === 3 && dayNum !== 13
          ? "rd"
          : "th";
  return `${days[d.getDay()]} ${dayNum}${suffix} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const timedLabel = (d = new Date()) => {
  const base = dayLabel(d);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${base} · ${hh}:${mm}`;
};

export const useDeskStore = create<DeskState>()(
  persist(
    (set, get) => ({
      folders: builtinFolders(),
      items: [],
      pinnedPapers: [],

      createFolder: ({ name, parentId, icon, color, description }) => {
        const id = uid();
        const siblings = get().folders.filter((f) => f.parentId === parentId);
        const folder: DeskFolder = {
          id,
          parentId,
          name: name.trim() || "New folder",
          description: description ?? "",
          icon: icon || "Folder",
          color: color || "215 90% 60%",
          createdAt: now(),
          order: siblings.length,
          archived: false,
          flag: "",
          comments: [],
        };
        set({ folders: [...get().folders, folder] });
        return id;
      },

      renameFolder: (id, name) =>
        set({
          folders: get().folders.map((f) =>
            f.id === id ? { ...f, name: name.trim() || f.name } : f,
          ),
        }),

      updateFolder: (id, patch) =>
        set({
          folders: get().folders.map((f) => (f.id === id ? { ...f, ...patch } : f)),
        }),

      archiveFolder: (id, archived) =>
        set({
          folders: get().folders.map((f) => (f.id === id ? { ...f, archived } : f)),
        }),

      deleteFolder: (id) => {
        const all = get().folders;
        const target = all.find((f) => f.id === id);
        if (!target || target.builtin) return;
        // Recursively collect descendants
        const toDelete = new Set<string>([id]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const f of all) {
            if (!toDelete.has(f.id) && f.parentId && toDelete.has(f.parentId)) {
              toDelete.add(f.id);
              changed = true;
            }
          }
        }
        set({
          folders: all.filter((f) => !toDelete.has(f.id)),
          items: get().items.filter((i) => !i.folderId || !toDelete.has(i.folderId)),
        });
      },

      moveFolder: (id, parentId) => {
        const folder = get().folders.find((f) => f.id === id);
        if (!folder || folder.builtin) return;
        if (id === parentId) return;
        // prevent cycles
        let cur: string | null = parentId;
        while (cur) {
          if (cur === id) return;
          cur = get().folders.find((f) => f.id === cur)?.parentId ?? null;
        }
        const siblings = get().folders.filter((f) => f.parentId === parentId);
        set({
          folders: get().folders.map((f) =>
            f.id === id ? { ...f, parentId, order: siblings.length } : f,
          ),
        });
      },

      reorderFolders: (parentId, orderedIds) => {
        const indexOf = new Map(orderedIds.map((id, i) => [id, i]));
        set({
          folders: get().folders.map((f) =>
            f.parentId === parentId && indexOf.has(f.id) ? { ...f, order: indexOf.get(f.id)! } : f,
          ),
        });
      },

      addFolderComment: (folderId, body) =>
        set({
          folders: get().folders.map((f) =>
            f.id === folderId
              ? {
                  ...f,
                  comments: [...f.comments, { id: uid(), body: body.trim(), at: now() }],
                }
              : f,
          ),
        }),

      deleteFolderComment: (folderId, commentId) =>
        set({
          folders: get().folders.map((f) =>
            f.id === folderId
              ? { ...f, comments: f.comments.filter((c) => c.id !== commentId) }
              : f,
          ),
        }),

      addNote: (folderId, title, body = "") => {
        const id = uid();
        const siblings = get().items.filter((i) => i.folderId === folderId);
        const note: NoteItem = {
          id,
          type: "note",
          folderId,
          title: title.trim() || "Untitled note",
          body,
          createdAt: now(),
          order: siblings.length,
        };
        set({ items: [...get().items, note] });
        return id;
      },

      addQuestion: (folderId, paperId, qid) => {
        // Avoid duplicates within the same folder
        const existing = get().items.find(
          (i) =>
            i.type === "question" &&
            i.folderId === folderId &&
            (i as QuestionItem).paperId === paperId &&
            (i as QuestionItem).qid === qid,
        );
        if (existing) return existing.id;
        const id = uid();
        const siblings = get().items.filter((i) => i.folderId === folderId);
        const item: QuestionItem = {
          id,
          type: "question",
          folderId,
          paperId,
          qid,
          createdAt: now(),
          order: siblings.length,
        };
        set({ items: [...get().items, item] });
        return id;
      },

      addPaper: (folderId, paperId) => {
        const existing = get().items.find(
          (i) =>
            i.type === "paper" && i.folderId === folderId && (i as PaperItem).paperId === paperId,
        );
        if (existing) return existing.id;
        const id = uid();
        const siblings = get().items.filter((i) => i.folderId === folderId);
        const item: PaperItem = {
          id,
          type: "paper",
          folderId,
          paperId,
          createdAt: now(),
          order: siblings.length,
        };
        set({ items: [...get().items, item] });
        return id;
      },

      updateNote: (id, patch) =>
        set({
          items: get().items.map((i) =>
            i.id === id && i.type === "note" ? ({ ...i, ...patch } as NoteItem) : i,
          ),
        }),

      deleteItem: (id) => set({ items: get().items.filter((i) => i.id !== id) }),

      moveItem: (id, folderId) => {
        const siblings = get().items.filter((i) => i.folderId === folderId);
        set({
          items: get().items.map((i) =>
            i.id === id ? { ...i, folderId, order: siblings.length } : i,
          ),
        });
      },

      reorderItems: (folderId, orderedIds) => {
        const indexOf = new Map(orderedIds.map((id, i) => [id, i]));
        set({
          items: get().items.map((i) =>
            i.folderId === folderId && indexOf.has(i.id) ? { ...i, order: indexOf.get(i.id)! } : i,
          ),
        });
      },

      togglePinPaper: (paperId) => {
        const cur = get().pinnedPapers;
        set({
          pinnedPapers: cur.includes(paperId)
            ? cur.filter((id) => id !== paperId)
            : [paperId, ...cur],
        });
      },

      isPinned: (paperId) => get().pinnedPapers.includes(paperId),

      ensureDailySubfolder: (parentId) => {
        const label = dayLabel();
        const existing = get().folders.find((f) => f.parentId === parentId && f.name === label);
        if (existing) return existing.id;
        return get().createFolder({
          name: label,
          parentId,
          icon: "CalendarDays",
          color: "265 85% 65%",
          description: `Auto-created on ${label}`,
        });
      },

      ensureTimedSubfolder: (parentId, label) => {
        const finalLabel = label ?? timedLabel();
        const existing = get().folders.find(
          (f) => f.parentId === parentId && f.name === finalLabel,
        );
        if (existing) return existing.id;
        return get().createFolder({
          name: finalLabel,
          parentId,
          icon: "Layers",
          color: "200 90% 55%",
          description: `Auto-created bulk save · ${finalLabel}`,
        });
      },
    }),
    {
      name: "smart-solving-desk-v1",
      version: 1,
      // Re-seed builtin folders if missing on rehydrate.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<DeskState>;
        const merged = { ...current, ...p } as DeskState;
        const haveBuiltins = new Set(
          (merged.folders ?? []).filter((f) => f.builtin).map((f) => f.builtin),
        );
        const missing = builtinFolders().filter((b) => !haveBuiltins.has(b.builtin));
        if (missing.length) merged.folders = [...missing, ...(merged.folders ?? [])];
        if (!merged.items) merged.items = [];
        if (!merged.pinnedPapers) merged.pinnedPapers = [];
        return merged;
      },
    },
  ),
);

export const FOLDER_FLAG_COLORS: Record<Exclude<FolderFlag, "">, string> = {
  red: "0 80% 60%",
  amber: "32 95% 55%",
  yellow: "48 95% 55%",
  green: "142 70% 45%",
  sky: "200 90% 55%",
  violet: "265 85% 65%",
  pink: "330 85% 65%",
};

export { dayLabel, timedLabel };
