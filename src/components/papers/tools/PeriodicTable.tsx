import { useState } from "react";
import { motion, useDragControls } from "framer-motion";
import { LuGripVertical, LuX, LuMinus, LuAtom } from "react-icons/lu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToolsStore } from "./useToolsStore";
import { ELEMENTS, CATEGORY_COLOR, type Element } from "./elements";

export function PeriodicTable() {
  const open = useToolsStore((s) => s.periodicOpen);
  const setOpen = useToolsStore((s) => s.setPeriodicOpen);
  const min = useToolsStore((s) => s.periodicMin);
  const setMin = useToolsStore((s) => s.setPeriodicMin);
  const drag = useDragControls();
  const [picked, setPicked] = useState<Element | null>(null);

  if (!open) return null;
  if (min) {
    return (
      <button
        onClick={() => setMin(false)}
        className="fixed bottom-4 right-36 z-50 w-14 h-14 rounded-full border-2 border-border/60 bg-card shadow-2xl flex items-center justify-center hover:border-primary print:hidden"
        title="Open periodic table"
      >
        <LuAtom size={20} />
      </button>
    );
  }

  const cellSize = 36;

  return (
    <>
      <motion.div
        drag
        dragControls={drag}
        dragListener={false}
        dragMomentum={false}
        dragElastic={0}
        initial={{ x: 0, y: 0 }}
        className="fixed top-20 left-2 right-2 sm:top-24 sm:left-24 sm:right-auto z-50 select-none print:hidden"
      >
        <div className="rounded-2xl border-2 border-border/60 bg-card/95 backdrop-blur shadow-2xl">
          <div
            className="flex items-center gap-2 px-3 py-2 border-b border-border/40 cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => drag.start(e)}
          >
            <LuGripVertical size={14} className="text-muted-foreground" />
            <LuAtom size={14} className="text-primary" />
            <span className="text-sm font-bold flex-1">Periodic table</span>
            <button
              onClick={() => setMin(true)}
              className="p-1 rounded hover:bg-accent text-muted-foreground"
              title="Minimize"
            >
              <LuMinus size={14} />
            </button>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded hover:bg-accent text-muted-foreground"
              title="Close"
            >
              <LuX size={14} />
            </button>
          </div>
          <div className="p-3 overflow-auto max-w-[92vw] max-h-[80vh]">
            <div
              className="grid gap-0.5"
              style={{
                gridTemplateColumns: `repeat(18, ${cellSize}px)`,
                gridAutoRows: `${cellSize}px`,
              }}
            >
              {ELEMENTS.map((el) => (
                <button
                  key={el.z}
                  onClick={() => setPicked(el)}
                  className={cn(
                    "rounded border-2 flex flex-col items-center justify-center text-[8px] font-bold leading-none hover:scale-110 hover:z-10 transition-transform",
                    CATEGORY_COLOR[el.category],
                  )}
                  style={{
                    gridColumn: el.group,
                    gridRow: el.period,
                  }}
                  title={`${el.name} (${el.symbol})`}
                >
                  <span className="text-[7px] opacity-70">{el.z}</span>
                  <span className="text-[11px]">{el.symbol}</span>
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[9px]">
              {Object.entries(CATEGORY_COLOR).map(([k, v]) => (
                <span
                  key={k}
                  className={cn("px-1.5 py-0.5 rounded border-2 capitalize font-bold", v)}
                >
                  {k.replace("-", " ")}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <Dialog open={!!picked} onOpenChange={(o) => !o && setPicked(null)}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-3xl">{picked?.name}</DialogTitle>
            <DialogDescription className="capitalize">
              {picked?.category.replace("-", " ")}
            </DialogDescription>
          </DialogHeader>
          {picked && (
            <div
              className={cn(
                "rounded-3xl p-6 text-center border-2 shadow-inner",
                CATEGORY_COLOR[picked.category],
              )}
            >
              <div className="text-xs font-bold opacity-70">Atomic number {picked.z}</div>
              <div className="text-7xl font-extrabold tracking-tight my-2">{picked.symbol}</div>
              <div className="text-xl font-bold">{picked.name}</div>
              <div className="text-sm opacity-80 mt-1">Atomic mass: {picked.mass}</div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Stat label="Group">{picked?.group}</Stat>
            <Stat label="Period">
              {picked?.period && picked.period <= 7
                ? picked.period
                : picked?.category === "lanthanide"
                  ? "6"
                  : "7"}
            </Stat>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border-2 border-border/60 p-2 text-center">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="text-sm font-bold">{children}</div>
    </div>
  );
}
