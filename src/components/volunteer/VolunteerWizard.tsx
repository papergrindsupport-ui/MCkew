import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  X,
  Calendar as CalIcon,
  Sparkles,
  FileText,
  Heart,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import ContactMethodsManager from "./ContactMethodsManager";
import VolunteerEditor from "./VolunteerEditor";
import CountrySelector from "./CountrySelector";
import TermsModal from "./TermsModal";
import {
  saveApplication,
  ROLE_INFO,
  SUBJECTS,
  EDUCATION_LEVELS,
  type VolunteerApplication,
  type ContactMethod,
  type SubjectChoice,
  type CustomField,
  type VolunteerRole,
} from "./volunteer-types";
import { sendResendFormEmail } from "@/lib/resendEmail";
import type { RichText } from "@/data/questionData";

const STEPS = [
  "Your name",
  "How to reach you",
  "About you",
  "When you're free",
  "What you'll teach",
  "Where you're from",
  "Extra notes",
  "Your message",
  "Pick a role",
  "Final check",
] as const;

interface Props {
  onSubmitted: (app: VolunteerApplication) => void;
  onCancel: () => void;
}

export default function VolunteerWizard({ onSubmitted, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shaking, setShaking] = useState(false);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Form state
  const [fullName, setFullName] = useState("");
  const [contactMethods, setContactMethods] = useState<ContactMethod[]>([]);
  const [dob, setDob] = useState<Date | undefined>();
  const [availFrom, setAvailFrom] = useState<Date | undefined>();
  const [availTo, setAvailTo] = useState<Date | undefined>();
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [selectedSubjects, setSelectedSubjects] = useState<SubjectChoice[]>([]);
  const [educationLevel, setEducationLevel] = useState("");
  const [customEducation, setCustomEducation] = useState("");
  const [livesInHome, setLivesInHome] = useState(true);
  const [nationality, setNationality] = useState("");
  const [currentLoc, setCurrentLoc] = useState("");
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [openTerms, setOpenTerms] = useState<"terms" | "rules" | null>(null);
  const [appMessage, setAppMessage] = useState<RichText>([]);
  const [role, setRole] = useState<VolunteerRole | null>(null);
  const [customRole, setCustomRole] = useState("");
  const [expandedRole, setExpandedRole] = useState<VolunteerRole | null>(null);

  const triggerShake = useCallback(() => {
    setShaking(true);
    setTimeout(() => setShaking(false), 400);
  }, []);

  const validateStep = useCallback((): string | null => {
    switch (step) {
      case 0:
        if (!fullName.trim()) return "Please enter your name";
        if (fullName.trim().length < 2) return "Name is too short";
        return null;
      case 1: {
        if (contactMethods.length === 0) return "Add at least one contact method";
        for (const m of contactMethods) {
          if (m.kind === "phone" && !m.number.trim())
            return "Fill in your phone number or remove it";
          if (m.kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email))
            return "Enter a valid email";
          if (m.kind === "social" && !m.username.trim())
            return "Fill in your social handle or remove it";
          if (m.kind === "other" && (!m.label.trim() || !m.value.trim()))
            return "Complete or remove the 'other' contact";
        }
        return null;
      }
      case 3:
        if (!availFrom || !availTo) return "Pick your availability dates";
        if (availTo < availFrom) return "End date must be after start date";
        return null;
      case 4:
        if (selectedSubjects.length === 0) return "Pick at least one subject";
        return null;
      case 8:
        if (!role) return "Pick a role";
        if (role === "other" && !customRole.trim()) return "Describe your custom role";
        return null;
      case 9:
        if (!acceptedTerms) return "You must accept the terms and rules";
        return null;
      default:
        return null;
    }
  }, [
    step,
    fullName,
    contactMethods,
    availFrom,
    availTo,
    selectedSubjects,
    role,
    customRole,
    acceptedTerms,
  ]);

  const tryAdvance = useCallback(() => {
    const err = validateStep();
    if (err) {
      triggerShake();
      toast.error(err, { id: "step-err" });
      return false;
    }
    if (step < STEPS.length - 1) {
      setDirection(1);
      setStep((s) => s + 1);
      return true;
    }
    return false;
  }, [validateStep, triggerShake, step]);

  const goBack = useCallback(() => {
    if (step > 0) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  }, [step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (isTyping && e.key !== "Enter") return;
      if (e.key === "ArrowRight" || (e.key === "Enter" && !isTyping)) {
        e.preventDefault();
        tryAdvance();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goBack();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tryAdvance, goBack]);

  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const err = validateStep();
    if (err) {
      triggerShake();
      toast.error(err);
      return;
    }
    if (submitting) return;
    const app: VolunteerApplication = {
      id: crypto.randomUUID(),
      userId: null,
      fullName: fullName.trim(),
      contactMethods,
      dateOfBirth: dob?.toISOString(),
      availableFrom: availFrom?.toISOString(),
      availableTo: availTo?.toISOString(),
      hoursPerDay,
      subjects: selectedSubjects,
      educationLevel: educationLevel === "Other" ? undefined : educationLevel,
      customEducation: educationLevel === "Other" ? customEducation : undefined,
      nationality: nationality || undefined,
      livesInHomeCountry: livesInHome,
      currentLocation: livesInHome ? undefined : currentLoc || undefined,
      customFields,
      applicationMessage: appMessage,
      role: role!,
      customRole: role === "other" ? customRole : undefined,
      acceptedTerms,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    setSubmitting(true);
    try {
      const saved = await saveApplication(app);
      const emailContact = contactMethods.find((m) => m.kind === "email") as
        | { kind: "email"; email: string }
        | undefined;
      const contactSummary = contactMethods
        .map((m: any) => {
          if (m.kind === "email") return `Email: ${m.email}`;
          if (m.kind === "phone") return `Phone: ${m.country ?? ""} ${m.number ?? ""}`.trim();
          if (m.kind === "social")
            return `${m.platform}: ${m.username}${m.customLink ? ` (${m.customLink})` : ""}`;
          return JSON.stringify(m);
        })
        .join("\n");
      const summary = [
        `Role: ${role}${role === "other" && customRole ? ` (${customRole})` : ""}`,
        `Name: ${app.fullName}`,
        app.dateOfBirth ? `DOB: ${new Date(app.dateOfBirth).toLocaleDateString()}` : "",
        app.nationality ? `Nationality: ${app.nationality}` : "",
        app.currentLocation ? `Location: ${app.currentLocation}` : "",
        app.educationLevel ? `Education: ${app.educationLevel}` : "",
        app.customEducation ? `Education (custom): ${app.customEducation}` : "",
        selectedSubjects.length
          ? `Subjects: ${selectedSubjects.map((s: any) => s.name ?? s).join(", ")}`
          : "",
        app.availableFrom
          ? `Available from: ${new Date(app.availableFrom).toLocaleDateString()}`
          : "",
        app.availableTo ? `Available to: ${new Date(app.availableTo).toLocaleDateString()}` : "",
        hoursPerDay ? `Hours/day: ${hoursPerDay}` : "",
        "",
        "Contact methods:",
        contactSummary,
        "",
        appMessage ? `Message:\n${appMessage}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      void sendResendFormEmail({
        kind: "volunteer",
        source: role ?? undefined,
        submitterEmail: emailContact?.email,
        submitterName: app.fullName,
        subject: `Volunteer application — ${role}`,
        summary,
      });
      onSubmitted(saved);
    } catch (e: any) {
      console.error("[volunteer] submit failed", e);
      toast.error(e?.error || "Could not submit application — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={onCancel}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <X size={12} /> Cancel
            </button>
            <span className="text-xs font-bold text-primary tabular-nums">
              Step {step + 1} of {STEPS.length}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary/70"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground text-center">
            Tip: use{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-[10px]">
              ←
            </kbd>{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-[10px]">
              →
            </kbd>{" "}
            arrow keys to navigate
          </p>
        </div>

        <motion.div
          ref={containerRef}
          animate={shaking ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -40 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="bg-card rounded-3xl border-2 border-border p-6 sm:p-8 shadow-lg"
            >
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">{STEPS[step]}</h2>

              {step === 0 && (
                <div className="mt-6 space-y-3">
                  <p className="text-sm text-muted-foreground">What should we call you?</p>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-14 px-5 rounded-2xl border-2 border-border bg-card text-foreground text-lg font-medium focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              )}

              {step === 1 && (
                <div className="mt-6 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    At least one method is required. Add anything else you're comfortable with —
                    more options = faster reach.
                  </p>
                  <ContactMethodsManager methods={contactMethods} onChange={setContactMethods} />
                </div>
              )}

              {step === 2 && (
                <div className="mt-6 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Date of birth <span className="text-xs">(optional)</span>
                  </p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start h-12 rounded-xl border-2 text-left font-normal"
                      >
                        <CalIcon className="mr-2 h-4 w-4 text-primary" />
                        {dob ? (
                          format(dob, "PPP")
                        ) : (
                          <span className="text-muted-foreground">Pick your birthday</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dob}
                        onSelect={setDob}
                        captionLayout="dropdown"
                        fromYear={1940}
                        toYear={new Date().getFullYear()}
                        disabled={(d) => d > new Date()}
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {dob && (
                    <button
                      type="button"
                      onClick={() => setDob(undefined)}
                      className="text-xs text-muted-foreground hover:text-destructive font-semibold"
                    >
                      Clear date
                    </button>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="mt-6 space-y-5">
                  <p className="text-sm text-muted-foreground">When are you available?</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <DatePickerField label="From" value={availFrom} onChange={setAvailFrom} />
                    <DatePickerField
                      label="To"
                      value={availTo}
                      onChange={setAvailTo}
                      fromDate={availFrom}
                    />
                  </div>
                  <div className="pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">Hours per day</span>
                      <motion.span
                        key={hoursPerDay}
                        initial={{ scale: 1.4, color: "hsl(var(--primary))" }}
                        animate={{ scale: 1, color: "hsl(var(--foreground))" }}
                        className="text-2xl font-bold tabular-nums"
                      >
                        {hoursPerDay}h
                      </motion.span>
                    </div>
                    <Slider
                      value={[hoursPerDay]}
                      onValueChange={(v) => setHoursPerDay(v[0])}
                      min={1}
                      max={12}
                      step={1}
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>1h</span>
                      <span>12h</span>
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="mt-6 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Pick the subjects you'd love to help with (multiple OK)
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {SUBJECTS.map((s) => {
                      const checked = selectedSubjects.some((x) => {
                        if (s.subject === "biology" && x.subject === "biology")
                          return x.level === s.level;
                        return x.subject === s.subject;
                      });
                      return (
                        <motion.button
                          key={s.id}
                          type="button"
                          whileHover={{ scale: 1.03, y: -2 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => {
                            if (checked) {
                              setSelectedSubjects((prev) =>
                                prev.filter((x) => {
                                  if (s.subject === "biology" && x.subject === "biology")
                                    return x.level !== s.level;
                                  return x.subject !== s.subject;
                                }),
                              );
                            } else {
                              const choice: SubjectChoice =
                                s.subject === "biology"
                                  ? { subject: "biology", level: s.level! }
                                  : ({ subject: s.subject } as SubjectChoice);
                              setSelectedSubjects((prev) => [...prev, choice]);
                            }
                          }}
                          className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1.5 ${
                            checked
                              ? "border-primary bg-primary/10"
                              : "border-border bg-card hover:border-primary/50"
                          }`}
                        >
                          <span className="text-3xl">{s.emoji}</span>
                          <span
                            className={`text-xs font-bold ${checked ? "text-primary" : "text-foreground"}`}
                          >
                            {s.label}
                          </span>
                          {checked && <Check size={14} className="text-primary" />}
                        </motion.button>
                      );
                    })}
                  </div>

                  <div className="pt-4 space-y-2">
                    <p className="text-sm font-semibold text-foreground">
                      Education level{" "}
                      <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {EDUCATION_LEVELS.map((lvl) => (
                        <motion.button
                          key={lvl}
                          type="button"
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setEducationLevel(educationLevel === lvl ? "" : lvl)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                            educationLevel === lvl
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          {lvl}
                        </motion.button>
                      ))}
                    </div>
                    {educationLevel === "Other" && (
                      <motion.input
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        type="text"
                        placeholder="Describe your background..."
                        value={customEducation}
                        onChange={(e) => setCustomEducation(e.target.value)}
                        className="w-full h-10 px-4 rounded-xl border-2 border-border bg-card text-sm focus:outline-none focus:border-primary"
                      />
                    )}
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="mt-6 space-y-4">
                  <div className="p-3 rounded-2xl bg-primary/5 border-2 border-dashed border-primary/30">
                    <p className="text-xs font-bold text-primary mb-1">
                      🔒 100% optional & private
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Skip anything you want. We use this only to match you with regional
                      opportunities and never share it.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Nationality</label>
                    <CountrySelector
                      value={nationality}
                      onChange={setNationality}
                      placeholder="Pick your home country"
                    />
                  </div>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border-2 border-border bg-card cursor-pointer hover:bg-muted/30 transition-colors">
                    <Checkbox checked={livesInHome} onCheckedChange={(c) => setLivesInHome(!!c)} />
                    <span className="text-sm font-medium text-foreground flex-1">
                      I currently live in my home country
                    </span>
                  </label>

                  <AnimatePresence>
                    {!livesInHome && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Current location
                        </label>
                        <CountrySelector
                          value={currentLoc}
                          onChange={setCurrentLoc}
                          placeholder="Where do you live now?"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {step === 6 && (
                <div className="mt-6 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Anything else we should know? Add your own notes & fields.
                  </p>
                  <AnimatePresence>
                    {customFields.map((f, idx) => (
                      <motion.div
                        key={f.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        className="grid grid-cols-[1fr_2fr_auto] gap-2"
                      >
                        <input
                          placeholder="Label"
                          value={f.label}
                          onChange={(e) => {
                            const next = [...customFields];
                            next[idx] = { ...f, label: e.target.value };
                            setCustomFields(next);
                          }}
                          className="h-11 px-3 rounded-xl border-2 border-border bg-card text-sm font-semibold focus:outline-none focus:border-primary"
                        />
                        <input
                          placeholder="Value"
                          value={f.value}
                          onChange={(e) => {
                            const next = [...customFields];
                            next[idx] = { ...f, value: e.target.value };
                            setCustomFields(next);
                          }}
                          className="h-11 px-3 rounded-xl border-2 border-border bg-card text-sm focus:outline-none focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => setCustomFields(customFields.filter((_, i) => i !== idx))}
                          className="w-11 h-11 rounded-xl border-2 border-border bg-card text-muted-foreground hover:text-destructive hover:border-destructive flex items-center justify-center"
                        >
                          <X size={14} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() =>
                      setCustomFields([
                        ...customFields,
                        { id: crypto.randomUUID(), label: "", value: "" },
                      ])
                    }
                    className="w-full py-3 rounded-2xl border-2 border-dashed border-border hover:border-primary hover:text-primary text-muted-foreground font-semibold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={16} /> Add field
                  </motion.button>
                </div>
              )}

              {step === 7 && (
                <div className="mt-6 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Tell us why you'd love to volunteer (optional but encouraged ✨)
                  </p>
                  <VolunteerEditor content={appMessage} onChange={setAppMessage} />
                </div>
              )}

              {step === 8 && (
                <div className="mt-6 space-y-3">
                  <p className="text-sm text-muted-foreground">Which role calls to you?</p>
                  <div className="space-y-2.5">
                    {(Object.keys(ROLE_INFO) as VolunteerRole[]).map((r) => {
                      const info = ROLE_INFO[r];
                      const selected = role === r;
                      const expanded = expandedRole === r;
                      return (
                        <motion.div
                          key={r}
                          layout
                          className={`rounded-2xl border-2 overflow-hidden transition-all ${
                            selected
                              ? "border-primary bg-primary/5"
                              : "border-border bg-card hover:border-primary/40"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setRole(r);
                              setExpandedRole(expanded ? null : r);
                            }}
                            className="w-full p-4 text-left flex items-start gap-3"
                          >
                            <span className="text-3xl shrink-0">{info.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3
                                  className={`text-base font-bold ${selected ? "text-primary" : "text-foreground"}`}
                                >
                                  {info.name}
                                </h3>
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                  {info.tagline}
                                </span>
                              </div>
                              <AnimatePresence>
                                {expanded && (
                                  <motion.p
                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                    animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                    className="text-xs text-muted-foreground leading-relaxed"
                                  >
                                    {info.description}
                                  </motion.p>
                                )}
                              </AnimatePresence>
                            </div>
                            {selected && <Check size={16} className="text-primary shrink-0 mt-1" />}
                          </button>
                          <AnimatePresence>
                            {selected && r === "other" && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="px-4 pb-4 space-y-2"
                              >
                                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-700 dark:text-amber-300 leading-tight">
                                  ⚠️ Heads up: we don't accept developer / engineering / tech-build
                                  roles via this form. For everything else, fire away.
                                </div>
                                <input
                                  type="text"
                                  placeholder="Describe your role..."
                                  value={customRole}
                                  onChange={(e) => setCustomRole(e.target.value)}
                                  className="w-full h-11 px-4 rounded-xl border-2 border-border bg-card text-sm focus:outline-none focus:border-primary"
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 9 && (
                <div className="mt-6 space-y-4">
                  <p className="text-sm text-muted-foreground">Almost done! Just one last thing.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setOpenTerms("terms")}
                      className="rounded-xl border-2 h-11"
                    >
                      <FileText size={14} className="mr-2" /> Terms of Service
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setOpenTerms("rules")}
                      className="rounded-xl border-2 h-11"
                    >
                      <Heart size={14} className="mr-2" /> Volunteer Rules
                    </Button>
                  </div>
                  <motion.label
                    whileHover={{ scale: 1.01 }}
                    className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      acceptedTerms
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <Checkbox
                      checked={acceptedTerms}
                      onCheckedChange={(c) => setAcceptedTerms(!!c)}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-foreground leading-relaxed">
                      I've read the <span className="font-bold text-primary">rules</span> and{" "}
                      <span className="font-bold text-primary">terms of service</span>, I accept
                      both, and I acknowledge them.
                    </span>
                  </motion.label>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={goBack}
            disabled={step === 0}
            className="rounded-full h-12 px-5 border-2 disabled:opacity-30"
          >
            <ArrowLeft size={16} className="mr-1" /> Back
          </Button>

          {step < STEPS.length - 1 ? (
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                onClick={tryAdvance}
                className="rounded-full h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/30"
              >
                Continue <ArrowRight size={16} className="ml-1" />
              </Button>
            </motion.div>
          ) : (
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                onClick={submit}
                disabled={submitting}
                className="rounded-full h-12 px-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/30 disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 size={16} className="mr-1.5 animate-spin" />
                ) : (
                  <Sparkles size={16} className="mr-1.5" />
                )}{" "}
                {submitting ? "Submitting…" : "Submit application"}
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {openTerms && <TermsModal open onClose={() => setOpenTerms(null)} type={openTerms} />}
    </div>
  );
}

function DatePickerField({
  label,
  value,
  onChange,
  fromDate,
}: {
  label: string;
  value?: Date;
  onChange: (d?: Date) => void;
  fromDate?: Date;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start h-11 rounded-xl border-2 text-left font-normal"
          >
            <CalIcon className="mr-2 h-4 w-4 text-primary" />
            {value ? format(value, "PP") : <span className="text-muted-foreground">Pick date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
            disabled={fromDate ? (d) => d < fromDate : undefined}
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
