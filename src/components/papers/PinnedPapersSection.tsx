// "Pinned papers" section — shows papers the user has pinned via the
// PaperCard three-dot menu. Persisted in the desk store (localStorage).

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LuChevronDown, LuPin } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { useDeskStore } from "@/stores/useDeskStore";
import { getMergedPaperById } from "@/admin/merge";
import { getPaperById } from "@/data/paperData";
import { PaperCard } from "./PaperCard";

export function PinnedPapersSection() {
  const pinnedIds = useDeskStore((s) => s.pinnedPapers);
  const [open, setOpen] = useState(true);

  const papers = useMemo(
    () =>
      pinnedIds
        .map((id) => getMergedPaperById(id) ?? getPaperById(id))
        .filter((p): p is NonNullable<typeof p> => !!p),
    [pinnedIds],
  );

  if (papers.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border-2 border-amber-500/30 bg-amber-500/5 backdrop-blur p-4 mb-6"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2">
          <LuPin size={18} className="text-amber-600 dark:text-amber-400" />
          <h2 className="font-bold">Pinned papers</h2>
          <span className="text-xs text-muted-foreground">· {papers.length}</span>
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
            <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {papers.map((p) => (
                <PaperCard key={p.id} paper={p} compact />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
