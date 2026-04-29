// Custom difficulty slider per subject. The icon's face changes from happy to
// sad as difficulty increases, and the slider track color shifts.
//
// NOT emoji — pure SVG face icon we draw inline.

import { motion } from "framer-motion";
import * as Slider from "@radix-ui/react-slider";

interface Props {
  value: number;
  onChange: (v: number) => void;
  label: string;
}

function colorFor(v: number): string {
  // hsl interpolation from green (140) -> yellow (48) -> red (0)
  if (v < 50) {
    const t = v / 50;
    const h = 140 - 92 * t;
    return `hsl(${h} 70% 50%)`;
  }
  const t = (v - 50) / 50;
  const h = 48 - 48 * t;
  return `hsl(${h} 80% 55%)`;
}

function FaceIcon({ value, color }: { value: number; color: string }) {
  // Mouth curve: happy (cy=15, cp=20) -> neutral (line) -> sad (cy=20, cp=15)
  // We animate the mouth path d.
  const t = value / 100;
  // mouth control point Y
  const mouthCp = 22 - 12 * t; // 22 -> 10
  const mouthY = 16 + 2 * t; // 16 -> 18
  const path = `M 9 ${mouthY} Q 14 ${mouthCp} 19 ${mouthY}`;
  // Eye Y shifts up slightly as it gets sadder (worry brow)
  const eyeY = 11 + 0.5 * t;
  return (
    <motion.svg
      width="32"
      height="32"
      viewBox="0 0 28 28"
      animate={{ rotate: value > 75 ? -10 : value > 50 ? 0 : 8 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
    >
      <circle cx="14" cy="14" r="12" fill={color} />
      <circle cx="10" cy={eyeY} r="1.4" fill="white" />
      <circle cx="18" cy={eyeY} r="1.4" fill="white" />
      <motion.path d={path} stroke="white" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </motion.svg>
  );
}

export default function DifficultySlider({ value, onChange, label }: Props) {
  const color = colorFor(value);
  const labelText =
    value < 20
      ? "Piece of cake"
      : value < 40
        ? "Easy"
        : value < 60
          ? "Manageable"
          : value < 80
            ? "Tough"
            : "Brutal";

  return (
    <div className="space-y-2 p-3 rounded-2xl border-2 border-border bg-card">
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm">{label}</span>
        <span className="text-xs font-semibold" style={{ color }}>
          {labelText}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <FaceIcon value={value} color={color} />
        <Slider.Root
          className="relative flex items-center select-none touch-none w-full h-6"
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          min={0}
          max={100}
          step={1}
        >
          <Slider.Track className="bg-muted relative grow rounded-full h-2 overflow-hidden">
            <Slider.Range
              className="absolute h-full rounded-full transition-colors"
              style={{ background: color }}
            />
          </Slider.Track>
          <Slider.Thumb
            className="block w-5 h-5 rounded-full border-2 border-card shadow-md focus:outline-none focus:ring-2 focus:ring-ring transition-transform hover:scale-110"
            style={{ background: color }}
            aria-label={label}
          />
        </Slider.Root>
      </div>
    </div>
  );
}
