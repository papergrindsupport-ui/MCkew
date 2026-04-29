// Flair manager: pick presets, build custom (label + icon + color), max 5.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Lucide from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Plus, X, Sparkles, Wand2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PRESET_FLAIRS } from "@/data/referenceData";
import type { Flair } from "@/data/profileTypes";

const COLORS: Flair["color"][] = ["pink", "blue", "green", "yellow", "purple", "primary"];
const ICON_CHOICES = [
  "Star",
  "Sparkles",
  "Trophy",
  "Flame",
  "Zap",
  "Heart",
  "Leaf",
  "Atom",
  "FlaskConical",
  "Sunrise",
  "Moon",
  "BookOpen",
  "Coffee",
  "Rocket",
  "Crown",
  "Award",
  "Target",
  "GraduationCap",
  "HeartHandshake",
  "Lightbulb",
];

export function FlairChip({ flair, onRemove }: { flair: Flair; onRemove?: () => void }) {
  const Icon = (Lucide[flair.icon as keyof typeof Lucide] as LucideIcon) ?? Lucide.Star;
  return (
    <motion.span
      layout
      initial={{ scale: 0.7, opacity: 0, rotate: -8 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      exit={{ scale: 0.5, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border-2 bg-card-${flair.color} border-border text-foreground`}
    >
      <Icon size={12} />
      {flair.label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-foreground/10 hover:bg-destructive hover:text-destructive-foreground"
          aria-label="Remove flair"
        >
          <X size={10} />
        </button>
      )}
    </motion.span>
  );
}

interface Props {
  value: Flair[];
  onChange: (next: Flair[]) => void;
}

export default function FlairBuilder({ value, onChange }: Props) {
  const [customOpen, setCustomOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState<string>("Star");
  const [color, setColor] = useState<Flair["color"]>("primary");

  const max = 5;
  const atMax = value.length >= max;

  function addPreset(p: (typeof PRESET_FLAIRS)[number]) {
    if (atMax) return;
    if (value.some((v) => v.label === p.label)) return;
    onChange([...value, { id: crypto.randomUUID(), ...p }]);
  }

  function addCustom() {
    if (!label.trim() || atMax) return;
    onChange([
      ...value,
      { id: crypto.randomUUID(), label: label.trim().slice(0, 22), icon, color },
    ]);
    setLabel("");
    setIcon("Star");
    setColor("primary");
    setCustomOpen(false);
  }

  function remove(id: string) {
    onChange(value.filter((v) => v.id !== id));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-muted-foreground">
          {value.length} / {max} flairs
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 min-h-9 p-2 rounded-2xl border-2 border-dashed border-border bg-muted/30">
        <AnimatePresence initial={false}>
          {value.map((f) => (
            <FlairChip key={f.id} flair={f} onRemove={() => remove(f.id)} />
          ))}
        </AnimatePresence>
        {value.length === 0 && (
          <span className="text-xs text-muted-foreground italic px-1">
            No flairs yet — pick or create one.
          </span>
        )}
      </div>

      <div>
        <p className="text-xs font-bold text-muted-foreground mb-1.5 flex items-center gap-1">
          <Sparkles size={12} /> Suggested
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_FLAIRS.map((p) => {
            const used = value.some((v) => v.label === p.label);
            const Icon = (Lucide[p.icon as keyof typeof Lucide] as LucideIcon) ?? Lucide.Star;
            return (
              <motion.button
                key={p.label}
                type="button"
                whileTap={{ scale: 0.92 }}
                whileHover={{ y: -2 }}
                disabled={used || atMax}
                onClick={() => addPreset(p)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border-2 border-border bg-card-${p.color} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <Icon size={12} />
                {p.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      <Popover open={customOpen} onOpenChange={setCustomOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={atMax}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-40"
          >
            <Wand2 size={12} /> Build custom flair
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3 space-y-3" align="start">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Flair label"
            maxLength={22}
            className="h-9 text-sm"
            autoFocus
          />
          <div>
            <div className="text-xs font-bold text-muted-foreground mb-1.5">Color</div>
            <div className="flex flex-wrap gap-1.5">
              {COLORS.map((c) => (
                <motion.button
                  key={c}
                  type="button"
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full border-2 ${color === c ? "border-foreground" : "border-border"} bg-card-${c}`}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-muted-foreground mb-1.5">Icon</div>
            <div className="grid grid-cols-7 gap-1 max-h-32 overflow-auto">
              {ICON_CHOICES.map((name) => {
                const Icon = (Lucide[name as keyof typeof Lucide] as LucideIcon) ?? Lucide.Star;
                return (
                  <motion.button
                    key={name}
                    type="button"
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setIcon(name)}
                    className={`h-8 w-8 inline-flex items-center justify-center rounded-md border-2 ${
                      icon === name
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    }`}
                    aria-label={name}
                  >
                    <Icon size={14} />
                  </motion.button>
                );
              })}
            </div>
          </div>
          <div className="pt-1">
            <div className="text-xs font-bold text-muted-foreground mb-1.5">Preview</div>
            <FlairChip flair={{ id: "preview", label: label || "Your flair", icon, color }} />
          </div>
          <button
            type="button"
            onClick={addCustom}
            disabled={!label.trim()}
            className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus size={14} /> Add flair
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
