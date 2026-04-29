// Folder editor modal + reusable picker for icon and color.

import { useState, useMemo } from "react";
import { LuSearch, LuX } from "react-icons/lu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ICON_NAMES, DeskIcon, FOLDER_COLOR_SWATCHES, type IconName } from "./iconCatalog";
import { cn } from "@/lib/utils";

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: IconName) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return ICON_NAMES;
    return ICON_NAMES.filter((n) => n.toLowerCase().includes(s));
  }, [q]);
  return (
    <div className="space-y-2">
      <div className="relative">
        <LuSearch
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          size={14}
        />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search icons…"
          className="w-full rounded-lg border-2 border-border bg-background pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:border-primary/60"
        />
      </div>
      <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5 max-h-56 overflow-y-auto p-1 rounded-lg border border-border bg-muted/30">
        {filtered.map((name) => (
          <button
            key={name}
            type="button"
            title={name}
            onClick={() => onChange(name)}
            className={cn(
              "h-8 w-8 inline-flex items-center justify-center rounded-md border transition",
              value === name
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border hover:border-primary/60 hover:text-primary",
            )}
          >
            <DeskIcon name={name} size={14} />
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center text-xs text-muted-foreground py-4">
            No icons match "{q}"
          </div>
        )}
      </div>
    </div>
  );
}

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hsl: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FOLDER_COLOR_SWATCHES.map((c) => (
        <button
          key={c.hsl}
          type="button"
          title={c.label}
          onClick={() => onChange(c.hsl)}
          className={cn(
            "h-7 w-7 rounded-full border-2 transition",
            value === c.hsl ? "border-foreground scale-110" : "border-border/50 hover:scale-110",
          )}
          style={{ backgroundColor: `hsl(${c.hsl})` }}
        />
      ))}
    </div>
  );
}

export interface FolderEditValues {
  name: string;
  description: string;
  icon: string;
  color: string;
}

export function FolderEditModal({
  open,
  onOpenChange,
  title,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  title: string;
  initial: FolderEditValues;
  onSave: (v: FolderEditValues) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [icon, setIcon] = useState(initial.icon);
  const [color, setColor] = useState(initial.color);

  // Reset when reopened with different initial
  useMemo(() => {
    if (open) {
      setName(initial.name);
      setDescription(initial.description);
      setIcon(initial.icon);
      setColor(initial.color);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Pick a name, icon and color for this folder.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{ backgroundColor: `hsl(${color})` }}
            >
              <DeskIcon name={icon} size={22} />
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Folder name"
              className="flex-1 rounded-lg border-2 border-border bg-background px-3 py-2 text-sm font-bold focus:outline-none focus:border-primary/60"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description…"
              rows={2}
              className="mt-1 w-full rounded-lg border-2 border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary/60 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground">Color</label>
            <div className="mt-1">
              <ColorPicker value={color} onChange={setColor} />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground">Icon</label>
            <div className="mt-1">
              <IconPicker value={icon} onChange={setIcon} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold border-2 border-border hover:bg-muted transition"
          >
            <LuX size={14} /> Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave({ name: name.trim() || "New folder", description, icon, color });
              onOpenChange(false);
            }}
            className="inline-flex items-center rounded-full px-4 py-2 text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 transition"
          >
            Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
