import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BuilderDialogContent } from "./BuilderDialogShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  LuArrowLeft,
  LuArrowRight,
  LuDownload,
  LuRotateCcw,
  LuUpload,
  LuX,
  LuCheck,
} from "react-icons/lu";
import { useBuilderStore } from "./useBuilderStore";
import {
  makeDefaultSettings,
  DEFAULT_FEEDBACK_LABELS,
  totalMarks,
  resolveRichOrLegacy,
} from "./types";
import { RichTextEditor } from "@/admin/RichTextEditor";

const FEEDBACK_PRESETS: { name: string; labels: string[] }[] = [
  { name: "Default 4-tier", labels: [...DEFAULT_FEEDBACK_LABELS] },
  { name: "Letter grades", labels: ["F", "D", "C", "B", "A", "A*"] },
  { name: "Stars", labels: ["★", "★★", "★★★", "★★★★", "★★★★★"] },
  { name: "Smileys", labels: ["😞", "😐", "🙂", "😄", "🤩"] },
  { name: "Pass / Fail", labels: ["Fail", "Pass"] },
];
import type { Subject } from "@/data/paperData";
import { savePayload } from "./useExportPayloadStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "general", label: "General" },
  { key: "student", label: "Student" },
  { key: "content", label: "Content" },
  { key: "styles", label: "Styles" },
  { key: "grading", label: "Grading" },
  { key: "review", label: "Review & Export" },
] as const;

const FONT_FAMILIES = [
  { label: "Default", value: null },
  { label: "Sans (Inter)", value: "Inter, system-ui, sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", value: "ui-monospace, SFMono-Regular, Menlo, monospace" },
  { label: "Rounded", value: "ui-rounded, 'SF Pro Rounded', system-ui, sans-serif" },
];

const FONT_SIZES = [
  { label: "Default", value: null },
  { label: "Small", value: "13px" },
  { label: "Medium", value: "15px" },
  { label: "Large", value: "17px" },
  { label: "X-Large", value: "19px" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  subject: Subject | "all";
}

export function BuilderExportWizard({ open, onOpenChange, subject }: Props) {
  const draft = useBuilderStore((s) => s.draft);
  const settings = draft.settings;
  const setSettings = useBuilderStore((s) => s.setSettings);
  const [stepIdx, setStepIdx] = useState(0);
  const [sameTab, setSameTab] = useState(false);

  const step = STEPS[stepIdx];
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === STEPS.length - 1;

  const marks = totalMarks(draft.items);
  const qCount = draft.items.filter((i) => i.kind === "question").length;

  const reset = () => setStepIdx(0);

  const handleExport = () => {
    if (qCount === 0) {
      toast.error("Add at least one question before exporting.");
      return;
    }
    const id = savePayload(draft, "student");
    const subj = subject === "all" ? "all" : subject;
    const url = `/smart-solve-${subj}/exam-preview?id=${encodeURIComponent(id)}`;
    if (sameTab) {
      window.location.assign(url);
    } else {
      window.open(url, "_blank", "noopener");
      toast.success("Exam preview opened in a new tab");
    }
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <BuilderDialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Export wizard</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-2">
            {STEPS.map((s, i) => (
              <button
                key={s.key}
                onClick={() => setStepIdx(i)}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border-2 transition",
                  i === stepIdx
                    ? "bg-primary text-primary-foreground border-primary"
                    : i < stepIdx
                      ? "bg-primary/10 text-primary border-primary/40"
                      : "bg-card border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                <span
                  className={cn(
                    "w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px]",
                    i === stepIdx
                      ? "bg-primary-foreground text-primary"
                      : i < stepIdx
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted",
                  )}
                >
                  {i < stepIdx ? <LuCheck size={10} /> : i + 1}
                </span>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.key}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
              className="space-y-4 pt-2"
            >
              {step.key === "general" && (
                <>
                  <div>
                    <Label>Exam title</Label>
                    <Input
                      value={settings.title}
                      onChange={(e) => setSettings({ title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Document type</Label>
                    <div className="flex gap-2 mt-1">
                      {(["exam", "worksheet", "homework"] as const).map((t) => (
                        <Button
                          key={t}
                          variant={settings.docType === t ? "default" : "outline"}
                          onClick={() => setSettings({ docType: t })}
                          className="capitalize"
                        >
                          {t}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>School name</Label>
                      <Input
                        value={settings.schoolName}
                        onChange={(e) => setSettings({ schoolName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Teacher name</Label>
                      <Input
                        value={settings.teacherName}
                        onChange={(e) => setSettings({ teacherName: e.target.value })}
                      />
                    </div>
                  </div>
                  <LogoUploader
                    value={settings.schoolLogo}
                    onChange={(v) => setSettings({ schoolLogo: v })}
                  />
                  <div>
                    <Label>Questions per page</Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={settings.questionsPerPage}
                      onChange={(e) =>
                        setSettings({
                          questionsPerPage: Math.max(1, Number(e.target.value || 1)),
                        })
                      }
                    />
                  </div>
                </>
              )}

              {step.key === "student" && (
                <div className="space-y-3">
                  {(
                    [
                      ["askName", "Ask for student name"],
                      ["askCenter", "Ask for center number"],
                      ["askSignature", "Ask for signature"],
                      ["askDate", "Ask for date"],
                    ] as const
                  ).map(([key, label]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <Label className="cursor-pointer">{label}</Label>
                      <Switch
                        checked={settings.studentFields[key]}
                        onCheckedChange={(v) =>
                          setSettings({
                            studentFields: { ...settings.studentFields, [key]: v },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              )}

              {step.key === "content" && (
                <div className="space-y-4">
                  <div>
                    <Label>Exam introduction</Label>
                    <RichTextEditor
                      value={resolveRichOrLegacy(settings.introRich, settings.intro) ?? []}
                      onChange={(next) => setSettings({ introRich: next, intro: "" })}
                      placeholder="Welcome message, context, etc."
                    />
                  </div>
                  <div>
                    <Label>Exam instructions</Label>
                    <RichTextEditor
                      value={
                        resolveRichOrLegacy(settings.instructionsRich, settings.instructions) ?? []
                      }
                      onChange={(next) => setSettings({ instructionsRich: next, instructions: "" })}
                      placeholder="Read carefully, write clearly, etc."
                    />
                  </div>
                </div>
              )}

              {step.key === "styles" && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSettings({ styles: makeDefaultSettings().styles })}
                    >
                      <LuRotateCcw className="mr-1.5" size={14} /> Reset
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <ColorPicker
                      label="Background color"
                      value={settings.styles.bgColor}
                      onChange={(v) => setSettings({ styles: { ...settings.styles, bgColor: v } })}
                    />
                    <ColorPicker
                      label="Text color"
                      value={settings.styles.textColor}
                      onChange={(v) =>
                        setSettings({ styles: { ...settings.styles, textColor: v } })
                      }
                    />
                  </div>
                  <div>
                    <Label>Font family</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {FONT_FAMILIES.map((f) => (
                        <Button
                          key={f.label}
                          variant={settings.styles.fontFamily === f.value ? "default" : "outline"}
                          size="sm"
                          onClick={() =>
                            setSettings({
                              styles: { ...settings.styles, fontFamily: f.value },
                            })
                          }
                        >
                          {f.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Font size</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {FONT_SIZES.map((f) => (
                        <Button
                          key={f.label}
                          variant={settings.styles.fontSize === f.value ? "default" : "outline"}
                          size="sm"
                          onClick={() =>
                            setSettings({
                              styles: { ...settings.styles, fontSize: f.value },
                            })
                          }
                        >
                          {f.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step.key === "grading" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <Label>Show "overall mark" at top</Label>
                    <Switch
                      checked={settings.overallMark.enabled}
                      onCheckedChange={(v) =>
                        setSettings({
                          overallMark: { ...settings.overallMark, enabled: v },
                        })
                      }
                    />
                  </div>
                  {settings.overallMark.enabled && (
                    <div>
                      <Label>Total marks</Label>
                      <Input
                        type="number"
                        min={1}
                        value={settings.overallMark.total}
                        onChange={(e) =>
                          setSettings({
                            overallMark: {
                              ...settings.overallMark,
                              total: Math.max(1, Number(e.target.value || 1)),
                            },
                          })
                        }
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <Label>Feedback scale</Label>
                    <Switch
                      checked={settings.feedbackScale.enabled}
                      onCheckedChange={(v) =>
                        setSettings({
                          feedbackScale: { ...settings.feedbackScale, enabled: v },
                        })
                      }
                    />
                  </div>
                  {settings.feedbackScale.enabled && (
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs">Presets</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {FEEDBACK_PRESETS.map((p) => {
                            const active =
                              settings.feedbackScale.labels.length === p.labels.length &&
                              settings.feedbackScale.labels.every((l, i) => l === p.labels[i]);
                            return (
                              <Button
                                key={p.name}
                                size="sm"
                                variant={active ? "default" : "outline"}
                                onClick={() =>
                                  setSettings({
                                    feedbackScale: {
                                      ...settings.feedbackScale,
                                      labels: [...p.labels],
                                    },
                                  })
                                }
                              >
                                {p.name}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                      <Label className="text-xs">Labels (lowest → highest)</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {settings.feedbackScale.labels.map((l, i) => (
                          <div key={i} className="flex gap-1">
                            <Input
                              value={l}
                              onChange={(e) => {
                                const next = [...settings.feedbackScale.labels];
                                next[i] = e.target.value;
                                setSettings({
                                  feedbackScale: {
                                    ...settings.feedbackScale,
                                    labels: next,
                                  },
                                });
                              }}
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                const next = settings.feedbackScale.labels.filter(
                                  (_, idx) => idx !== i,
                                );
                                if (next.length < 1) return;
                                setSettings({
                                  feedbackScale: {
                                    ...settings.feedbackScale,
                                    labels: next,
                                  },
                                });
                              }}
                              aria-label="Remove label"
                            >
                              <LuX size={14} />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setSettings({
                              feedbackScale: {
                                ...settings.feedbackScale,
                                labels: [
                                  ...settings.feedbackScale.labels,
                                  `Tier ${settings.feedbackScale.labels.length + 1}`,
                                ],
                              },
                            })
                          }
                        >
                          + Add label
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setSettings({
                              feedbackScale: {
                                ...settings.feedbackScale,
                                labels: [...DEFAULT_FEEDBACK_LABELS],
                              },
                            })
                          }
                        >
                          <LuRotateCcw className="mr-1.5" size={12} /> Reset
                        </Button>
                      </div>
                    </div>
                  )}
                  <div>
                    <Label>Submission deadline</Label>
                    <Input
                      type="datetime-local"
                      value={settings.deadline ?? ""}
                      onChange={(e) => setSettings({ deadline: e.target.value || null })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <Label>Allow submission after deadline</Label>
                    <Switch
                      checked={settings.allowAfterDeadline}
                      onCheckedChange={(v) => setSettings({ allowAfterDeadline: v })}
                    />
                  </div>
                  {settings.allowAfterDeadline && (
                    <div>
                      <Label>Late penalty (marks)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={settings.latePenalty}
                        onChange={(e) =>
                          setSettings({
                            latePenalty: Math.max(0, Number(e.target.value || 0)),
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              )}

              {step.key === "review" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border-2 border-border p-4 bg-card">
                    <div className="text-xs font-bold uppercase tracking-widest text-primary">
                      Ready to export
                    </div>
                    <h3 className="text-2xl font-bold mt-1">{settings.title}</h3>
                    <p className="text-sm text-muted-foreground capitalize">
                      {settings.docType} · {qCount} question
                      {qCount === 1 ? "" : "s"} · {marks} mark{marks === 1 ? "" : "s"}
                    </p>
                  </div>
                  <ul className="grid grid-cols-2 gap-2 text-sm">
                    <SummaryItem label="School" value={settings.schoolName || "—"} />
                    <SummaryItem label="Teacher" value={settings.teacherName || "—"} />
                    <SummaryItem
                      label="Questions / page"
                      value={String(settings.questionsPerPage)}
                    />
                    <SummaryItem
                      label="Deadline"
                      value={
                        settings.deadline ? new Date(settings.deadline).toLocaleString() : "None"
                      }
                    />
                    <SummaryItem
                      label="Late submissions"
                      value={
                        !settings.deadline
                          ? "N/A"
                          : settings.allowAfterDeadline
                            ? settings.latePenalty > 0
                              ? `Allowed (−${settings.latePenalty} marks)`
                              : "Allowed (no penalty)"
                            : "Not allowed"
                      }
                    />
                    <SummaryItem
                      label="Overall mark"
                      value={
                        settings.overallMark.enabled ? `/${settings.overallMark.total}` : "Off"
                      }
                    />
                    <SummaryItem
                      label="Feedback scale"
                      value={
                        settings.feedbackScale.enabled
                          ? `${settings.feedbackScale.labels.length} tiers`
                          : "Off"
                      }
                    />
                    <SummaryItem
                      label="Student fields"
                      value={
                        Object.entries(settings.studentFields)
                          .filter(([, v]) => v)
                          .map(([k]) => k.replace(/^ask/, ""))
                          .join(", ") || "None"
                      }
                    />
                    <SummaryItem
                      label="Intro / instructions"
                      value={
                        [
                          settings.intro || (settings.introRich && settings.introRich.length)
                            ? "intro"
                            : null,
                          settings.instructions ||
                          (settings.instructionsRich && settings.instructionsRich.length)
                            ? "instructions"
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" + ") || "None"
                      }
                    />
                    <SummaryItem
                      label="Styles"
                      value={
                        [
                          settings.styles.bgColor && "bg",
                          settings.styles.textColor && "text",
                          settings.styles.fontFamily && "font",
                          settings.styles.fontSize && "size",
                        ]
                          .filter(Boolean)
                          .join(", ") || "Default"
                      }
                    />
                  </ul>
                  <div className="flex items-center justify-between p-3 rounded-xl border-2 border-border bg-card">
                    <div>
                      <Label className="cursor-pointer">Preview in same tab</Label>
                      <p className="text-[11px] text-muted-foreground">
                        Off = open preview in a new tab (default).
                      </p>
                    </div>
                    <Switch checked={sameTab} onCheckedChange={setSameTab} />
                  </div>
                  <Button
                    size="lg"
                    className="w-full h-14 text-base font-bold"
                    onClick={handleExport}
                  >
                    <LuDownload className="mr-2" size={18} />
                    {sameTab ? "Export & open here" : "Export & open preview"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    {sameTab
                      ? "Replaces this tab with the printable preview."
                      : "Opens a printable preview in a new tab. You can share or download from there."}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer nav */}
        <div className="border-t border-border px-6 py-3 flex items-center justify-between bg-card/40">
          <Button
            variant="outline"
            onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
            disabled={isFirst}
          >
            <LuArrowLeft className="mr-1.5" size={14} /> Back
          </Button>
          <div className="text-xs text-muted-foreground">
            Step {stepIdx + 1} of {STEPS.length}
          </div>
          {!isLast ? (
            <Button onClick={() => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1))}>
              Next <LuArrowRight className="ml-1.5" size={14} />
            </Button>
          ) : (
            <Button onClick={handleExport} className="font-bold">
              <LuDownload className="mr-1.5" size={14} /> Export
            </Button>
          )}
        </div>
      </BuilderDialogContent>
    </Dialog>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <li className="rounded-lg border border-border/60 p-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
        {label}
      </div>
      <div className="font-bold truncate">{value}</div>
    </li>
  );
}

function LogoUploader({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => onChange(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  };
  return (
    <div>
      <Label>School logo (optional)</Label>
      <div className="flex items-center gap-3 mt-1">
        {value ? (
          <div className="relative">
            <img
              src={value}
              alt="School logo"
              className="h-14 w-14 object-contain rounded-lg border bg-card p-1"
            />
            <button
              onClick={() => onChange(null)}
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground inline-flex items-center justify-center"
              aria-label="Remove logo"
            >
              <LuX size={12} />
            </button>
          </div>
        ) : null}
        <label className="inline-flex items-center gap-2 px-3 h-10 rounded-lg border border-input cursor-pointer hover:bg-accent text-sm">
          <LuUpload size={14} />
          {value ? "Replace" : "Upload"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
        </label>
      </div>
    </div>
  );
}

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const isDefault = value === null;
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2 mt-1">
        <input
          type="color"
          value={value && value.startsWith("#") ? value : "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 rounded border border-input cursor-pointer"
        />
        <Button
          variant={isDefault ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(null)}
        >
          Default
        </Button>
      </div>
    </div>
  );
}
