import { useState } from "react";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import {
  LuSettings,
  LuClipboardCheck,
  LuZap,
  LuFileCheck,
  LuTags,
  LuLightbulb,
  LuScissors,
  LuTimer,
  LuClock,
  LuPlus,
  LuTrash2,
  LuChevronDown,
  LuChevronUp,
  LuList,
  LuKeyboard,
  LuTag,
  LuMessageSquare,
  LuTextCursor,
} from "react-icons/lu";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { usePaperSession, type SubmissionMode } from "./PaperSession";
import { fmt } from "./FloatingTimers";

const MODES: { key: SubmissionMode; label: string; desc: string; icon: typeof LuClipboardCheck }[] =
  [
    {
      key: "end-of-paper",
      label: "Submit at end of paper",
      desc: "One Submit button at the end. Marks reveal after you submit the whole paper.",
      icon: LuFileCheck,
    },
    {
      key: "per-question",
      label: "Submit per question",
      desc: "A Submit button under every question. Mark each one as you go.",
      icon: LuClipboardCheck,
    },
    {
      key: "instant",
      label: "Instant marking",
      desc: "No Submit button — selecting an option immediately marks the question.",
      icon: LuZap,
    },
  ];

export function PaperSettingsButton() {
  const [open, setOpen] = useState(false);
  const session = usePaperSession();
  const s = session.settings;
  const set = (patch: Partial<typeof s>) => session.setSettings({ ...s, ...patch });
  const [timerSectionOpen, setTimerSectionOpen] = useState(true);
  const showTextPopover = useAppSettingsStore((st) => st.showTextPopover);
  const setShowTextPopover = useAppSettingsStore((st) => st.setShowTextPopover);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="rounded-full gap-1.5"
        onClick={() => setOpen(true)}
      >
        <LuSettings size={14} /> Settings
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Paper settings</DialogTitle>
            <DialogDescription>Customize how you solve and what you see.</DialogDescription>
          </DialogHeader>

          {/* Submission modes */}
          <Section title="Marking & submission">
            <div className="space-y-2">
              {MODES.map((m) => {
                const Icon = m.icon;
                const isSel = s.submissionMode === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => set({ submissionMode: m.key })}
                    className={cn(
                      "w-full text-left rounded-2xl border-2 p-3 flex gap-3 items-start transition-all",
                      isSel
                        ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                        : "border-border/60 hover:border-primary/40 hover:bg-accent/30",
                    )}
                  >
                    <span
                      className={cn(
                        "shrink-0 w-9 h-9 rounded-2xl border-2 flex items-center justify-center",
                        isSel
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/60",
                      )}
                    >
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold">{m.label}</div>
                      <div className="text-sm text-muted-foreground mt-0.5">{m.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Navigation">
            <ToggleRow
              icon={<LuList size={14} />}
              label="Show navigation strip"
              desc="A small strip with circles for Q1–Q40 to jump to any question."
              value={s.showNavStrip}
              onChange={(v) => set({ showNavStrip: v })}
            />
            {s.showNavStrip && (
              <div className="rounded-2xl border-2 border-border/60 p-3">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Strip position
                </Label>
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {(["right", "left", "top", "bottom"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => set({ navStripPosition: p })}
                      className={cn(
                        "px-2 py-1.5 rounded-xl border-2 text-xs font-bold capitalize transition",
                        s.navStripPosition === p
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 hover:border-primary/40",
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Section>
          <Section title="Display">
            <ToggleRow
              icon={<LuScissors size={14} />}
              label="MCQ eliminator"
              desc="Show a minus icon on each option to grey it out and strike it through."
              value={s.mcqEliminator}
              onChange={(v) => set({ mcqEliminator: v })}
            />
            <ToggleRow
              icon={<LuTags size={14} />}
              label="Hide all tags"
              desc="Hide difficulty, target grade and any other tags on every question."
              value={s.hideAllTags}
              onChange={(v) => set({ hideAllTags: v })}
            />
            <ToggleRow
              icon={<LuLightbulb size={14} />}
              label="Show hints"
              desc="Show & highlight ‘trap-option’ and ‘easy-to-eliminate’ tags before submitting."
              value={s.showHints}
              onChange={(v) => set({ showHints: v })}
            />
            <ToggleRow
              icon={<LuKeyboard size={14} />}
              label="Keyboard navigation"
              desc="Use ← / → arrow keys to move between MCQ options and questions."
              value={s.keyboardNav}
              onChange={(v) => set({ keyboardNav: v })}
            />
            <ToggleRow
              icon={<LuTag size={14} />}
              label="Hide tag button"
              desc="Hide the per-question tag icon (and the tags row)."
              value={s.hideTagButton}
              onChange={(v) => set({ hideTagButton: v })}
            />
            <ToggleRow
              icon={<LuMessageSquare size={14} />}
              label="Hide comment button"
              desc="Hide the per-question comment icon."
              value={s.hideCommentButton}
              onChange={(v) => set({ hideCommentButton: v })}
            />
            <ToggleRow
              icon={<LuTextCursor size={14} />}
              label="Show text popover"
              desc="Floating toolbar to highlight, underline, tag, comment, blur or copy selected text."
              value={showTextPopover}
              onChange={(v) => setShowTextPopover(v)}
            />
          </Section>

          {/* Timer */}
          <Section title="Time">
            <ToggleRow
              icon={<LuTimer size={14} />}
              label="Timed"
              desc="Run countdown timers while solving."
              value={s.timed}
              onChange={(v) => {
                set({ timed: v });
                if (v && session.timers.length === 0) session.addTimer();
              }}
            />
            <ToggleRow
              icon={<LuClock size={14} />}
              label="Stopwatch"
              desc="A separate stopwatch with laps, independent of timers."
              value={session.stopwatchEnabled}
              onChange={(v) => session.setStopwatchEnabled(v)}
            />

            {s.timed && (
              <div className="rounded-2xl border-2 border-border/60 p-3">
                <button
                  onClick={() => setTimerSectionOpen((v) => !v)}
                  className="w-full flex items-center justify-between font-bold text-sm"
                >
                  <span>Timer settings ({session.timers.length})</span>
                  {timerSectionOpen ? <LuChevronUp size={14} /> : <LuChevronDown size={14} />}
                </button>
                {timerSectionOpen && (
                  <div className="mt-3 space-y-2">
                    {session.timers.map((t) => (
                      <TimerEditRow key={t.id} id={t.id} />
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        session.addTimer();
                        toast.success("Timer added");
                      }}
                      className="w-full rounded-xl gap-1.5"
                    >
                      <LuPlus size={14} /> Add timer
                    </Button>
                    <ToggleRow
                      compact
                      label="Auto-submit when time's up"
                      desc="If off, submitting after time runs out shows a warning."
                      value={s.autoSubmitOnTimeUp}
                      onChange={(v) => set({ autoSubmitOnTimeUp: v })}
                    />
                  </div>
                )}
              </div>
            )}
          </Section>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-2">
      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  desc,
  value,
  onChange,
  compact,
}: {
  icon?: React.ReactNode;
  label: string;
  desc?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border-2 border-border/60 p-3",
        compact && "p-2 border-border/40",
      )}
    >
      {icon && (
        <span className="shrink-0 w-8 h-8 rounded-xl border-2 border-border/60 flex items-center justify-center text-foreground">
          {icon}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <Label className="font-bold cursor-pointer text-sm">{label}</Label>
        {desc && <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>}
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

function TimerEditRow({ id }: { id: string }) {
  const session = usePaperSession();
  const t = session.timers.find((x) => x.id === id);
  if (!t) return null;
  const m = Math.floor(t.durationSec / 60);
  const sec = t.durationSec % 60;

  const setMin = (val: number) => {
    const dur = Math.max(1, val * 60 + sec);
    session.updateTimer(id, { durationSec: dur, remainingSec: dur, warned: false, expired: false });
  };
  const setSec = (val: number) => {
    const dur = Math.max(1, m * 60 + val);
    session.updateTimer(id, { durationSec: dur, remainingSec: dur, warned: false, expired: false });
  };

  return (
    <div className="rounded-xl border border-border/40 p-2 bg-muted/30">
      <div className="flex items-center gap-2">
        <Input
          value={t.name}
          onChange={(e) => session.renameTimer(id, e.target.value)}
          className="h-8 rounded-lg text-sm flex-1"
        />
        <button
          onClick={() => session.removeTimer(id)}
          className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg border-2 border-red-500/40 text-red-500 hover:bg-red-500/10"
          title="Remove"
        >
          <LuTrash2 size={14} />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2 justify-center">
        <Stepper value={m} onChange={setMin} max={999} />
        <span className="text-xs font-bold">min</span>
        <Stepper value={sec} onChange={setSec} max={59} />
        <span className="text-xs font-bold">sec</span>
        <span className="ml-auto text-[10px] text-muted-foreground font-mono">
          left: {fmt(t.remainingSec)}
        </span>
      </div>
    </div>
  );
}

function Stepper({
  value,
  onChange,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  max: number;
}) {
  return (
    <div className="inline-flex items-center">
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
