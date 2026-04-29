import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Mail,
  Phone,
  Send,
  CheckCircle2,
  History,
  Sparkles,
  PartyPopper,
  Wand2,
  Bug,
  Lightbulb,
  Handshake,
  Loader2,
} from "lucide-react";
import { z } from "zod";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApi } from "@/integrations/account/useApi";
import { sendResendFormEmail } from "@/lib/resendEmail";

interface ContactMessageRow {
  id: string;
  sender_name: string | null;
  sender_email: string | null;
  message_type: string;
  subject: string | null;
  message: string;
  status: string;
  created_at: string;
}

type MsgTypeCopy = {
  value: string;
  label: string;
  Icon: any;
  textareaPlaceholder: string;
  emptyHint: string;
  messageLabel: string;
  successTitle: string;
  successSub: string;
};

const MESSAGE_TYPES: MsgTypeCopy[] = [
  {
    value: "general",
    label: "General",
    Icon: MessageCircle,
    textareaPlaceholder: "Spill the tea — what's on your mind?",
    emptyHint: "Start typing — there's no wrong message.",
    messageLabel: "Your message",
    successTitle: "Message received!",
    successSub: "Thanks — I read every message personally.",
  },
  {
    value: "feedback",
    label: "Feedback",
    Icon: Sparkles,
    textareaPlaceholder: "What worked? What felt off? Be honest — I can take it.",
    emptyHint: "Every bit of feedback shapes what comes next.",
    messageLabel: "Your feedback",
    successTitle: "Feedback received!",
    successSub: "Thanks for taking the time — this is how Smart Solve gets better.",
  },
  {
    value: "bug",
    label: "Bug Report",
    Icon: Bug,
    textareaPlaceholder:
      "What broke? What were you doing? The more detail, the faster I can squash it.",
    emptyHint: "Steps to reproduce help a lot — but anything is welcome.",
    messageLabel: "What happened?",
    successTitle: "Bug logged!",
    successSub: "On the case — I'll chase this one down.",
  },
  {
    value: "feature",
    label: "Feature Idea",
    Icon: Lightbulb,
    textareaPlaceholder: "What would make Smart Solve perfect for you?",
    emptyHint: "Big or small — wild ideas welcome.",
    messageLabel: "Your idea",
    successTitle: "Idea received!",
    successSub: "Adding it to the wishlist — keep them coming.",
  },
  {
    value: "collab",
    label: "Collaboration",
    Icon: Handshake,
    textareaPlaceholder: "Tell me about you and what you'd love to build together.",
    emptyHint: "A bit about you and your idea goes a long way.",
    messageLabel: "Your pitch",
    successTitle: "Pitch received!",
    successSub: "Excited to read it — I'll be in touch soon.",
  },
  {
    value: "other",
    label: "Other",
    Icon: Wand2,
    textareaPlaceholder: "Whatever's on your mind — say it your way.",
    emptyHint: "No rules. Just write.",
    messageLabel: "Your note",
    successTitle: "Got it!",
    successSub: "Thanks for reaching out.",
  },
];

const messageSchema = z.object({
  sender_name: z.string().trim().max(200).optional().or(z.literal("")),
  sender_email: z.string().trim().email("Invalid email").max(320).optional().or(z.literal("")),
  subject: z.string().trim().max(300).optional().or(z.literal("")),
  message_type: z.string().min(1).max(50),
  message: z.string().trim().min(5, "Message must be at least 5 characters").max(5000),
});

const CONTACT = {
  email: "hello@example.com",
  whatsapp: "+10000000000",
  phoneDisplay: "+1 (000) 000-0000",
};

interface Props {
  heading?: string;
  eyebrow?: string;
  subheading?: string;
}

export default function ContactSection({
  heading = "Let's talk.",
  eyebrow = "Contact me",
  subheading = "That's our story — tell us about yours.",
}: Props) {
  const api = useApi();
  const [form, setForm] = useState({
    sender_name: "",
    sender_email: "",
    subject: "",
    message_type: "general",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<ContactMessageRow[]>([]);
  const [hasPastMessages, setHasPastMessages] = useState(false);

  // Map a backend feedback row to the local UI shape.
  function toRow(r: {
    id: string;
    name: string | null;
    email: string | null;
    category: string;
    message: string;
    status: string;
    created_at: string;
    metadata: Record<string, unknown>;
  }): ContactMessageRow {
    const subject = typeof r.metadata?.subject === "string" ? (r.metadata.subject as string) : null;
    return {
      id: r.id,
      sender_name: r.name,
      sender_email: r.email,
      message_type: r.category,
      subject,
      message: r.message,
      status: r.status,
      created_at: r.created_at,
    };
  }

  useEffect(() => {
    let cancelled = false;
    api
      .listMyFeedback()
      .then((res) => {
        if (cancelled) return;
        const rows = (res.data ?? []).map(toRow);
        setHistory(rows);
        setHasPastMessages(rows.length > 0);
      })
      .catch(() => {
        /* unauthenticated callers just see no history */
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const currentType = MESSAGE_TYPES.find((t) => t.value === form.message_type) ?? MESSAGE_TYPES[0];

  async function loadHistory() {
    try {
      const res = await api.listMyFeedback();
      setHistory((res.data ?? []).map(toRow));
    } catch {
      setHistory([]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = messageSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Please check the form");
      return;
    }
    setSubmitting(true);
    try {
      await api.submitFeedback({
        name: form.sender_name || undefined,
        email: form.sender_email || undefined,
        category: form.message_type,
        message: form.message,
        metadata: form.subject ? { subject: form.subject } : undefined,
      });
      void sendResendFormEmail({
        kind: "contact",
        source: form.message_type,
        submitterEmail: form.sender_email || undefined,
        submitterName: form.sender_name || undefined,
        subject: form.subject || undefined,
        summary: form.message,
      });
      setSent(true);
      setHasPastMessages(true);
      toast.success("Message received!");
    } catch (err) {
      const msg = (err as { error?: string })?.error ?? "Failed to send message";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setForm({
      sender_name: "",
      sender_email: "",
      subject: "",
      message_type: "general",
      message: "",
    });
    setSent(false);
  }

  const waLink = `https://wa.me/${CONTACT.whatsapp.replace(/[^\d]/g, "")}`;
  const mailLink = `mailto:${CONTACT.email}`;
  const messageLen = form.message.trim().length;
  const messageProgress = Math.min(100, (messageLen / 100) * 100);

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          className="text-center mb-3"
        >
          <p className="text-sm font-mono uppercase tracking-widest text-primary mb-3 inline-flex items-center gap-2 justify-center">
            <MessageCircle className="w-4 h-4" /> {eyebrow}
          </p>
          <h2 className="text-5xl md:text-6xl font-bold">{heading}</h2>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-lg md:text-xl text-muted-foreground mb-12 italic"
        >
          {subheading}
        </motion.p>

        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          <ContactChip
            Icon={MessageCircle}
            label="WhatsApp"
            sub={CONTACT.phoneDisplay}
            href={waLink}
          />
          <ContactChip Icon={Mail} label="Email" sub={CONTACT.email} href={mailLink} />
          <ContactChip
            Icon={Phone}
            label="Phone"
            sub={CONTACT.phoneDisplay}
            href={`tel:${CONTACT.whatsapp}`}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-3xl border border-border bg-card/60 backdrop-blur p-6 md:p-10 shadow-xl overflow-hidden"
        >
          <motion.div
            animate={{ rotate: [0, 8, -4, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <Wand2 className="w-9 h-9 text-primary" />
          </motion.div>

          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center py-8 relative"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                  transition={{ type: "spring", stiffness: 200, damping: 12 }}
                  className="inline-flex w-20 h-20 rounded-full bg-primary/15 items-center justify-center mb-4"
                >
                  <CheckCircle2 className="w-10 h-10 text-primary" />
                </motion.div>
                <h3 className="text-3xl font-bold mb-2 inline-flex items-center gap-2 justify-center">
                  {currentType.successTitle} <PartyPopper className="w-7 h-7 text-primary" />
                </h3>
                <p className="text-muted-foreground mb-6">{currentType.successSub}</p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <Button onClick={resetForm} size="lg">
                    Send another
                  </Button>
                  {hasPastMessages && (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => {
                        loadHistory();
                        setHistoryOpen(true);
                      }}
                    >
                      <History className="w-4 h-4 mr-2" /> View past messages
                    </Button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                onSubmit={handleSubmit}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div>
                  <Label className="mb-2 block">What kind of message?</Label>
                  <div className="-mx-2 px-2 overflow-x-auto">
                    <div className="flex gap-2 w-max pb-1">
                      {MESSAGE_TYPES.map((t) => {
                        const selected = form.message_type === t.value;
                        const Icon = t.Icon;
                        return (
                          <motion.button
                            key={t.value}
                            type="button"
                            onClick={() => setForm({ ...form, message_type: t.value })}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${
                              selected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card border-border hover:border-primary/50"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            {t.label}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <Label htmlFor="name">
                      Your name{" "}
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="name"
                      maxLength={200}
                      value={form.sender_name}
                      onChange={(e) => setForm({ ...form, sender_name: e.target.value })}
                      placeholder="What should I call you?"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">
                      Email <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      maxLength={320}
                      value={form.sender_email}
                      onChange={(e) => setForm({ ...form, sender_email: e.target.value })}
                      placeholder="If you'd like a reply"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="subject">
                    Subject <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="subject"
                    maxLength={300}
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="One-line headline for your message"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="message">{currentType.messageLabel}</Label>
                    <span className="text-xs text-muted-foreground">{messageLen}/5000</span>
                  </div>
                  <Textarea
                    id="message"
                    rows={6}
                    maxLength={5000}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder={currentType.textareaPlaceholder}
                    required
                  />
                  <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full bg-primary"
                      animate={{ width: `${messageProgress}%` }}
                      transition={{ type: "spring", stiffness: 120, damping: 20 }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 inline-flex items-center gap-1">
                    {messageLen === 0 && currentType.emptyHint}
                    {messageLen > 0 && messageLen < 5 && "Just a few more characters…"}
                    {messageLen >= 5 && messageLen < 100 && (
                      <>
                        <Sparkles className="w-3 h-3 text-primary" /> Looking good!
                      </>
                    )}
                    {messageLen >= 100 && (
                      <>
                        <PartyPopper className="w-3 h-3 text-primary" /> Now we're talking.
                      </>
                    )}
                  </p>
                </div>

                <div className="flex gap-3 flex-wrap pt-2">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 sm:flex-none"
                  >
                    <Button type="submit" size="lg" disabled={submitting} className="w-full">
                      {submitting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      {submitting ? "Sending…" : "Send message"}
                    </Button>
                  </motion.div>
                  {hasPastMessages && (
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => {
                        loadHistory();
                        setHistoryOpen(true);
                      }}
                    >
                      <History className="w-4 h-4 mr-2" /> My past messages
                    </Button>
                  )}
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Your past messages</DialogTitle>
          </DialogHeader>
          {history.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No messages yet — yours will show up here.
            </p>
          ) : (
            <ul className="space-y-3">
              {history.map((m) => {
                const t = MESSAGE_TYPES.find((x) => x.value === m.message_type);
                const TIcon = t?.Icon ?? MessageCircle;
                return (
                  <li key={m.id} className="rounded-2xl border border-border p-4 bg-card/50">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                        <TIcon className="w-3.5 h-3.5" />
                        {t?.label ?? m.message_type}
                      </span>
                      <span>·</span>
                      <span>{new Date(m.created_at).toLocaleString()}</span>
                      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 font-semibold uppercase">
                        {m.status}
                      </span>
                    </div>
                    {m.subject && <p className="font-semibold mb-1">{m.subject}</p>}
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{m.message}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ContactChip({
  Icon,
  label,
  sub,
  href,
}: {
  Icon: any;
  label: string;
  sub: string;
  href: string;
}) {
  return (
    <motion.a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel="noopener noreferrer"
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary hover:shadow-lg transition-all"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-xs text-muted-foreground truncate">{sub}</div>
      </div>
    </motion.a>
  );
}
