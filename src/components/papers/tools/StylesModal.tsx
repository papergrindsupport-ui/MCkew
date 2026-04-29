import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToolsStore, DEFAULT_STYLES } from "./useToolsStore";
import { LuRotateCcw } from "react-icons/lu";

const FONT_OPTIONS = [
  { label: "Default", value: "" },
  { label: "Inter", value: "Inter, system-ui, sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", value: "ui-monospace, SFMono-Regular, Menlo, monospace" },
  { label: "Atkinson Hyperlegible", value: "'Atkinson Hyperlegible', sans-serif" },
  { label: "OpenDyslexic", value: "'OpenDyslexic', sans-serif" },
];

export function StylesModal() {
  const open = useToolsStore((s) => s.stylesOpen);
  const setOpen = useToolsStore((s) => s.setStylesOpen);
  const styles = useToolsStore((s) => s.styles);
  const setStyles = useToolsStore((s) => s.setStyles);
  const reset = useToolsStore((s) => s.resetStyles);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="rounded-3xl max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Styles</DialogTitle>
          <DialogDescription>
            Personalize how the page looks. Applies to the entire paper.
          </DialogDescription>
        </DialogHeader>

        <Row label="High contrast">
          <Switch
            checked={styles.highContrast}
            onCheckedChange={(v) => setStyles({ highContrast: v })}
          />
        </Row>
        <Row label="Inverted colors">
          <Switch checked={styles.inverted} onCheckedChange={(v) => setStyles({ inverted: v })} />
        </Row>

        <div className="space-y-2 mt-3">
          <Label className="text-sm font-bold">Font size: {styles.fontSize}px</Label>
          <Slider
            value={[styles.fontSize]}
            min={12}
            max={28}
            step={1}
            onValueChange={([v]) => setStyles({ fontSize: v })}
          />
        </div>

        <div className="space-y-2 mt-3">
          <Label className="text-sm font-bold">Font family</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {FONT_OPTIONS.map((f) => (
              <button
                key={f.value || "default"}
                onClick={() => setStyles({ fontFamily: f.value })}
                className={`px-2 py-1.5 rounded-xl border-2 text-xs font-bold transition ${
                  styles.fontFamily === f.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 hover:border-primary/40"
                }`}
                style={{ fontFamily: f.value || undefined }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <Row label="Font color">
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={styles.fontColor || "#000000"}
              onChange={(e) => setStyles({ fontColor: e.target.value })}
              className="h-8 w-12 p-1 rounded-lg cursor-pointer"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setStyles({ fontColor: "" })}
              className="text-xs"
            >
              Default
            </Button>
          </div>
        </Row>

        <Row label="Background">
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={styles.bgColor || "#ffffff"}
              onChange={(e) => setStyles({ bgColor: e.target.value })}
              className="h-8 w-12 p-1 rounded-lg cursor-pointer"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setStyles({ bgColor: "" })}
              className="text-xs"
            >
              Default
            </Button>
          </div>
        </Row>

        <Button onClick={reset} variant="outline" className="w-full rounded-xl gap-1.5 mt-4">
          <LuRotateCcw size={14} /> Reset all styles
        </Button>
        <p className="text-[10px] text-muted-foreground text-center mt-1">
          Defaults: size {DEFAULT_STYLES.fontSize}px, system font.
        </p>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-border/60 p-3 mt-2">
      <Label className="font-bold text-sm">{label}</Label>
      {children}
    </div>
  );
}
