import { motion } from "framer-motion";
import { Pencil, Brain, Sparkles, Play } from "@/lib/icons";
import { useVibeStore } from "@/stores/useVibeStore";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { IceCream } from "react-kawaii";
import { useOnboardingStore } from "@/components/onboarding/useOnboardingStore";
import { useDailyGoalsStore } from "@/stores/useDailyGoalsStore";
import { useEffect, useState } from "react";

export default function HeroSection() {
  const vibe = useVibeStore((s) => s.vibe);
  const isBoring = vibe === "boring";
  const openWizard = useOnboardingStore((s) => s.openWizard);
  const onboarded = useDailyGoalsStore((s) => s.onboarded);

  /* ==============================
     ONLY NEW CODE (FUN WORD EFFECT)
  ============================== */
  const words = ["fun", "smart", "digital", "gamified", "interactive", "adaptive"];

  const [index, setIndex] = useState(0);
  const [text, setText] = useState(words[0]);

  // rotate word
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  // typewriter effect
  useEffect(() => {
    let i = 0;
    setText("");

    const interval = setInterval(() => {
      i++;
      setText(words[index].slice(0, i));

      if (i >= words[index].length) clearInterval(interval);
    }, 80);

    return () => clearInterval(interval);
  }, [index]);
  /* ============================== */

  return (
    <section className="relative flex flex-col items-center text-center py-10 sm:py-16 md:py-20 px-4 overflow-hidden">
      <motion.div
        className="px-4 sm:px-6 py-2 rounded-full bg-card-yellow border-[2.5px] border-border font-semibold text-foreground mb-6 sm:mb-8 flex items-center gap-2 text-sm sm:text-base"
        initial={{ opacity: 0, y: 30, rotate: isBoring ? 0 : -5 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ delay: 0.2, type: isBoring ? "tween" : "spring", stiffness: 200 }}
        whileHover={isBoring ? undefined : { scale: 1.08, rotate: -3 }}
      >
        <Brain size={18} />
        50% discount today!
      </motion.div>

      <motion.h1
        className="text-3xl sm:text-5xl md:text-6xl lg:text-8xl font-bold text-primary mb-4 sm:mb-6 leading-tight"
        initial={{ opacity: 0, scale: isBoring ? 1 : 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, type: isBoring ? "tween" : "spring", stiffness: 150 }}
      >
        <span>
          Paper-2 made{" "}
          <span className="inline-block bg-card-yellow px-3 sm:px-4 py-0.5 sm:py-1 border-[2.5px] border-border rounded-xl">
            {text}
            <span className="animate-pulse ml-1">|</span>
          </span>
        </span>
      </motion.h1>

      <motion.p
        className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-xl mb-8 sm:mb-10 px-2"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: isBoring ? 0.2 : 0.4 }}
      >
        MCkew turns IGCSE Biology, Chemistry & Physics past papers into a gamified challenge.
        Students solve, teachers mark — all digitally, all fun.
      </motion.p>

      <motion.div
        className="flex gap-3 sm:gap-4 flex-wrap justify-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, type: isBoring ? "tween" : "spring" }}
      >
        {!onboarded ? (
          <motion.button
            type="button"
            onClick={() => openWizard()}
            className="px-5 sm:px-8 py-3 sm:py-3.5 rounded-full bg-primary text-primary-foreground font-bold text-sm sm:text-base border-[3px] border-border flex items-center gap-2"
            style={isBoring ? undefined : { boxShadow: "4px 4px 0px hsl(var(--border))" }}
            whileHover={
              isBoring
                ? { opacity: 0.9 }
                : { scale: 1.08, y: -4, boxShadow: "6px 8px 0px hsl(var(--border))" }
            }
            whileTap={
              isBoring
                ? undefined
                : { scale: 0.97, y: 2, boxShadow: "1px 1px 0px hsl(var(--border))" }
            }
            transition={{ type: isBoring ? "tween" : "spring", stiffness: 400 }}
          >
            Start Solving Free
            <Pencil size={18} />
          </motion.button>
        ) : (
          <Link to="/smart-solve-all" preload={false} className="inline-flex">
            <motion.span
              className={cn(
                "px-5 sm:px-8 py-3 sm:py-3.5 rounded-full bg-primary text-primary-foreground font-bold text-sm sm:text-base border-[3px] border-border inline-flex items-center gap-2 cursor-pointer",
              )}
              style={isBoring ? undefined : { boxShadow: "4px 4px 0px hsl(var(--border))" }}
              whileHover={
                isBoring
                  ? { opacity: 0.9 }
                  : { scale: 1.08, y: -4, boxShadow: "6px 8px 0px hsl(var(--border))" }
              }
              whileTap={
                isBoring
                  ? undefined
                  : { scale: 0.97, y: 2, boxShadow: "1px 1px 0px hsl(var(--border))" }
              }
              transition={{ type: isBoring ? "tween" : "spring", stiffness: 400 }}
            >
              Start Solving Free
              <Pencil size={18} />
            </motion.span>
          </Link>
        )}

        <Link to="/smart-solve-papers" preload={false}>
          <motion.button
            className="px-5 sm:px-8 py-3 sm:py-3.5 rounded-full bg-card text-foreground font-bold text-sm sm:text-base border-[3px] border-border flex items-center gap-2"
            style={isBoring ? undefined : { boxShadow: "4px 4px 0px hsl(var(--border))" }}
            whileHover={
              isBoring
                ? { opacity: 0.9 }
                : { scale: 1.08, y: -4, boxShadow: "6px 8px 0px hsl(var(--border))" }
            }
            whileTap={
              isBoring
                ? undefined
                : { scale: 0.97, y: 2, boxShadow: "1px 1px 0px hsl(var(--border))" }
            }
            transition={{ type: isBoring ? "tween" : "spring", stiffness: 400 }}
          >
            Past Papers
            <Play size={18} fill="currentColor" />
          </motion.button>
        </Link>
      </motion.div>

      {!isBoring && (
        <>
          <div className="relative w-full max-w-2xl h-8 mt-6 hidden sm:block">
            <div className="absolute left-[10%] text-primary/30 animate-float-y">
              <Sparkles size={24} />
            </div>
            <div
              className="absolute right-[10%] text-primary/30 animate-float-y"
              style={{ animationDelay: "1s" }}
            >
              <Pencil size={22} />
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10 hidden md:block">
            <div className="absolute top-[15%] left-[8%] text-card-purple animate-drift opacity-60">
              <Sparkles size={28} />
            </div>
            <div
              className="absolute bottom-[20%] left-[15%] text-card-yellow animate-drift opacity-70"
              style={{ animationDelay: "2.8s" }}
            >
              <Pencil size={26} />
            </div>
            <div
              className="absolute bottom-[10%] right-[8%] text-card-green animate-drift opacity-60"
              style={{ animationDelay: "0.8s" }}
            >
              <Sparkles size={22} />
            </div>
            <div
              className="absolute top-[18%] left-[8%]"
              style={{ animationDelay: "2.2s" }}
              aria-hidden
            >
              <IceCream size={56} mood="blissful" color="#FDA7DC" />
            </div>
          </div>
        </>
      )}
    </section>
  );
}
