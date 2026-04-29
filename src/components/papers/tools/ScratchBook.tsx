import { useEffect, useRef, useState } from "react";
import { motion, useDragControls } from "framer-motion";
import {
  LuGripVertical,
  LuX,
  LuMinus,
  LuStickyNote,
  LuPencil,
  LuEraser,
  LuTrash2,
  LuPlus,
  LuPalette,
  LuDownload,
  LuStickyNote as LuNote,
} from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useToolsStore } from "./useToolsStore";

interface Note {
  id: string;
  text: string;
  color: string;
}

const NOTE_COLORS = ["#fde68a", "#fca5a5", "#a7f3d0", "#bfdbfe", "#ddd6fe", "#fbcfe8"];

export function ScratchBook() {
  const open = useToolsStore((s) => s.scratchOpen);
  const setOpen = useToolsStore((s) => s.setScratchOpen);
  const min = useToolsStore((s) => s.scratchMin);
  const setMin = useToolsStore((s) => s.setScratchMin);
  const drag = useDragControls();

  if (!open) return null;
  if (min) {
    return (
      <button
        onClick={() => setMin(false)}
        className="fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full border-2 border-border/60 bg-card shadow-2xl flex items-center justify-center hover:border-primary print:hidden"
        title="Open scratch book"
      >
        <LuStickyNote size={20} />
      </button>
    );
  }

  return (
    <motion.div
      drag
      dragControls={drag}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0}
      initial={{ x: 0, y: 0 }}
      style={{ left: "calc(50vw - 210px)", top: "calc(50vh - 240px)" }}
      className="fixed z-50 select-none print:hidden"
    >
      <div className="rounded-2xl border-2 border-border/60 bg-card/95 backdrop-blur shadow-2xl w-[420px] max-w-[92vw]">
        <div
          className="flex items-center gap-2 px-3 py-2 border-b border-border/40 cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => drag.start(e)}
        >
          <LuGripVertical size={14} className="text-muted-foreground" />
          <LuStickyNote size={14} className="text-primary" />
          <span className="text-sm font-bold flex-1">Scratch book</span>
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

        <Tabs defaultValue="canvas" className="p-3">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="canvas">Canvas</TabsTrigger>
            <TabsTrigger value="notes">Sticky notes</TabsTrigger>
          </TabsList>
          <TabsContent value="canvas">
            <ScratchCanvas />
          </TabsContent>
          <TabsContent value="notes">
            <StickyNotes />
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
}

function ScratchCanvas() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const ptsRef = useRef<{ x: number; y: number }[]>([]);
  const drawingRef = useRef(false);
  const [isDark, setIsDark] = useState(false);
  const [color, setColor] = useState("#0f172a");
  const [size, setSize] = useState(3);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");

  // Detect dark mode
  useEffect(() => {
    const update = () => {
      const dark = document.documentElement.classList.contains("dark");
      setIsDark(dark);
      setColor((c) => (c === "#0f172a" || c === "#f8fafc" ? (dark ? "#f8fafc" : "#0f172a") : c));
    };
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const pointerPos = (e: React.PointerEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent) => {
    drawingRef.current = true;
    ptsRef.current = [pointerPos(e)];
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const move = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const ctx = ref.current!.getContext("2d")!;
    const p = pointerPos(e);
    ptsRef.current.push(p);
    const pts = ptsRef.current;
    if (pts.length < 3) return;
    ctx.strokeStyle = color;
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.lineWidth = tool === "eraser" ? size * 4 : size;
    ctx.setLineDash([]);
    // Draw the latest segment using a quadratic curve through the midpoint
    // of the last two points for a continuous, smoothed stroke.
    const i = pts.length - 1;
    const prev = pts[i - 2];
    const cur = pts[i - 1];
    const next = pts[i];
    const m1 = { x: (prev.x + cur.x) / 2, y: (prev.y + cur.y) / 2 };
    const m2 = { x: (cur.x + next.x) / 2, y: (cur.y + next.y) / 2 };
    ctx.beginPath();
    ctx.moveTo(m1.x, m1.y);
    ctx.quadraticCurveTo(cur.x, cur.y, m2.x, m2.y);
    ctx.stroke();
  };

  const end = () => {
    drawingRef.current = false;
    ptsRef.current = [];
  };

  const clear = () => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.restore();
  };

  const download = () => {
    const url = ref.current!.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "scratch.png";
    a.click();
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <ToolBtn active={tool === "pen"} onClick={() => setTool("pen")} title="Pen">
          <LuPencil size={14} />
        </ToolBtn>
        <ToolBtn active={tool === "eraser"} onClick={() => setTool("eraser")} title="Eraser">
          <LuEraser size={14} />
        </ToolBtn>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-8 h-8 rounded-lg cursor-pointer p-0.5 border-2 border-border/60"
          title="Color"
        />
        <div className="flex items-center gap-2 flex-1 min-w-[120px]">
          <LuPalette size={12} />
          <Slider value={[size]} min={1} max={30} step={1} onValueChange={([v]) => setSize(v)} />
          <span className="text-xs font-mono w-6">{size}</span>
        </div>
        <ToolBtn onClick={download} title="Save PNG">
          <LuDownload size={14} />
        </ToolBtn>
        <ToolBtn onClick={clear} title="Clear" danger>
          <LuTrash2 size={14} />
        </ToolBtn>
      </div>
      <canvas
        ref={ref}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className={cn(
          "w-full h-[280px] rounded-xl border-2 border-border/60 touch-none cursor-crosshair",
          isDark ? "bg-slate-900" : "bg-white",
        )}
      />
    </div>
  );
}

function ToolBtn({
  children,
  active,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex items-center justify-center w-8 h-8 rounded-lg border-2 transition",
        active && "border-primary bg-primary/10 text-primary",
        !active && !danger && "border-border/60 hover:border-primary/40",
        danger && "border-red-500/40 text-red-500 hover:bg-red-500/10",
      )}
    >
      {children}
    </button>
  );
}

function StickyNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const add = () => {
    setNotes((n) => [
      ...n,
      { id: crypto.randomUUID(), text: "", color: NOTE_COLORS[n.length % NOTE_COLORS.length] },
    ]);
  };
  const update = (id: string, patch: Partial<Note>) => {
    setNotes((n) => n.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };
  const remove = (id: string) => setNotes((n) => n.filter((x) => x.id !== id));

  return (
    <div className="space-y-2">
      <Button onClick={add} size="sm" variant="outline" className="w-full rounded-xl gap-1.5">
        <LuPlus size={14} /> Add sticky note
      </Button>
      <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto p-1">
        {notes.length === 0 && (
          <div className="col-span-2 text-center text-xs text-muted-foreground py-8">
            <LuNote size={24} className="mx-auto mb-2 opacity-50" />
            No notes yet.
          </div>
        )}
        {notes.map((n) => (
          <div
            key={n.id}
            className="rounded-xl p-2 shadow-md flex flex-col gap-1.5"
            style={{ background: n.color }}
          >
            <div className="flex items-center gap-1">
              <div className="flex gap-1 flex-1">
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => update(n.id, { color: c })}
                    className="w-3 h-3 rounded-full border border-black/20"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <button
                onClick={() => remove(n.id)}
                className="text-black/60 hover:text-red-600"
                title="Delete"
              >
                <LuTrash2 size={12} />
              </button>
            </div>
            <textarea
              value={n.text}
              onChange={(e) => update(n.id, { text: e.target.value })}
              placeholder="Write something..."
              className="bg-transparent resize-none text-xs text-black placeholder:text-black/40 focus:outline-none min-h-[60px]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
