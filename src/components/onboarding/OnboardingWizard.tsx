import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  Meh,
  Palette,
  Check,
  ArrowRight,
  ArrowLeft,
  Zap,
  User,
  UserPlus,
  SkipForward,
  Sun,
  Moon,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useVibeStore } from "@/stores/useVibeStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { useDailyGoalsStore } from "@/stores/useDailyGoalsStore";
import { useOnboardingStore } from "./useOnboardingStore";
import { COLOR_THEMES } from "@/components/ThemeSwitcher";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import ArcSlider from "./ArcSlider";
import PapersArcSlider from "./PapersArcSlider";

type Step = "vibe" | "goal" | "papers-goal" | "signin";

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { open, closeWizard } = useOnboardingStore();

  const vibe = useVibeStore((s) => s.vibe);
  const setVibe = useVibeStore((s) => s.setVibe);
  const isBoring = vibe === "boring";

  const { themeIndex, isDark, setThemeIndex, setIsDark } = useThemeStore();
  const { questionsGoal, papersGoal, setQuestionsGoal, setPapersGoal, setOnboarded } =
    useDailyGoalsStore();

  const [step, setStep] = useState<Step>("vibe");
  const [goalValue, setGoalValue] = useState(questionsGoal || 10);
  const [papersGoalValue, setPapersGoalValue] = useState(papersGoal || 2);
  const [customGoal, setCustomGoal] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [showCustomPapers, setShowCustomPapers] = useState(false);
  const [customPapersGoal, setCustomPapersGoal] = useState("");

  const finishAndSolve = useCallback(() => {
    setOnboarded(true);
    closeWizard();
    navigate({ to: "/smart-solve-all" });
  }, [setOnboarded, closeWizard, navigate]);

  const skipAll = useCallback(() => {
    setOnboarded(true);
    closeWizard();
    navigate({ to: "/smart-solve-all" });
  }, [setOnboarded, closeWizard, navigate]);

  const nextFromVibe = () => setStep("goal");

  const nextFromGoal = () => {
    const val = showCustom && customGoal ? parseInt(customGoal) || 10 : goalValue;
    setQuestionsGoal(val);
    setStep("papers-goal");
  };

  const nextFromPapersGoal = () => {
    const val =
      showCustomPapers && customPapersGoal ? parseInt(customPapersGoal) || 2 : papersGoalValue;
    setPapersGoal(val);
    setStep("signin");
  };

  const skipPapersGoal = () => setStep("signin");
  const skipGoal = () => setStep("papers-goal");

  const pageVariants = isBoring
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: 60, scale: 0.95 },
        animate: { opacity: 1, x: 0, scale: 1 },
        exit: { opacity: 0, x: -60, scale: 0.95 },
      };

  const stepOrder: Step[] = ["vibe", "goal", "papers-goal", "signin"];
  const currentStepIdx = stepOrder.indexOf(step);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) skipAll();
      }}
    >
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0 border-[2.5px] rounded-3xl"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Progress bar */}
        <div className="px-6 pt-5 pb-0">
          <div className="flex gap-1">
            {stepOrder.map((_, i) => (
              <motion.div
                key={i}
                className="h-1.5 rounded-full flex-1"
                style={{
                  background: i <= currentStepIdx ? "hsl(var(--primary))" : "hsl(var(--muted))",
                }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: i * 0.05, duration: isBoring ? 0.1 : 0.3 }}
              />
            ))}
          </div>
        </div>

        {/* Skip button on non-first steps */}
        {step !== "vibe" && (
          <motion.button
            onClick={skipAll}
            type="button"
            className="absolute top-4 right-12 text-xs font-bold text-muted-foreground hover:text-primary flex items-center gap-1 z-50 cursor-pointer"
            whileHover={isBoring ? undefined : { scale: 1.05 }}
            whileTap={isBoring ? undefined : { scale: 0.95 }}
          >
            <SkipForward size={14} />
            shut up & solve
          </motion.button>
        )}

        <div className="px-6 pb-6 pt-2">
          <AnimatePresence mode="wait">
            {/* ============ STEP 1: VIBE + THEME ============ */}
            {step === "vibe" && (
              <motion.div
                key="vibe"
                {...pageVariants}
                transition={
                  isBoring ? { duration: 0.15 } : { type: "spring", stiffness: 300, damping: 25 }
                }
              >
                <h2 className="text-xl font-bold text-foreground mb-1">Pick your vibe</h2>
                <p className="text-sm text-muted-foreground mb-5">
                  Choose your look, feel, and color
                </p>

                {/* Appearance */}
                <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  {isDark ? <Moon size={16} /> : <Sun size={16} />} Appearance
                </p>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <motion.button
                    type="button"
                    onClick={() => setIsDark(false)}
                    className={`flex items-center justify-center gap-2.5 p-4 rounded-2xl border-[2.5px] transition-colors cursor-pointer ${
                      !isDark
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                    whileHover={isBoring ? undefined : { scale: 1.04 }}
                    whileTap={isBoring ? undefined : { scale: 0.96 }}
                  >
                    <motion.div
                      animate={!isDark ? { rotate: [0, 20, 0], scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    >
                      <Sun size={24} className="text-yellow-500" />
                    </motion.div>
                    <div className="text-left">
                      <span className="font-bold text-foreground text-sm block">Light</span>
                      <span className="text-[10px] text-muted-foreground">Bright & clear</span>
                    </div>
                    {!isDark && <Check size={14} className="text-primary ml-auto" />}
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => setIsDark(true)}
                    className={`flex items-center justify-center gap-2.5 p-4 rounded-2xl border-[2.5px] transition-colors cursor-pointer ${
                      isDark
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                    whileHover={isBoring ? undefined : { scale: 1.04 }}
                    whileTap={isBoring ? undefined : { scale: 0.96 }}
                  >
                    <motion.div
                      animate={isDark ? { rotate: [0, -15, 15, 0], opacity: [1, 0.7, 1] } : {}}
                      transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                    >
                      <Moon size={24} className="text-primary" />
                    </motion.div>
                    <div className="text-left">
                      <span className="font-bold text-foreground text-sm block">Dark</span>
                      <span className="text-[10px] text-muted-foreground">Easy on the eyes</span>
                    </div>
                    {isDark && <Check size={14} className="text-primary ml-auto" />}
                  </motion.button>
                </div>

                {/* Mode */}
                <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Flame size={16} /> Mode
                </p>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <motion.button
                    type="button"
                    onClick={() => setVibe("fire")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-[2.5px] transition-colors cursor-pointer ${
                      vibe === "fire"
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                    whileHover={isBoring ? undefined : { scale: 1.04, rotate: -1 }}
                    whileTap={isBoring ? undefined : { scale: 0.96 }}
                  >
                    <motion.div
                      animate={
                        vibe === "fire" ? { rotate: [0, -10, 10, 0], scale: [1, 1.1, 1] } : {}
                      }
                      transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                    >
                      <Flame size={28} className="text-primary" />
                    </motion.div>
                    <span className="font-bold text-foreground text-sm">Fun Mode</span>
                    <span className="text-[10px] text-muted-foreground">Bouncy & animated</span>
                    {vibe === "fire" && <Check size={14} className="text-primary" />}
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => setVibe("boring")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-[2.5px] transition-colors cursor-pointer ${
                      vibe === "boring"
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Meh size={28} className="text-primary" />
                    <span className="font-bold text-foreground text-sm">Pro Mode</span>
                    <span className="text-[10px] text-muted-foreground">Clean & minimal</span>
                    {vibe === "boring" && <Check size={14} className="text-primary" />}
                  </motion.button>
                </div>

                {/* Color */}
                <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Palette size={16} /> Pick a color
                </p>
                <div className="flex gap-2.5 flex-wrap mb-6">
                  {COLOR_THEMES.map((theme, i) => (
                    <motion.button
                      type="button"
                      key={theme.name}
                      onClick={() => setThemeIndex(i)}
                      className="w-10 h-10 rounded-full border-[2.5px] flex items-center justify-center cursor-pointer"
                      style={{
                        background: `hsl(${theme.hue}, 72%, 65%)`,
                        borderColor:
                          i === themeIndex ? "hsl(var(--foreground))" : "hsl(var(--border))",
                      }}
                      whileHover={isBoring ? { scale: 1.1 } : { scale: 1.25, rotate: 10 }}
                      whileTap={{ scale: 0.9 }}
                      title={theme.name}
                    >
                      {i === themeIndex && <Check size={14} className="text-primary-foreground" />}
                    </motion.button>
                  ))}
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <motion.button
                      type="button"
                      onClick={nextFromVibe}
                      className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 border-[2.5px] border-border cursor-pointer"
                      style={isBoring ? undefined : { boxShadow: "3px 3px 0 hsl(var(--border))" }}
                      whileHover={isBoring ? { opacity: 0.9 } : { scale: 1.03, y: -2 }}
                      whileTap={isBoring ? undefined : { scale: 0.97 }}
                    >
                      Next <ArrowRight size={16} />
                    </motion.button>
                    <button
                      type="button"
                      onClick={nextFromVibe}
                      className="text-xs text-muted-foreground hover:text-primary font-medium cursor-pointer"
                    >
                      change later
                    </button>
                  </div>
                  <motion.button
                    type="button"
                    onClick={skipAll}
                    className="w-full py-3 rounded-2xl bg-card text-foreground font-bold text-sm flex items-center justify-center gap-2 border-[2.5px] border-border cursor-pointer"
                    style={isBoring ? undefined : { boxShadow: "3px 3px 0 hsl(var(--border))" }}
                    whileHover={isBoring ? { opacity: 0.9 } : { scale: 1.03, y: -2 }}
                    whileTap={isBoring ? undefined : { scale: 0.97 }}
                  >
                    <SkipForward size={16} />
                    Shut up & jump to solving
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ============ STEP 2: DAILY GOAL ============ */}
            {step === "goal" && (
              <motion.div
                key="goal"
                {...pageVariants}
                transition={
                  isBoring ? { duration: 0.15 } : { type: "spring", stiffness: 300, damping: 25 }
                }
              >
                <h2 className="text-xl font-bold text-foreground mb-1">Daily question goal</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  How many questions do you want to solve each day?
                </p>

                {!showCustom ? (
                  <>
                    <ArcSlider value={goalValue} onChange={setGoalValue} isBoring={isBoring} />
                    <button
                      type="button"
                      onClick={() => setShowCustom(true)}
                      className="block mx-auto mt-2 text-xs font-medium text-muted-foreground hover:text-primary cursor-pointer"
                    >
                      Custom number...
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={customGoal}
                      onChange={(e) => setCustomGoal(e.target.value)}
                      placeholder="e.g. 15"
                      className="w-24 text-center text-2xl font-bold border-[2.5px] border-border rounded-xl py-2 bg-card text-foreground focus:outline-none focus:border-primary"
                    />
                    <span className="text-xs text-muted-foreground">questions per day</span>
                    <button
                      type="button"
                      onClick={() => setShowCustom(false)}
                      className="text-xs text-primary font-medium cursor-pointer"
                    >
                      Use slider instead
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setStep("vibe")}
                    className="p-2.5 rounded-xl border-[2.5px] border-border bg-card text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <motion.button
                    type="button"
                    onClick={nextFromGoal}
                    className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 border-[2.5px] border-border cursor-pointer"
                    style={isBoring ? undefined : { boxShadow: "3px 3px 0 hsl(var(--border))" }}
                    whileHover={isBoring ? { opacity: 0.9 } : { scale: 1.03, y: -2 }}
                    whileTap={isBoring ? undefined : { scale: 0.97 }}
                  >
                    Set goal <ArrowRight size={16} />
                  </motion.button>
                  <button
                    type="button"
                    onClick={skipGoal}
                    className="text-xs text-muted-foreground hover:text-primary font-medium cursor-pointer"
                  >
                    later
                  </button>
                </div>
              </motion.div>
            )}

            {/* ============ STEP 3: PAPERS GOAL ============ */}
            {step === "papers-goal" && (
              <motion.div
                key="papers-goal"
                {...pageVariants}
                transition={
                  isBoring ? { duration: 0.15 } : { type: "spring", stiffness: 300, damping: 25 }
                }
              >
                <h2 className="text-xl font-bold text-foreground mb-1">Daily papers goal</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  How many papers do you want to complete each day?
                </p>

                {!showCustomPapers ? (
                  <>
                    <PapersArcSlider
                      value={papersGoalValue}
                      onChange={setPapersGoalValue}
                      isBoring={isBoring}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCustomPapers(true)}
                      className="block mx-auto mt-2 text-xs font-medium text-muted-foreground hover:text-primary cursor-pointer"
                    >
                      Custom number...
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={customPapersGoal}
                      onChange={(e) => setCustomPapersGoal(e.target.value)}
                      placeholder="e.g. 3"
                      className="w-24 text-center text-2xl font-bold border-[2.5px] border-border rounded-xl py-2 bg-card text-foreground focus:outline-none focus:border-primary"
                    />
                    <span className="text-xs text-muted-foreground">papers per day</span>
                    <button
                      type="button"
                      onClick={() => setShowCustomPapers(false)}
                      className="text-xs text-primary font-medium cursor-pointer"
                    >
                      Use slider instead
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setStep("goal")}
                    className="p-2.5 rounded-xl border-[2.5px] border-border bg-card text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <motion.button
                    type="button"
                    onClick={nextFromPapersGoal}
                    className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 border-[2.5px] border-border cursor-pointer"
                    style={isBoring ? undefined : { boxShadow: "3px 3px 0 hsl(var(--border))" }}
                    whileHover={isBoring ? { opacity: 0.9 } : { scale: 1.03, y: -2 }}
                    whileTap={isBoring ? undefined : { scale: 0.97 }}
                  >
                    Set goal <ArrowRight size={16} />
                  </motion.button>
                  <button
                    type="button"
                    onClick={skipPapersGoal}
                    className="text-xs text-muted-foreground hover:text-primary font-medium cursor-pointer"
                  >
                    later
                  </button>
                </div>
              </motion.div>
            )}

            {/* ============ STEP 4: SIGN IN ============ */}
            {step === "signin" && (
              <motion.div
                key="signin"
                {...pageVariants}
                transition={
                  isBoring ? { duration: 0.15 } : { type: "spring", stiffness: 300, damping: 25 }
                }
              >
                <h2 className="text-xl font-bold text-foreground mb-1">
                  Want to save your progress?
                </h2>
                <p className="text-sm text-muted-foreground mb-5">
                  Sign in to sync across devices.
                </p>

                <div className="space-y-3">
                  <SignInCard
                    onClick={finishAndSolve}
                    icon={<Zap className="text-primary" size={22} />}
                    title="Anonymous & quick"
                    subtitle="No account needed, start instantly"
                  />
                  <SignInCard
                    onClick={finishAndSolve}
                    icon={<UserPlus className="text-primary" size={22} />}
                    title="Create an account"
                    subtitle="Save progress & sync devices"
                  />
                  <SignInCard
                    onClick={finishAndSolve}
                    icon={<User size={22} />}
                    title="Sign in later"
                    subtitle="You can always do this from settings"
                  />
                </div>

                <div className="flex items-center gap-3 mt-5">
                  <button
                    type="button"
                    onClick={() => setStep("papers-goal")}
                    className="p-2.5 rounded-xl border-[2.5px] border-border bg-card text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SignInCard({
  onClick,
  icon,
  title,
  subtitle,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ x: 4, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="w-full flex items-center gap-4 rounded-2xl border-[2.5px] border-border bg-card p-4 text-left cursor-pointer hover:border-primary transition"
    >
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="font-bold">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
      <ArrowRight className="text-muted-foreground" size={16} />
    </motion.button>
  );
}
