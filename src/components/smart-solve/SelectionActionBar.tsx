import { useState } from "react";
import { motion } from "framer-motion";
import {
  LuBookOpenCheck,
  LuCheckCheck,
  LuHardDriveDownload,
  LuMousePointer2,
} from "react-icons/lu";
import { cn } from "@/lib/utils";
import { SaveToDeskModal, type SaveTarget } from "@/components/desk/SaveToDeskModal";

export function SelectModeButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-extrabold transition hover:scale-105 active:scale-95",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
          : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20",
      )}
    >
      <LuMousePointer2 size={13} /> Select
    </button>
  );
}

export function SelectionActionBar({
  selectedCount,
  totalCount,
  label,
  allSelected,
  onToggleAll,
  saveTarget,
}: {
  selectedCount: number;
  totalCount: number;
  label: string;
  allSelected: boolean;
  onToggleAll: () => void;
  /** When provided, "Save to desk" opens the SaveToDeskModal with this target. */
  saveTarget?: SaveTarget | null;
}) {
  const [saveOpen, setSaveOpen] = useState(false);
  const canSave = !!saveTarget && selectedCount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className="mb-5 overflow-hidden rounded-2xl border-2 border-primary/30 bg-primary/10 p-2 shadow-lg shadow-primary/10 backdrop-blur"
    >
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onToggleAll}
          className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-extrabold text-primary transition hover:bg-primary/10 active:scale-95"
        >
          <LuCheckCheck size={16} /> {allSelected ? "Deselect all" : "Select all"}
        </button>
        <span className="text-sm font-bold text-muted-foreground">
          {selectedCount} selected
          <span className="hidden sm:inline">
            {" "}
            of {totalCount} {label}
          </span>
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!canSave}
            onClick={() => setSaveOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-extrabold text-primary-foreground shadow-md shadow-primary/20 transition hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LuHardDriveDownload size={16} /> Save to desk
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border-2 border-primary/40 bg-background/70 px-4 py-2 text-sm font-extrabold text-primary transition hover:bg-primary/10 active:scale-95"
          >
            <LuBookOpenCheck size={16} /> Build exam
          </button>
        </div>
      </div>
      <SaveToDeskModal open={saveOpen} onOpenChange={setSaveOpen} target={saveTarget ?? null} />
    </motion.div>
  );
}
