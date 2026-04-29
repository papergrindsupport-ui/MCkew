// Session countdown timer tab — large countdown box, settings modal,
// fullscreen toggle, subject switcher.

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LuSettings, LuMaximize, LuMinimize, LuChevronDown, LuX } from "react-icons/lu";
import {
  EXAM_DATES,
  SESSION_LIST,
  SUBJECT_LABEL,
  useCountdownPrefs,
  updateCountdownPrefs,
  type CdSubject,
  type CdSessionId,
} from "@/lib/countdownStore";
import { cn } from "@/lib/utils";

const FONT_FAMILIES = [
  { label: "Fredoka", value: "Fredoka, system-ui, sans-serif" },
  { label: "System", value: "system-ui, sans-serif" },
  { label: "Mono", value: "ui-monospace, SFMono-Regular, Menlo, monospace" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
];

const BG_COLORS = [
  "hsl(var(--card))",
  "hsl(var(--primary))",
  "#0f172a",
  "#1e293b",
  "#0c4a6e",
  "#7c2d12",
  "#064e3b",
  "#581c87",
  "#fef3c7",
  "#fce7f3",
];

const FONT_COLORS = [
  "hsl(var(--foreground))",
  "hsl(var(--primary))",
  "#ffffff",
  "#0f172a",
  "#fbbf24",
  "#34d399",
];

function getRemaining(
  target: number,
  format: { days: boolean; hours: boolean; minutes: boolean; seconds: boolean },
) {
  const ms = Math.max(0, target - Date.now());
  let s = Math.floor(ms / 1000);
  let d = 0,
    h = 0,
    m = 0;
  if (format.days) {
    d = Math.floor(s / 86400);
    s -= d * 86400;
  }
  if (format.hours) {
    h = Math.floor(s / 3600);
    s -= h * 3600;
  }
  if (format.minutes) {
    m = Math.floor(s / 60);
    s -= m * 60;
  }
  return { d, h, m, s, totalMs: ms };
}

export function CountdownTab() {
  const prefs = useCountdownPrefs();
  const [now, setNow] = useState(Date.now());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 1Hz tick (or 1min if seconds disabled)
  useEffect(() => {
    const interval = prefs.format.seconds ? 1000 : 30000;
    const id = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(id);
  }, [prefs.format.seconds]);

  // Fullscreen API sync
  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const targetIso = EXAM_DATES[prefs.session]?.[prefs.subject];
  const target = targetIso ? new Date(targetIso).getTime() : 0;
  const { d, h, m, s, totalMs } = getRemaining(target, prefs.format);

  const sessionLabel = SESSION_LIST.find((x) => x.id === prefs.session)?.label ?? "";
  const examDateStr = targetIso
    ? new Date(targetIso).toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative rounded-3xl border-2 border-border overflow-hidden",
        fullscreen
          ? "h-screen flex items-center justify-center"
          : "min-h-[420px] flex items-center justify-center p-6",
      )}
      style={{ background: prefs.background }}
    >
      {/* Top controls */}
      <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
        <SubjectDropdown
          subject={prefs.subject}
          onChange={(s) => updateCountdownPrefs({ subject: s })}
        />
        <IconBtn label="Settings" onClick={() => setSettingsOpen(true)}>
          <LuSettings size={14} />
        </IconBtn>
        <IconBtn label={fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={toggleFullscreen}>
          {fullscreen ? <LuMinimize size={14} /> : <LuMaximize size={14} />}
        </IconBtn>
      </div>

      {/* Countdown */}
      <div className="text-center w-full" style={{ color: prefs.fontColor }}>
        <p className="text-xs sm:text-sm font-bold uppercase tracking-widest opacity-70">
          {SUBJECT_LABEL[prefs.subject]} · {sessionLabel}
        </p>
        <div
          className="mt-3 flex items-end justify-center gap-2 sm:gap-4 flex-wrap tabular-nums leading-none"
          style={{
            fontFamily: prefs.fontFamily,
            fontSize: fullscreen ? Math.min(prefs.fontSize * 1.6, 200) : prefs.fontSize,
          }}
        >
          {prefs.format.days && <Unit value={d} label="days" />}
          {prefs.format.hours && <Unit value={h} label="hrs" />}
          {prefs.format.minutes && <Unit value={m} label="min" />}
          {prefs.format.seconds && <Unit value={s} label="sec" />}
        </div>
        <p className="mt-4 text-xs sm:text-sm opacity-70">{examDateStr}</p>
        {totalMs === 0 && <p className="mt-2 text-base font-bold">Exam time!</p>}
      </div>

      <CountdownSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <motion.span
        key={value}
        initial={{ y: -6, opacity: 0.4 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.18 }}
        className="font-bold"
      >
        {String(value).padStart(2, "0")}
      </motion.span>
      <span
        className="text-xs uppercase tracking-widest opacity-70 mt-1"
        style={{ fontSize: "0.18em" }}
      >
        {label}
      </span>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="w-7 h-7 grid place-items-center rounded-full bg-background/40 backdrop-blur hover:bg-background/70 text-foreground/80 hover:text-foreground transition cursor-pointer"
    >
      {children}
    </button>
  );
}

function SubjectDropdown({
  subject,
  onChange,
}: {
  subject: CdSubject;
  onChange: (s: CdSubject) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-background/40 backdrop-blur text-xs font-bold hover:bg-background/70 cursor-pointer transition"
      >
        {SUBJECT_LABEL[subject]} <LuChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-40 rounded-xl border-2 border-border bg-card shadow-xl overflow-hidden">
            {(Object.keys(SUBJECT_LABEL) as CdSubject[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  onChange(s);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-muted transition cursor-pointer",
                  s === subject && "bg-primary/10 text-primary font-bold",
                )}
              >
                {SUBJECT_LABEL[s]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CountdownSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const prefs = useCountdownPrefs();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] overflow-y-auto"
        >
          <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
          <div className="relative min-h-full flex items-start sm:items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ y: 16, scale: 0.97 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 8, scale: 0.97 }}
              className="pointer-events-auto relative w-full max-w-[520px] my-4 rounded-3xl border-[2.5px] border-border bg-card shadow-2xl p-5 sm:p-6 max-h-[calc(100dvh-2rem)] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Countdown settings</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="w-8 h-8 rounded-full grid place-items-center hover:bg-muted/60 cursor-pointer transition"
                >
                  <LuX size={18} />
                </button>
              </div>

              <div className="space-y-5">
                <Field label="Exam session">
                  <select
                    value={prefs.session}
                    onChange={(e) =>
                      updateCountdownPrefs({ session: e.target.value as CdSessionId })
                    }
                    className="w-full px-3 py-2 rounded-xl border-2 border-border bg-card text-sm focus:outline-none focus:border-primary cursor-pointer"
                  >
                    {SESSION_LIST.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Format">
                  <div className="flex flex-wrap gap-2 text-xs">
                    {(["days", "hours", "minutes", "seconds"] as const).map((k) => (
                      <label
                        key={k}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-border bg-card cursor-pointer hover:border-primary transition font-bold capitalize"
                      >
                        <input
                          type="checkbox"
                          checked={prefs.format[k]}
                          onChange={(e) =>
                            updateCountdownPrefs({
                              format: { ...prefs.format, [k]: e.target.checked },
                            })
                          }
                        />
                        {k}
                      </label>
                    ))}
                  </div>
                </Field>

                <Field label="Background">
                  <div className="flex flex-wrap gap-2">
                    {BG_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => updateCountdownPrefs({ background: c })}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition cursor-pointer",
                          prefs.background === c ? "border-primary scale-110" : "border-border",
                        )}
                        style={{ background: c }}
                        aria-label={c}
                      />
                    ))}
                  </div>
                </Field>

                <Field label="Font color">
                  <div className="flex flex-wrap gap-2">
                    {FONT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => updateCountdownPrefs({ fontColor: c })}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition cursor-pointer",
                          prefs.fontColor === c ? "border-primary scale-110" : "border-border",
                        )}
                        style={{ background: c }}
                        aria-label={c}
                      />
                    ))}
                  </div>
                </Field>

                <Field label="Font family">
                  <select
                    value={prefs.fontFamily}
                    onChange={(e) => updateCountdownPrefs({ fontFamily: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border-2 border-border bg-card text-sm focus:outline-none focus:border-primary cursor-pointer"
                  >
                    {FONT_FAMILIES.map((f) => (
                      <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label={`Font size (${prefs.fontSize}px)`}>
                  <input
                    type="range"
                    min={32}
                    max={140}
                    step={2}
                    value={prefs.fontSize}
                    onChange={(e) => updateCountdownPrefs({ fontSize: Number(e.target.value) })}
                    className="w-full cursor-pointer"
                  />
                </Field>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
