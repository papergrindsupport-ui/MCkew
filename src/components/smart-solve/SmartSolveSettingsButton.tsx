import { useState } from "react";
import { useAppSettingsStore } from "@/stores/useAppSettingsStore";
import {
  LuSettings,
  LuClipboardCheck,
  LuZap,
  LuTimer,
  LuLayoutList,
  LuTags,
  LuLightbulb,
  LuScissors,
  LuKeyboard,
  LuTag,
  LuMessageSquare,
  LuTextCursor,
} from "react-icons/lu";
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
import { usePaperSession, type SubmissionMode } from "@/components/papers/PaperSession";
import { useSmartSolveStore, type SmartSolveMode } from "./useSmartSolveStore";

export function SmartSolveSettingsButton() {
  const [open, setOpen] = useState(false);
  const session = usePaperSession();
  const s = session.settings;
  const set = (patch: Partial<typeof s>) => session.setSettings({ ...s, ...patch });

  const ss = useSmartSolveStore();
  const mode = ss.mode;
  const showTextPopover = useAppSettingsStore((st) => st.showTextPopover);
  const setShowTextPopover = useAppSettingsStore((st) => st.setShowTextPopover);

  // available submission modes per smart-solve mode
  // play: per-question (default) or instant (no end-of-paper)
  // general: per-question (default) or instant (no end-of-paper)
  // exam: per-question (default), instant, OR end-of-paper (only here)
  const allowedSubmissionModes: SubmissionMode[] =
    mode === "exam" ? ["per-question", "instant", "end-of-paper"] : ["per-question", "instant"];

  const SUB_LABEL: Record<
    SubmissionMode,
    { label: string; desc: string; icon: typeof LuClipboardCheck }
  > = {
    "per-question": {
      label: "Submit per question",
      desc: "Submit each question one by one.",
      icon: LuClipboardCheck,
    },
    instant: {
      label: "Instant marking",
      desc: "Selecting an option marks immediately.",
      icon: LuZap,
    },
    "end-of-paper": {
      label: "Submit at end of exam",
      desc: "Single submit at the end (Exam mode only).",
      icon: LuClipboardCheck,
    },
  };

  const [warnInstant, setWarnInstant] = useState(false);

  const togglePerQTimer = (v: boolean) => {
    ss.set("perQuestionTimer", v);
    if (v && s.submissionMode !== "instant") setWarnInstant(true);
  };

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
        <DialogContent className="rounded-3xl max-w-lg max-h-[85vh] overflow-y-auto z-[200]">
          {" "}
          <DialogHeader>
            <DialogTitle className="text-2xl">Smart Solve settings</DialogTitle>
            <DialogDescription>
              Settings for <span className="font-bold capitalize">{mode}</span> mode.
            </DialogDescription>
          </DialogHeader>
          <Section title="Marking & submission">
            <div className="space-y-2">
              {allowedSubmissionModes.map((m) => {
                const cfg = SUB_LABEL[m];
                const Icon = cfg.icon;
                const isSel = s.submissionMode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => set({ submissionMode: m })}
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
                      <div className="font-bold">{cfg.label}</div>
                      <div className="text-sm text-muted-foreground mt-0.5">{cfg.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>
          {mode === "play" && (
            <Section title="Play mode">
              <ToggleRow
                icon={<LuTimer size={14} />}
                label="Per-question timer"
                desc="Show a Quizizz-like progress bar that counts down per question."
                value={ss.perQuestionTimer}
                onChange={togglePerQTimer}
              />
              {ss.perQuestionTimer && (
                <div className="rounded-2xl border-2 border-border/60 p-3">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Seconds per question
                  </Label>
                  <Input
                    type="number"
                    min={5}
                    value={ss.perQuestionTimerSec}
                    onChange={(e) =>
                      ss.set("perQuestionTimerSec", Math.max(5, Number(e.target.value) || 60))
                    }
                    className="mt-2 h-9 rounded-lg"
                  />
                </div>
              )}
            </Section>
          )}
          {mode === "exam" && (
            <Section title="Exam mode">
              <ToggleRow
                icon={<LuLayoutList size={14} />}
                label="Paginated"
                desc="Split questions across pages with Next/Prev page buttons."
                value={ss.paginated}
                onChange={(v) => ss.set("paginated", v)}
              />
              {ss.paginated && (
                <div className="rounded-2xl border-2 border-border/60 p-3">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Questions per page
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={ss.questionsPerPage}
                    onChange={(e) =>
                      ss.set("questionsPerPage", Math.max(1, Number(e.target.value) || 8))
                    }
                    className="mt-2 h-9 rounded-lg"
                  />
                </div>
              )}
            </Section>
          )}
          <Section title="Display">
            <ToggleRow
              icon={<LuScissors size={14} />}
              label="MCQ eliminator"
              desc="Show a minus icon to grey out eliminated options."
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
              desc="Show 'trap-option' & 'easy-to-eliminate' tags before submitting."
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
        </DialogContent>
      </Dialog>

      {/* "Instant marking is highly recommended" warning */}
      <Dialog open={warnInstant} onOpenChange={setWarnInstant}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle>Instant marking recommended</DialogTitle>
            <DialogDescription>
              Per-question timer works best with instant marking. Want to switch? You can still keep
              submit-per-question if you prefer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="ghost" onClick={() => setWarnInstant(false)}>
              Keep current
            </Button>
            <Button
              onClick={() => {
                set({ submissionMode: "instant" });
                setWarnInstant(false);
              }}
            >
              Enable instant marking
            </Button>
          </div>
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
}: {
  icon?: React.ReactNode;
  label: string;
  desc?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border-2 border-border/60 p-3">
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

// Re-export so external can use the SmartSolveMode type
export type { SmartSolveMode };
