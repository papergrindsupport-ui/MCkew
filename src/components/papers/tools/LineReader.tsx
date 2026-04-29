import { useEffect, useRef, useState } from "react";
import { LuGripHorizontal, LuX } from "react-icons/lu";
import { Slider } from "@/components/ui/slider";
import { useToolsStore } from "./useToolsStore";

export function LineReader() {
  const on = useToolsStore((s) => s.lineReaderOn);
  const setOn = useToolsStore((s) => s.setLineReaderOn);
  const height = useToolsStore((s) => s.lineReaderHeight);
  const setHeight = useToolsStore((s) => s.setLineReaderHeight);

  const [top, setTop] = useState(200);
  const draggingRef = useRef<{ startY: number; startTop: number } | null>(null);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = draggingRef.current;
      if (!d) return;
      const next = d.startTop + (e.clientY - d.startY);
      const max = window.innerHeight - height - 40;
      setTop(Math.max(0, Math.min(max, next)));
    }
    function onUp() {
      draggingRef.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [height]);

  if (!on) return null;

  const startDrag = (e: React.PointerEvent) => {
    draggingRef.current = { startY: e.clientY, startTop: top };
  };

  return (
    <div className="fixed inset-0 z-40 pointer-events-none print:hidden">
      {/* Top blurred region */}
      <div
        className="absolute left-0 right-0 top-0 backdrop-blur-sm bg-background/30 pointer-events-auto"
        style={{ height: `${top}px` }}
        onClick={() => {
          /* swallow clicks so the blur acts as a real overlay */
        }}
      />
      {/* Bottom blurred region */}
      <div
        className="absolute left-0 right-0 backdrop-blur-sm bg-background/30 pointer-events-auto"
        style={{ top: `${top + height}px`, bottom: 0 }}
      />

      {/* Clear reader strip with controls */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{ top: `${top}px`, height: `${height}px` }}
      >
        <div className="relative w-full h-full border-y-2 border-yellow-500/70">
          <button
            onPointerDown={startDrag}
            className="pointer-events-auto absolute left-1/2 -translate-x-1/2 -top-3 w-12 h-6 rounded-full bg-card border-2 border-yellow-500 flex items-center justify-center cursor-grab active:cursor-grabbing shadow-md"
            title="Drag"
          >
            <LuGripHorizontal size={14} />
          </button>
          <button
            onClick={() => setOn(false)}
            className="pointer-events-auto absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-card border-2 border-border flex items-center justify-center hover:border-red-500 hover:text-red-500"
            title="Close line reader"
          >
            <LuX size={12} />
          </button>
        </div>
      </div>

      {/* Height controller, anchored just below the reader strip */}
      <div
        className="absolute left-1/2 -translate-x-1/2 pointer-events-auto bg-card border-2 border-border/70 rounded-2xl shadow-lg px-3 py-2 flex items-center gap-3 w-72"
        style={{ top: `${top + height + 8}px` }}
      >
        <span className="text-xs font-bold whitespace-nowrap">Height: {height}px</span>
        <Slider
          value={[height]}
          min={16}
          max={160}
          step={2}
          onValueChange={([v]) => setHeight(v)}
          className="flex-1"
        />
      </div>
    </div>
  );
}
