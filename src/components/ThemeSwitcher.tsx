import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Sun, Moon, Check, Meh, Flame } from "@/lib/icons";
import { useVibeStore } from "@/stores/useVibeStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { fireThemeReaction } from "@/lib/gifReactionEngine";

export const COLOR_THEMES = [
  { name: "Peach", hue: 345, bg: "14 100% 95%", bgDark: "0 0% 3%" },
  { name: "Lavender", hue: 270, bg: "270 50% 95%", bgDark: "270 15% 4%" },
  { name: "Mint", hue: 160, bg: "160 45% 94%", bgDark: "160 15% 4%" },
  { name: "Sky", hue: 200, bg: "200 55% 95%", bgDark: "200 15% 4%" },
  { name: "Honey", hue: 40, bg: "40 65% 94%", bgDark: "40 15% 4%" },
  { name: "Rose", hue: 0, bg: "0 55% 95%", bgDark: "0 12% 4%" },
];

function applyFunTheme(hue: number, bgLight: string, bgDark: string, isDark: boolean) {
  const r = document.documentElement;
  r.style.setProperty("--primary", `${hue} 72% ${isDark ? 58 : 65}%`);
  r.style.setProperty("--ring", `${hue} 72% ${isDark ? 58 : 65}%`);
  r.style.setProperty("--secondary", `${hue} ${isDark ? 30 : 55}% ${isDark ? 15 : 88}%`);
  r.style.setProperty("--accent", `${hue} ${isDark ? 35 : 55}% ${isDark ? 18 : 83}%`);
  r.style.setProperty("--muted", isDark ? "0 0% 12%" : `${hue} 25% 91%`);
  r.style.setProperty("--input", isDark ? "0 0% 15%" : `${hue} 25% 88%`);
  r.style.setProperty("--background", isDark ? bgDark : bgLight);
  r.style.setProperty("--card", isDark ? "0 0% 8%" : "0 0% 100%");
  r.style.setProperty("--border", isDark ? "0 0% 30%" : "20 30% 22%");
  r.style.setProperty("--card-pink", `${hue} ${isDark ? 35 : 65}% ${isDark ? 15 : 87}%`);
  r.style.setProperty(
    "--card-blue",
    `${(hue + 120) % 360} ${isDark ? 35 : 65}% ${isDark ? 15 : 87}%`,
  );
  r.style.setProperty(
    "--card-green",
    `${(hue + 180) % 360} ${isDark ? 30 : 55}% ${isDark ? 14 : 87}%`,
  );
  r.style.setProperty(
    "--card-yellow",
    `${(hue + 60) % 360} ${isDark ? 35 : 80}% ${isDark ? 14 : 85}%`,
  );
  r.style.setProperty(
    "--card-purple",
    `${(hue + 240) % 360} ${isDark ? 30 : 55}% ${isDark ? 16 : 88}%`,
  );
}

function applyProTheme(hue: number, isDark: boolean) {
  const r = document.documentElement;
  // Clear inline overrides so the .vibe-boring CSS rules take over for surfaces.
  [
    "--secondary",
    "--accent",
    "--muted",
    "--input",
    "--background",
    "--card",
    "--border",
    "--card-pink",
    "--card-blue",
    "--card-green",
    "--card-yellow",
    "--card-purple",
  ].forEach((p) => r.style.removeProperty(p));
  r.style.setProperty("--primary", `${hue} 72% ${isDark ? 58 : 65}%`);
  r.style.setProperty("--ring", `${hue} 72% ${isDark ? 58 : 65}%`);
}

export function useTheme() {
  const [open, setOpen] = useState(false);
  const { themeIndex, isDark, setThemeIndex, setIsDark } = useThemeStore();
  const vibe = useVibeStore((s) => s.vibe);

  useEffect(() => {
    const t = COLOR_THEMES[themeIndex];
    if (!t) return;
    const root = document.documentElement;
    // Briefly enable transitions for theme-change only (scoped via CSS class).
    root.classList.add("theme-transition");
    root.classList.toggle("dark", isDark);
    root.classList.toggle("vibe-boring", vibe === "boring");
    root.classList.toggle("vibe-fire", vibe === "fire");
    if (vibe === "boring") applyProTheme(t.hue, isDark);
    else applyFunTheme(t.hue, t.bg, t.bgDark, isDark);
    const to = window.setTimeout(() => root.classList.remove("theme-transition"), 600);
    return () => window.clearTimeout(to);
  }, [themeIndex, isDark, vibe]);

  return {
    open,
    setOpen,
    activeTheme: themeIndex,
    setActiveTheme: setThemeIndex,
    isDark,
    setIsDark,
  };
}

export function ColorThemeButton({
  open,
  setOpen,
  activeTheme,
  setActiveTheme,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  activeTheme: number;
  setActiveTheme: (i: number) => void;
}) {
  const current = COLOR_THEMES[activeTheme];
  const vibe = useVibeStore((s) => s.vibe);
  const setVibe = useVibeStore((s) => s.setVibe);
  const isBoring = vibe === "boring";

  return (
    <div className="relative">
      <motion.button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-full border-[2.5px] border-border shadow-sm flex items-center justify-center"
        style={{ background: `hsl(${current.hue}, 72%, 65%)` }}
        whileHover={isBoring ? { scale: 1.05 } : { scale: 1.15, rotate: 15 }}
        whileTap={{ scale: 0.9 }}
        aria-label="Color theme"
      >
        <Palette size={16} className="text-primary-foreground" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.9 }}
            transition={
              isBoring ? { duration: 0.15 } : { type: "spring", stiffness: 500, damping: 30 }
            }
            className="absolute top-full mt-2 right-0 p-2.5 rounded-2xl bg-card border-[2.5px] border-border shadow-xl z-50"
          >
            <div className="flex gap-2">
              {COLOR_THEMES.map((t, i) => (
                <motion.button
                  key={t.name}
                  onClick={() => {
                    setActiveTheme(i);
                    setOpen(false);
                  }}
                  className="w-8 h-8 rounded-full border-2 flex items-center justify-center"
                  style={{
                    background: `hsl(${t.hue}, 72%, 65%)`,
                    borderColor:
                      i === activeTheme ? "hsl(var(--foreground))" : "hsl(var(--border))",
                  }}
                  whileHover={isBoring ? { scale: 1.1 } : { scale: 1.3, rotate: 10 }}
                  whileTap={{ scale: 0.85 }}
                  title={t.name}
                >
                  {i === activeTheme && <Check size={14} className="text-primary-foreground" />}
                </motion.button>
              ))}
            </div>
            <div className="flex gap-2 mt-2 pt-2 border-t border-border">
              <motion.button
                onClick={() => {
                  setVibe("fire");
                  setOpen(false);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium border"
                style={{
                  borderColor: !isBoring ? "hsl(var(--primary))" : "hsl(var(--border))",
                  background: !isBoring ? "hsl(var(--primary) / 0.1)" : "transparent",
                  color: !isBoring ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Flame size={14} /> Fun
              </motion.button>
              <motion.button
                onClick={() => {
                  setVibe("boring");
                  setOpen(false);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-medium border"
                style={{
                  borderColor: isBoring ? "hsl(var(--primary))" : "hsl(var(--border))",
                  background: isBoring ? "hsl(var(--primary) / 0.1)" : "transparent",
                  color: isBoring ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Meh size={14} /> Pro
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DarkModeButton({
  isDark,
  setIsDark,
}: {
  isDark: boolean;
  setIsDark: (v: boolean) => void;
}) {
  const vibe = useVibeStore((s) => s.vibe);
  return (
    <motion.button
      onClick={() => {
        const next = !isDark;
        setIsDark(next);
        fireThemeReaction(next);
      }}
      className="w-10 h-10 rounded-full flex items-center justify-center border-[2.5px] border-border bg-card shadow-sm overflow-hidden"
      whileHover={vibe === "fire" ? { scale: 1.15 } : { scale: 1.05 }}
      whileTap={{ scale: 0.9 }}
      aria-label="Toggle dark mode"
    >
      <AnimatePresence mode="wait">
        {isDark ? (
          <motion.div
            key="sun"
            initial={{ y: 20, opacity: 0, rotate: -90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -20, opacity: 0, rotate: 90 }}
            transition={{ duration: vibe === "fire" ? 0.3 : 0.15 }}
          >
            <Sun size={16} className="text-foreground" />
          </motion.div>
        ) : (
          <motion.div
            key="moon"
            initial={{ y: 20, opacity: 0, rotate: 90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -20, opacity: 0, rotate: -90 }}
            transition={{ duration: vibe === "fire" ? 0.3 : 0.15 }}
          >
            <Moon size={16} className="text-foreground" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
