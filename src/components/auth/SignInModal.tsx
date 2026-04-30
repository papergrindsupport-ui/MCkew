import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LuX,
  LuArrowLeft,
  LuUser,
  LuUserX,
  LuSparkles,
  LuShieldCheck,
  LuKey,
  LuPlus,
  LuTrash2,
  LuEye,
  LuEyeOff,
  LuRefreshCw,
  LuPencil,
  LuDownload,
  LuTriangleAlert,
  LuCheck,
  LuCopy,
  LuLoader,
} from "react-icons/lu";
import { cn } from "@/lib/utils";
import { useAccountStore, generateAnonId, type Profile } from "@/stores/useAccountStore";
import { supabase } from "@/integrations/supabase/client";
import { SignIn, SignUp } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import { jsPDF } from "jspdf";

export type SecretQuestion = { id: string; question: string; answer: string };

async function callAuthEdge(
  action: string,
  body: Record<string, unknown> = {},
): Promise<{ profile?: Profile; error?: string }> {
  const { data, error } = await supabase.functions.invoke("auth-resolve-profile", {
    body: { action, ...body },
  });
  if (error) return { error: error.message };
  return (data ?? {}) as { profile?: Profile; error?: string };
}

type Step = "choose" | "normal" | "anon-choose" | "anon-create" | "anon-signin" | "anon-success";

export function SignInModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [step, setStep] = useState<Step>("choose");

  useEffect(() => {
    if (open) setStep("choose");
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  // Lock body scroll while open so the fixed modal can't be visually offset
  // by a parent transform / scroll context, and so background can't scroll.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Reset internal scroll whenever a new step is shown so the header is never
  // hidden above the fold on tall content.
  const panelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (panelRef.current) panelRef.current.scrollTop = 0;
  }, [step, open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="signin-modal-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[10100] overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {/* Backdrop (click to close) */}
          <div
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-foreground/40 backdrop-blur-sm"
            aria-hidden
          />

          {/* Centering wrapper — min-h-full + flex centers vertically without
              relying on transforms that can be broken by ancestor transforms. */}
          <div className="relative min-h-full flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <motion.div
              ref={panelRef}
              initial={{ y: 12, scale: 0.97 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 8, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="pointer-events-auto relative w-full max-w-[520px] rounded-3xl border-[2.5px] border-border bg-card shadow-2xl p-5 sm:p-6 my-auto"
              role="dialog"
              aria-modal="true"
            >
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close"
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted/60 transition cursor-pointer"
              >
                <LuX size={18} />
              </button>

              <AnimatePresence mode="wait">
                {step === "choose" && (
                  <ChooseStep
                    key="choose"
                    onNormal={() => setStep("normal")}
                    onAnon={() => setStep("anon-choose")}
                  />
                )}
                {step === "normal" && <NormalStep key="normal" onBack={() => setStep("choose")} />}
                {step === "anon-choose" && (
                  <AnonChooseStep
                    key="anon-choose"
                    onBack={() => setStep("choose")}
                    onCreate={() => setStep("anon-create")}
                    onSignIn={() => setStep("anon-signin")}
                  />
                )}
                {step === "anon-create" && (
                  <AnonCreateStep
                    key="anon-create"
                    onBack={() => setStep("anon-choose")}
                    onDone={() => setStep("anon-success")}
                  />
                )}
                {step === "anon-signin" && (
                  <AnonSignInStep
                    key="anon-signin"
                    onBack={() => setStep("anon-choose")}
                    onClose={() => onOpenChange(false)}
                  />
                )}
                {step === "anon-success" && (
                  <AnonSuccessStep key="anon-success" onClose={() => onOpenChange(false)} />
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* -------------------------------- step shells -------------------------------- */

const stepMotion = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.2 },
};

function BackHeader({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <button
        type="button"
        onClick={onBack}
        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted/60 transition cursor-pointer"
        aria-label="Back"
      >
        <LuArrowLeft size={16} />
      </button>
      <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
    </div>
  );
}

/* -------------------------------- choose step -------------------------------- */

function ChooseStep({ onNormal, onAnon }: { onNormal: () => void; onAnon: () => void }) {
  return (
    <motion.div {...stepMotion}>
      <div className="mb-5">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <LuSparkles className="text-primary" size={22} /> Sign in
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Pick how you'd like to keep your progress.
        </p>
      </div>

      {/* Recommended option */}
      <motion.button
        type="button"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={onNormal}
        className="relative w-full text-left p-4 rounded-2xl border-[2.5px] border-primary bg-primary/5 hover:bg-primary/10 transition cursor-pointer mb-3"
      >
        <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-primary text-primary-foreground shadow">
          Recommended
        </span>
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center text-primary shrink-0">
            <LuUser size={22} />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-base">Sign in like normal humans</div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Use your email and a password. You get a real account you can recover anytime, sync
              across devices, and never lose.
            </p>
          </div>
        </div>
      </motion.button>

      {/* Anon option */}
      <motion.button
        type="button"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={onAnon}
        className="w-full text-left p-4 rounded-2xl border-[2.5px] border-border bg-card hover:border-foreground/40 transition cursor-pointer"
      >
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center text-foreground shrink-0">
            <LuUserX size={22} />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-base flex items-center gap-2">
              Anonymous super-quick sign in
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">
                Not recommended
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              No email needed — just an auto-generated ID. Account recovery is hard and may be
              <span className="font-semibold text-foreground"> impossible</span> if you lose your ID
              and password.
            </p>
          </div>
        </div>
      </motion.button>
    </motion.div>
  );
}

/* -------------------------------- normal step (placeholder) -------------------------------- */

function NormalStep({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  return (
    <motion.div {...stepMotion}>
      <BackHeader onBack={onBack} title={mode === "sign-in" ? "Sign in" : "Create account"} />
      <p className="text-sm text-muted-foreground mb-4">
        Use email, Google, or any other method enabled in your Clerk app.
      </p>
      <div className="flex justify-center">
        {mode === "sign-in" ? (
          <SignIn
            routing="virtual"
            signUpUrl="#"
            appearance={{ elements: { footer: { display: "none" } } }}
          />
        ) : (
          <SignUp
            routing="virtual"
            signInUrl="#"
            appearance={{ elements: { footer: { display: "none" } } }}
          />
        )}
      </div>
      <button
        type="button"
        onClick={() => setMode((m) => (m === "sign-in" ? "sign-up" : "sign-in"))}
        className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground transition cursor-pointer"
      >
        {mode === "sign-in" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </motion.div>
  );
}

/* -------------------------------- anon choose -------------------------------- */

function AnonChooseStep({
  onBack,
  onCreate,
  onSignIn,
}: {
  onBack: () => void;
  onCreate: () => void;
  onSignIn: () => void;
}) {
  return (
    <motion.div {...stepMotion}>
      <BackHeader onBack={onBack} title="Anonymous Sign-In" />
      <p className="text-sm text-muted-foreground mb-5">
        No email needed — just a password. Your data is saved to a unique ID.
      </p>

      <PrimaryButton onClick={onCreate}>
        <LuPlus size={18} /> Create Anonymous Account
      </PrimaryButton>

      <button
        type="button"
        onClick={onSignIn}
        className="mt-3 w-full px-5 py-3.5 rounded-full border-[2.5px] border-foreground/80 bg-card hover:bg-muted/40 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition"
      >
        <LuKey size={16} /> Sign In with ID
      </button>
    </motion.div>
  );
}

/* -------------------------------- anon create -------------------------------- */

function AnonCreateStep({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const setProfile = useAccountStore((s) => s.setProfile);
  const setAnonId = useAccountStore((s) => s.setAnonId);

  const [anonId, setAnonIdLocal] = useState(() => generateAnonId());
  const [editingId, setEditingId] = useState(false);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [questions, setQuestions] = useState<SecretQuestion[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const addQuestion = () => {
    if (questions.length >= 5) return;
    setQuestions((q) => [
      ...q,
      { id: crypto.randomUUID?.() ?? Math.random().toString(36), question: "", answer: "" },
    ]);
  };
  const removeQuestion = (id: string) => setQuestions((q) => q.filter((x) => x.id !== id));
  const updateQuestion = (id: string, patch: Partial<SecretQuestion>) =>
    setQuestions((q) => q.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const canSubmit = anonId.trim().length >= 4 && !submitting;

  const submit = async () => {
    if (anonId.trim().length < 4) {
      toast.error("Anonymous ID is too short");
      return;
    }
    if (password && password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSubmitting(true);
    const r = await callAuthEdge("anon-create", {
      anonId: anonId.trim().toLowerCase(),
      password: password || undefined,
      secretQuestions: questions.filter((q) => q.question.trim() && q.answer.trim()),
    });
    setSubmitting(false);
    if (r.error || !r.profile) {
      toast.error(r.error || "Could not create account");
      return;
    }
    setProfile(r.profile);
    setAnonId(r.profile.public_id);
    onDone();
  };

  return (
    <motion.div {...stepMotion}>
      <BackHeader onBack={onBack} title="Create Anonymous Account" />
      <p className="text-sm text-muted-foreground mb-4">
        Choose a password and ID. You can edit the auto-generated ID if you like.
      </p>

      {/* Anon ID */}
      <Field label="Your Anonymous ID">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border-[2.5px] border-border bg-card focus-within:border-primary transition">
          <LuUserX size={16} className="text-muted-foreground shrink-0" />
          {editingId ? (
            <input
              autoFocus
              value={anonId}
              onChange={(e) => setAnonIdLocal(e.target.value.toLowerCase().replace(/\s/g, "-"))}
              onBlur={() => setEditingId(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setEditingId(false);
              }}
              className="flex-1 bg-transparent outline-none text-sm font-mono"
            />
          ) : (
            <span className="flex-1 text-sm font-mono truncate">{anonId}</span>
          )}
          <IconBtn onClick={() => setEditingId((v) => !v)} label={editingId ? "Done" : "Edit ID"}>
            {editingId ? <LuCheck size={14} /> : <LuPencil size={14} />}
          </IconBtn>
          <IconBtn onClick={() => setAnonIdLocal(generateAnonId())} label="Regenerate ID">
            <LuRefreshCw size={14} />
          </IconBtn>
        </div>
      </Field>

      {/* Password */}
      <Field
        label={
          <span>
            Password{" "}
            <span className="font-normal text-muted-foreground">
              (optional, recommended — min. 6)
            </span>
          </span>
        }
      >
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Choose a strong password"
            className="w-full px-4 py-3 pr-11 rounded-xl border-[2.5px] border-border bg-card focus:outline-none focus:border-primary transition text-sm"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {showPw ? <LuEyeOff size={16} /> : <LuEye size={16} />}
          </button>
        </div>
      </Field>

      {/* Secret questions */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShowQuestions((v) => !v)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          <LuShieldCheck size={14} />
          Add recovery questions (optional, up to 5)
        </button>

        <AnimatePresence initial={false}>
          {showQuestions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-2">
                <AnimatePresence initial={false}>
                  {questions.map((q, i) => (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, y: -6, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -6, height: 0 }}
                      transition={{ duration: 0.18 }}
                      className="rounded-xl border-[2px] border-border bg-muted/20 p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-muted-foreground">
                          Question {i + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeQuestion(q.id)}
                          className="text-muted-foreground hover:text-destructive cursor-pointer"
                          aria-label="Remove question"
                        >
                          <LuTrash2 size={14} />
                        </button>
                      </div>
                      <input
                        value={q.question}
                        onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
                        placeholder="e.g. What was your first pet's name?"
                        className="w-full px-3 py-2 rounded-lg border-2 border-border bg-card text-sm focus:outline-none focus:border-primary mb-2"
                      />
                      <input
                        value={q.answer}
                        onChange={(e) => updateQuestion(q.id, { answer: e.target.value })}
                        placeholder="Your answer"
                        className="w-full px-3 py-2 rounded-lg border-2 border-border bg-card text-sm focus:outline-none focus:border-primary"
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {questions.length < 5 && (
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="w-full px-3 py-2.5 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <LuPlus size={14} /> Add question ({questions.length}/5)
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-5">
        <PrimaryButton onClick={submit} loading={submitting}>
          {submitting ? "Creating..." : "Create Account"}
        </PrimaryButton>
      </div>
    </motion.div>
  );
}

/* -------------------------------- anon sign in -------------------------------- */

function AnonSignInStep({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const setProfile = useAccountStore((s) => s.setProfile);
  const setAnonId = useAccountStore((s) => s.setAnonId);

  const submit = async () => {
    if (!id.trim()) {
      toast.error("Enter your anonymous ID");
      return;
    }
    setSubmitting(true);
    const r = await callAuthEdge("anon-signin", {
      anonId: id.trim().toLowerCase(),
      password: pw || undefined,
    });
    setSubmitting(false);
    if (r.error || !r.profile) {
      toast.error(r.error || "Could not sign in");
      return;
    }
    setProfile(r.profile);
    setAnonId(r.profile.public_id);
    toast.success(`Welcome back, ${r.profile.public_id}`);
    onClose();
  };
  void submitting;

  return (
    <motion.div {...stepMotion}>
      <BackHeader onBack={onBack} title="Sign In with ID" />
      <p className="text-sm text-muted-foreground mb-4">Enter your anonymous ID and password.</p>

      <Field label="Anonymous ID">
        <input
          value={id}
          onChange={(e) => setId(e.target.value.trim())}
          placeholder="anon-xxxxxxxx"
          className="w-full px-4 py-3 rounded-xl border-[2.5px] border-border bg-card focus:outline-none focus:border-primary transition text-sm font-mono"
        />
      </Field>

      <Field label="Password">
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Your password"
            className="w-full px-4 py-3 pr-11 rounded-xl border-[2.5px] border-border bg-card focus:outline-none focus:border-primary transition text-sm"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {showPw ? <LuEyeOff size={16} /> : <LuEye size={16} />}
          </button>
        </div>
      </Field>

      <div className="mt-5">
        <PrimaryButton onClick={submit} loading={submitting}>
          {submitting ? "Signing in..." : "Sign In"}
        </PrimaryButton>
      </div>

      <button
        type="button"
        onClick={() => toast("Recovery flow coming soon")}
        className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground transition cursor-pointer"
      >
        Forgot password? Recover with secret questions
      </button>
    </motion.div>
  );
}

/* -------------------------------- success / download -------------------------------- */

function AnonSuccessStep({ onClose }: { onClose: () => void }) {
  const profile = useAccountStore((s) => s.profile);
  const [copied, setCopied] = useState(false);

  if (!profile || profile.account_type !== "anonymous") return null;
  const anonId = profile.public_id;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(anonId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const downloadPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    // background tint
    doc.setFillColor(255, 240, 240);
    doc.rect(0, 0, W, H, "F");

    // border card
    doc.setDrawColor(40, 30, 30);
    doc.setLineWidth(2);
    doc.roundedRect(40, 60, W - 80, H - 120, 18, 18, "S");

    // title
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 30, 30);
    doc.setFontSize(28);
    doc.text("Your Anonymous ID", W / 2, 130, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(110, 95, 95);
    doc.text("Keep this safe. It is the only way to recover your account.", W / 2, 160, {
      align: "center",
    });

    // ID box
    doc.setDrawColor(220, 90, 100);
    doc.setLineWidth(2.5);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(80, 220, W - 160, 90, 14, 14, "FD");

    doc.setFont("courier", "bold");
    doc.setTextColor(40, 30, 30);
    doc.setFontSize(32);
    doc.text(anonId, W / 2, 275, { align: "center" });

    // warning
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(180, 50, 60);
    doc.text("⚠  Warning", W / 2, 360, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(80, 70, 70);
    const lines = doc.splitTextToSize(
      "If you lose this ID and your password, your account and all its progress may be IMPOSSIBLE to recover. There is no email on file. Store this PDF somewhere safe — print it, save it to a password manager, or email it to yourself.",
      W - 160,
    );
    doc.text(lines, W / 2, 385, { align: "center" });

    // footer
    doc.setFontSize(10);
    doc.setTextColor(150, 130, 130);
    doc.text(`Generated ${new Date().toLocaleString()}`, W / 2, H - 80, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.text("MCkew", W / 2, H - 60, { align: "center" });

    doc.save(`${anonId}.pdf`);
    toast.success("PDF downloaded");
  };

  return (
    <motion.div {...stepMotion}>
      <div className="text-center mb-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          className="w-16 h-16 mx-auto rounded-full bg-primary/15 flex items-center justify-center text-primary mb-3"
        >
          <LuCheck size={30} />
        </motion.div>
        <h2 className="text-2xl font-bold">You're in!</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Save your anonymous ID. You'll need it to sign in again.
        </p>
      </div>

      <div className="rounded-2xl border-[2.5px] border-primary bg-primary/5 p-4 mb-4">
        <div className="text-[11px] uppercase font-bold tracking-wide text-muted-foreground mb-1">
          Anonymous ID
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 font-mono text-lg font-bold truncate">{anonId}</code>
          <button
            type="button"
            onClick={copy}
            className="w-9 h-9 rounded-lg border-2 border-border bg-card hover:border-primary transition flex items-center justify-center cursor-pointer"
            aria-label="Copy ID"
          >
            {copied ? <LuCheck size={14} className="text-primary" /> : <LuCopy size={14} />}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-3 mb-4 flex gap-2">
        <LuTriangleAlert size={18} className="text-destructive shrink-0 mt-0.5" />
        <p className="text-xs text-foreground leading-relaxed">
          <span className="font-bold">Don't lose this ID.</span> Without it, your account and
          progress are likely <span className="font-bold">unrecoverable</span>. Download the PDF and
          keep it somewhere safe.
        </p>
      </div>

      <PrimaryButton onClick={downloadPdf}>
        <LuDownload size={16} /> Download my ID as PDF
      </PrimaryButton>

      <button
        type="button"
        onClick={onClose}
        className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-foreground transition cursor-pointer py-2"
      >
        I've saved it — close
      </button>
    </motion.div>
  );
}

/* -------------------------------- shared bits -------------------------------- */

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-bold mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function PrimaryButton({
  onClick,
  children,
  className,
  loading = false,
  disabled = false,
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "w-full px-5 py-3.5 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed",
        className,
      )}
    >
      {loading ? <LuLoader size={16} className="animate-spin" /> : null}
      {children}
    </motion.button>
  );
}

function IconBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-7 h-7 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition cursor-pointer flex items-center justify-center shrink-0"
    >
      {children}
    </button>
  );
}
