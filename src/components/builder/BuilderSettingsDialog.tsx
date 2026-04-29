import { useState } from "react";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BuilderDialogContent } from "./BuilderDialogShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useBuilderStore } from "./useBuilderStore";
import { LuRotateCcw, LuUpload, LuX } from "react-icons/lu";
import { makeDefaultSettings, DEFAULT_FEEDBACK_LABELS, resolveRichOrLegacy } from "./types";
import { RichTextEditor } from "@/admin/RichTextEditor";

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

export function BuilderSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const settings = useBuilderStore((s) => s.draft.settings);
  const setSettings = useBuilderStore((s) => s.setSettings);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BuilderDialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Builder settings</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="general" className="mt-2">
          <TabsList className="grid grid-cols-5">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="student">Student</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="styles">Styles</TabsTrigger>
            <TabsTrigger value="grading">Grading</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 pt-4">
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
                  setSettings({ questionsPerPage: Math.max(1, Number(e.target.value || 1)) })
                }
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <Label className="cursor-pointer">Show question titles</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  When off, hides per-question headers (subject, paper id, tags) and shows only an
                  inline number.
                </p>
              </div>
              <Switch
                checked={settings.showQuestionHeaders !== false}
                onCheckedChange={(v) => setSettings({ showQuestionHeaders: v })}
              />
            </div>
          </TabsContent>

          <TabsContent value="student" className="space-y-3 pt-4">
            {(
              [
                ["askName", "Ask for student name"],
                ["askCenter", "Ask for center number"],
                ["askSignature", "Ask for signature"],
                ["askDate", "Ask for date"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-lg border">
                <Label className="cursor-pointer">{label}</Label>
                <Switch
                  checked={settings.studentFields[key]}
                  onCheckedChange={(v) =>
                    setSettings({ studentFields: { ...settings.studentFields, [key]: v } })
                  }
                />
              </div>
            ))}
          </TabsContent>

          <TabsContent value="content" className="space-y-4 pt-4">
            <div>
              <Label>Exam introduction</Label>
              <RichTextEditor
                value={resolveRichOrLegacy(settings.introRich, settings.intro) ?? []}
                onChange={(next) => setSettings({ introRich: next, intro: "" })}
                placeholder="Welcome message, context, etc."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Rich formatting supported — bold, lists, headings, math.
              </p>
            </div>
            <div>
              <Label>Exam instructions</Label>
              <RichTextEditor
                value={resolveRichOrLegacy(settings.instructionsRich, settings.instructions) ?? []}
                onChange={(next) => setSettings({ instructionsRich: next, instructions: "" })}
                placeholder="Read carefully, write clearly, etc."
              />
            </div>
          </TabsContent>

          <TabsContent value="styles" className="space-y-4 pt-4">
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSettings({ styles: makeDefaultSettings().styles })}
              >
                <LuRotateCcw className="mr-1.5" size={14} /> Reset to defaults
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
                onChange={(v) => setSettings({ styles: { ...settings.styles, textColor: v } })}
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
                      setSettings({ styles: { ...settings.styles, fontFamily: f.value } })
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
                      setSettings({ styles: { ...settings.styles, fontSize: f.value } })
                    }
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="grading" className="space-y-4 pt-4">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <Label>Show "overall mark" at top</Label>
              <Switch
                checked={settings.overallMark.enabled}
                onCheckedChange={(v) =>
                  setSettings({ overallMark: { ...settings.overallMark, enabled: v } })
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
                  setSettings({ feedbackScale: { ...settings.feedbackScale, enabled: v } })
                }
              />
            </div>
            {settings.feedbackScale.enabled && (
              <div className="grid grid-cols-2 gap-2">
                {settings.feedbackScale.labels.map((l, i) => (
                  <Input
                    key={i}
                    value={l}
                    onChange={(e) => {
                      const next = [...settings.feedbackScale.labels];
                      next[i] = e.target.value;
                      setSettings({
                        feedbackScale: { ...settings.feedbackScale, labels: next },
                      });
                    }}
                  />
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="col-span-2"
                  onClick={() =>
                    setSettings({
                      feedbackScale: {
                        ...settings.feedbackScale,
                        labels: [...DEFAULT_FEEDBACK_LABELS],
                      },
                    })
                  }
                >
                  Reset labels
                </Button>
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
                    setSettings({ latePenalty: Math.max(0, Number(e.target.value || 0)) })
                  }
                />
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-3 border-t border-border mt-3">
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </BuilderDialogContent>
    </Dialog>
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
