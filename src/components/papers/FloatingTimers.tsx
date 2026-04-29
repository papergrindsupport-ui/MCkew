import { useEffect, useRef, useState } from "react";
import {
  LuPlay,
  LuPause,
  LuRotateCcw,
  LuChevronDown,
  LuChevronUp,
  LuChevronsDownUp,
  LuX,
  LuPencil,
  LuFlag,
  LuTimer,
  LuClock,
  LuMaximize2,
  LuMinimize2,
  LuGripVertical,
} from "react-icons/lu";
import toast from "react-hot-toast";
import { motion, useDragControls } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePaperSession, type TimerCfg } from "./PaperSession";

export function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

/** Plays a beep + shakes the page on time's up */
function timeUpEffect() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    osc.start();
    let t = ctx.currentTime;
    for (let i = 0; i < 6; i++) {
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.setValueAtTime(0, t + 0.15);
      t += 0.3;
    }
    osc.stop(t);
  } catch {}
  document.body.classList.add("animate-shake-hard");
  setTimeout(() => document.body.classList.remove("animate-shake-hard"), 1500);
}

type CollapseState = "expanded" | "medium" | "mini";

export function FloatingTimers() {
  const session = usePaperSession();
  const [state, setState] = useState<CollapseState>("expanded");
  const [tabId, setTabId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const dragControls = useDragControls();

  // Tick every second
  useEffect(() => {
    const i = setInterval(() => session._tick(), 1000);
    return () => clearInterval(i);
  }, [session]);

  // Trigger warnings & expirations
  useEffect(() => {
    session.timers.forEach((t) => {
      if (t.running && !t.warned && t.remainingSec <= 5 * 60 && t.remainingSec > 0) {
        toast(`⏰ Hurry up — 5 minutes left on "${t.name}"`, { duration: 6000 });
        session.updateTimer(t.id, { warned: true });
      }
      if (t.running && !t.expired && t.remainingSec === 0) {
        timeUpEffect();
        toast.error(`⏰ Time's up on "${t.name}"!`, { duration: 8000 });
        session.updateTimer(t.id, { expired: true, running: false });
        if (session.settings.autoSubmitOnTimeUp && !session.paperSubmitted) {
          session.submitPaper();
          toast("Paper auto-submitted (time ran out).", { icon: "📤" });
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.timers]);

  if (!session.settings.timed || session.timers.length === 0) return null;

  const active = session.timers.find((t) => t.id === tabId) ?? session.timers[0];
  if (!active) return null;

  const cycle = () =>
    setState((s) => (s === "expanded" ? "medium" : s === "medium" ? "mini" : "expanded"));

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0}
      initial={{ x: 16, y: 16 }}
      className="fixed top-20 right-4 z-50 select-none print:hidden"
    >
      <div
        className={cn(
          "rounded-2xl border-2 border-border/60 bg-card/95 backdrop-blur shadow-2xl",
          state === "expanded" && "w-[min(320px,calc(100vw-1rem))]",
          state === "medium" && "w-[min(240px,calc(100vw-1rem))]",
          state === "mini" && "w-auto",
        )}
      >
        {/* Header / drag handle */}
        <div
          className="flex items-center gap-1 px-2 py-1.5 border-b border-border/40 cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <LuGripVertical size={12} className="text-muted-foreground" />
          <LuTimer size={12} className="text-primary" />
          {state !== "mini" && (
            <span className="text-xs font-bold flex-1 truncate">{active.name}</span>
          )}
          {state === "mini" && (
            <span
              className={cn(
                "text-sm font-mono font-bold ml-1",
                active.remainingSec <= 300 && "text-red-500",
              )}
            >
              {fmt(active.remainingSec)}
            </span>
          )}
          <button
            onClick={cycle}
            className="ml-auto p-1 rounded hover:bg-accent text-muted-foreground"
            title="Toggle size"
          >
            {state === "expanded" ? (
              <LuMinimize2 size={12} />
            ) : state === "medium" ? (
              <LuChevronsDownUp size={12} />
            ) : (
              <LuMaximize2 size={12} />
            )}
          </button>
        </div>

        {/* Tabs */}
        {state !== "mini" && session.timers.length > 1 && (
          <div className="flex gap-1 p-1.5 overflow-x-auto border-b border-border/30">
            {session.timers.map((t) => (
              <button
                key={t.id}
                onClick={() => setTabId(t.id)}
                className={cn(
                  "px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap shrink-0 transition",
                  t.id === active.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent",
                )}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        {state === "expanded" && (
          <div className="p-3 space-y-3">
            {editingId === active.id ? (
              <TimerEdit timer={active} onDone={() => setEditingId(null)} />
            ) : (
              <div className="text-center">
                <div
                  className={cn(
                    "text-4xl font-mono font-extrabold tracking-tight",
                    active.remainingSec === 0 && "text-red-500",
                    active.remainingSec > 0 && active.remainingSec <= 300 && "text-amber-500",
                  )}
                >
                  {fmt(active.remainingSec)}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  of {fmt(active.durationSec)}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 justify-center">
              <IconBtn
                onClick={() => session.pauseResumeTimer(active.id)}
                title={active.running ? "Pause" : "Play"}
              >
                {active.running ? <LuPause size={14} /> : <LuPlay size={14} />}
              </IconBtn>
              <IconBtn onClick={() => session.restartTimer(active.id)} title="Restart">
                <LuRotateCcw size={14} />
              </IconBtn>
              <IconBtn
                onClick={() => setEditingId(editingId === active.id ? null : active.id)}
                title="Edit"
              >
                <LuPencil size={14} />
              </IconBtn>
              <IconBtn
                onClick={() => {
                  session.removeTimer(active.id);
                  setTabId(null);
                }}
                title="Remove"
                danger
              >
                <LuX size={14} />
              </IconBtn>
            </div>
          </div>
        )}

        {state === "medium" && (
          <div className="p-2 flex items-center gap-2">
            <div
              className={cn(
                "text-lg font-mono font-extrabold flex-1 text-center",
                active.remainingSec === 0 && "text-red-500",
                active.remainingSec > 0 && active.remainingSec <= 300 && "text-amber-500",
              )}
            >
              {fmt(active.remainingSec)}
            </div>
            <IconBtn
              onClick={() => session.pauseResumeTimer(active.id)}
              title={active.running ? "Pause" : "Play"}
            >
              {active.running ? <LuPause size={12} /> : <LuPlay size={12} />}
            </IconBtn>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex items-center justify-center w-7 h-7 rounded-lg border-2 transition",
        danger
          ? "border-red-500/40 text-red-500 hover:bg-red-500/10"
          : "border-border/60 hover:border-primary/50 hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

function TimerEdit({ timer, onDone }: { timer: TimerCfg; onDone: () => void }) {
  const session = usePaperSession();
  const [name, setName] = useState(timer.name);
  const min = Math.floor(timer.durationSec / 60);
  const sec = timer.durationSec % 60;
  const [m, setM] = useState(min);
  const [s, setS] = useState(sec);

  const save = () => {
    const dur = Math.max(1, m * 60 + s);
    session.updateTimer(timer.id, {
      durationSec: dur,
      remainingSec: dur,
      warned: false,
      expired: false,
      name,
    });
    onDone();
  };

  return (
    <div className="space-y-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-8 text-sm rounded-xl"
        placeholder="Name"
      />
      <div className="flex items-center gap-1 justify-center">
        <NumStepper value={m} onChange={setM} max={999} />
        <span className="font-bold">m</span>
        <NumStepper value={s} onChange={setS} max={59} />
        <span className="font-bold">s</span>
      </div>
      <div className="flex gap-1.5">
        <Button onClick={save} size="sm" className="flex-1 rounded-xl h-8">
          Save
        </Button>
        <Button onClick={onDone} size="sm" variant="ghost" className="rounded-xl h-8">
          Cancel
        </Button>
      </div>
    </div>
  );
}

function NumStepper({
  value,
  onChange,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  max: number;
}) {
  return (
    <div className="inline-flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-6 h-7 rounded-l-lg border-2 border-r-0 border-border/60 hover:bg-accent text-sm font-bold"
      >
        −
      </button>
      <Input
        type="number"
        value={value}
        min={0}
        max={max}
        onChange={(e) => onChange(Math.min(max, Math.max(0, Number(e.target.value) || 0)))}
        className="h-7 w-12 rounded-none text-center px-1 text-sm font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-6 h-7 rounded-r-lg border-2 border-l-0 border-border/60 hover:bg-accent text-sm font-bold"
      >
        +
      </button>
    </div>
  );
}

/* ============ Stopwatch ============ */
export function FloatingStopwatch() {
  const session = usePaperSession();
  const [state, setState] = useState<CollapseState>("expanded");
  const dragControls = useDragControls();

  if (!session.stopwatchEnabled) return null;

  const cycle = () =>
    setState((s) => (s === "expanded" ? "medium" : s === "medium" ? "mini" : "expanded"));

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0}
      initial={{ x: 0, y: 0 }}
      className="fixed bottom-4 right-4 z-50 select-none print:hidden"
    >
      <div
        className={cn(
          "rounded-2xl border-2 border-border/60 bg-card/95 backdrop-blur shadow-2xl",
          state === "expanded" && "w-[min(280px,calc(100vw-1rem))]",
          state === "medium" && "w-[min(200px,calc(100vw-1rem))]",
          state === "mini" && "w-auto",
        )}
      >
        <div
          className="flex items-center gap-1 px-2 py-1.5 border-b border-border/40 cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <LuGripVertical size={12} className="text-muted-foreground" />
          <LuClock size={12} className="text-primary" />
          {state !== "mini" && <span className="text-xs font-bold flex-1">Stopwatch</span>}
          {state === "mini" && (
            <span className="text-sm font-mono font-bold ml-1">{fmt(session.stopwatchSec)}</span>
          )}
          <button
            onClick={cycle}
            className="ml-auto p-1 rounded hover:bg-accent text-muted-foreground"
          >
            {state === "expanded" ? (
              <LuMinimize2 size={12} />
            ) : state === "medium" ? (
              <LuChevronsDownUp size={12} />
            ) : (
              <LuMaximize2 size={12} />
            )}
          </button>
        </div>

        {state === "expanded" && (
          <div className="p-3 space-y-2">
            <div className="text-center text-3xl font-mono font-extrabold">
              {fmt(session.stopwatchSec)}
            </div>
            <div className="flex gap-1.5 justify-center flex-wrap">
              <IconBtn
                onClick={() =>
                  session.stopwatchRunning ? session.pauseStopwatch() : session.startStopwatch()
                }
                title={session.stopwatchRunning ? "Pause" : "Start"}
              >
                {session.stopwatchRunning ? <LuPause size={14} /> : <LuPlay size={14} />}
              </IconBtn>
              <IconBtn onClick={session.lapStopwatch} title="Lap">
                <LuFlag size={14} />
              </IconBtn>
              <IconBtn onClick={session.resetStopwatch} title="Reset">
                <LuRotateCcw size={14} />
              </IconBtn>
              <IconBtn onClick={() => session.setStopwatchEnabled(false)} title="Close" danger>
                <LuX size={14} />
              </IconBtn>
            </div>
            {session.stopwatchLaps.length > 0 && (
              <div className="max-h-32 overflow-y-auto rounded-xl border border-border/40 p-2 text-xs space-y-1">
                {session.stopwatchLaps.map((l, i) => {
                  const prev = i === 0 ? 0 : session.stopwatchLaps[i - 1];
                  return (
                    <div key={i} className="flex justify-between font-mono">
                      <span className="text-muted-foreground">Lap {i + 1}</span>
                      <span>{fmt(l - prev)}</span>
                      <span className="text-muted-foreground">{fmt(l)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {state === "medium" && (
          <div className="p-2 flex items-center gap-2">
            <div className="text-lg font-mono font-extrabold flex-1 text-center">
              {fmt(session.stopwatchSec)}
            </div>
            <IconBtn
              onClick={() =>
                session.stopwatchRunning ? session.pauseStopwatch() : session.startStopwatch()
              }
              title={session.stopwatchRunning ? "Pause" : "Start"}
            >
              {session.stopwatchRunning ? <LuPause size={12} /> : <LuPlay size={12} />}
            </IconBtn>
          </div>
        )}
      </div>
    </motion.div>
  );
}
