// Multi-step setup wizard. Same fields as the editor, but presented as a
// playful guided flow with animated progress and step transitions.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  User,
  GraduationCap,
  Globe2,
  Eye,
  PartyPopper,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import { useCurrentUser, updateCurrentUser, updateVisibility } from "@/lib/profileStore";
import type { Subject } from "@/data/profileTypes";
import BioEditor from "./BioEditor";
import SchoolPicker from "./SchoolPicker";
import ExamSessionPicker from "./ExamSessionPicker";
import UniversityPicker from "./UniversityPicker";
import FlairBuilder from "./FlairBuilder";
import toast from "react-hot-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const STEPS = [
  { id: "basics", label: "Basics", Icon: User },
  { id: "academics", label: "Academics", Icon: GraduationCap },
  { id: "unis", label: "Universities", Icon: Globe2 },
  { id: "flairs", label: "Flairs", Icon: Sparkles },
  { id: "privacy", label: "Privacy", Icon: Eye },
] as const;

export default function SetupWizard({ open, onOpenChange }: Props) {
  const me = useCurrentUser();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  const total = STEPS.length;
  const Step = STEPS[step];
  const progress = ((step + 1) / total) * 100;

  function next() {
    if (step < total - 1) setStep(step + 1);
    else {
      setDone(true);
      toast.success("Profile setup complete");
    }
  }
  function back() {
    if (step > 0) setStep(step - 1);
  }
  function close() {
    onOpenChange(false);
    setTimeout(() => {
      setStep(0);
      setDone(false);
    }, 300);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        {/* Progress */}
        <div className="px-5 pt-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-muted-foreground">
              Step {Math.min(step + 1, total)} of {total}
            </div>
            <div className="flex items-center gap-1">
              {STEPS.map((s, i) => {
                const Icon = s.Icon;
                const active = i === step;
                const reached = i < step || done;
                return (
                  <motion.div
                    key={s.id}
                    animate={{ scale: active ? 1.1 : 1 }}
                    className={`h-7 w-7 rounded-full inline-flex items-center justify-center border-2 ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : reached
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-card text-muted-foreground"
                    }`}
                    title={s.label}
                  >
                    {reached && !active ? <Check size={12} /> : <Icon size={12} />}
                  </motion.div>
                );
              })}
            </div>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              animate={{ width: `${done ? 100 : progress}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 24 }}
            />
          </div>
        </div>

        <div className="p-5 min-h-[420px]">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center text-center min-h-[420px]"
              >
                <motion.div
                  initial={{ rotate: -20, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="h-16 w-16 rounded-full bg-primary/15 text-primary inline-flex items-center justify-center"
                >
                  <PartyPopper size={28} />
                </motion.div>
                <h3 className="mt-4 text-2xl font-extrabold">You're all set</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your profile looks great. Take a peek at how others see you.
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-5 inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90"
                >
                  Done
                </button>
              </motion.div>
            ) : (
              <motion.div
                key={Step.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <Step.Icon size={18} className="text-primary" />
                  <h3 className="text-xl font-extrabold">{Step.label}</h3>
                </div>

                {Step.id === "basics" && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-bold">Display name</Label>
                      <Input
                        value={me.displayName}
                        onChange={(e) => updateCurrentUser({ displayName: e.target.value })}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-bold">Role</Label>
                      <div className="flex gap-2">
                        {(["student", "teacher", "volunteer"] as const).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => updateCurrentUser({ role: r })}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 capitalize ${
                              me.role === r
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card hover:border-primary/50"
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-bold">Bio</Label>
                      <BioEditor
                        value={me.bio}
                        onChange={(html) => updateCurrentUser({ bio: html })}
                      />
                    </div>
                  </div>
                )}

                {Step.id === "academics" && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-bold">Favourite subject</Label>
                      <div className="flex gap-2">
                        {(["bio", "chem", "phys"] as Subject[]).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => updateCurrentUser({ favouriteSubject: s })}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 capitalize ${
                              me.favouriteSubject === s
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card hover:border-primary/50"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-bold">School</Label>
                      <SchoolPicker
                        value={me.school}
                        onChange={(v) => updateCurrentUser({ school: v })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-bold">Exam sessions</Label>
                      <ExamSessionPicker
                        value={me.examSessions}
                        onChange={(next) => updateCurrentUser({ examSessions: next })}
                      />
                    </div>
                  </div>
                )}

                {Step.id === "unis" && (
                  <UniversityPicker
                    value={me.targetUniversities}
                    onChange={(next) => updateCurrentUser({ targetUniversities: next })}
                  />
                )}

                {Step.id === "flairs" && (
                  <FlairBuilder
                    value={me.flairs}
                    onChange={(next) => updateCurrentUser({ flairs: next })}
                  />
                )}

                {Step.id === "privacy" && (
                  <div className="grid sm:grid-cols-2 gap-2">
                    {(
                      [
                        ["displayName", "Display name"],
                        ["role", "Role"],
                        ["bio", "Bio"],
                        ["profilePicture", "Profile picture"],
                        ["favouriteSubject", "Favourite subject"],
                        ["school", "School"],
                        ["examSessions", "Exam sessions"],
                        ["targetUniversities", "Target universities"],
                        ["flairs", "Flairs"],
                        ["goal", "Daily goal"],
                        ["leaderboard", "Appear on leaderboard"],
                        ["email", "Email"],
                        ["phone", "Phone"],
                      ] as const
                    ).map(([k, label]) => (
                      <label
                        key={k}
                        className="flex items-center justify-between p-3 rounded-2xl border-2 border-border bg-card cursor-pointer"
                      >
                        <span className="text-sm font-semibold">{label}</span>
                        <Switch
                          checked={me.visibility[k]}
                          onCheckedChange={(v) => updateVisibility({ [k]: v })}
                        />
                      </label>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!done && (
          <div className="px-5 pb-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={back}
              disabled={step === 0}
              className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl border-2 border-border bg-card text-sm font-bold hover:bg-muted disabled:opacity-40"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90"
            >
              {step === total - 1 ? "Finish" : "Next"} <ArrowRight size={14} />
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
