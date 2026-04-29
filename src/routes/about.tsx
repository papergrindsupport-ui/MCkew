import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpenText,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Rocket,
  Heart,
  Code2,
  Github,
  Twitter,
  Linkedin,
  Instagram,
  Mail,
  Phone,
  MessageCircle,
  Send,
  CheckCircle2,
  History,
  Users,
  Plus,
  Lightbulb,
  Wand2,
  Smile,
  PartyPopper,
  Star,
  Coffee,
  Music,
  Gamepad2,
  BookOpen,
  Zap,
  ArrowRight,
  Bug,
  Handshake,
  X,
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from "framer-motion";
import { z } from "zod";
import toast from "react-hot-toast";
import { getDeviceId } from "@/lib/deviceId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import ContactSection from "@/components/ContactSection";

import storySpark from "@/assets/story-spark.svg";
import storyBuild from "@/assets/story-build.svg";
import storyLaunch from "@/assets/story-launch.svg";
import storyFuture from "@/assets/story-future.svg";
import salahAvatar from "@/assets/salah-avatar.png";

// ---------- Salah's info ----------
const DEV = {
  name: "Salah",
  tagline: "Builder of Smart Solve · Student-first software craftsperson",
  shortBio:
    "I build tools I wish I had as a student — focused, joyful, and a little weird in the best way. " +
    "When I'm not shipping features, I'm probably reading, brewing coffee, or chasing a tricky bug.",
  longBio: [
    "I started coding because I wanted to fix things — small frustrations in apps I used every day. That curiosity grew into a craft, and the craft grew into Smart Solve.",
    "Studying for exams should feel like leveling up, not grinding. So I started building the platform I wished existed: clear mark schemes, smart marking, collaboration that actually feels human.",
    "Off-screen, I'm fueled by coffee, sci-fi novels, and music with too many synths. I tinker with retro games, take long walks to think through problems, and keep a running list of ideas that's far too long.",
    "If you've used Smart Solve, sent feedback, or just said hi — thank you. You're the reason I keep building. This whole thing is a love letter to curious students everywhere.",
  ],
  funFacts: [
    { Icon: Coffee, label: "Coffees today: 3" },
    { Icon: Music, label: "On repeat: lo-fi" },
    { Icon: Gamepad2, label: "Playing: indie roguelikes" },
    { Icon: BookOpen, label: "Reading: sci-fi" },
  ],
  email: "hello@example.com",
  whatsapp: "+10000000000",
  phoneDisplay: "+1 (000) 000-0000",
  socials: [
    { label: "GitHub", href: "https://github.com/yourhandle", Icon: Github },
    { label: "Twitter", href: "https://twitter.com/yourhandle", Icon: Twitter },
    { label: "LinkedIn", href: "https://linkedin.com/in/yourhandle", Icon: Linkedin },
    { label: "Instagram", href: "https://instagram.com/yourhandle", Icon: Instagram },
  ],
};

const STORY_SECTIONS = [
  {
    id: "spark",
    eyebrow: "Chapter 01",
    title: "The Spark",
    body:
      "It started with a frustration: studying for exams felt lonely, scattered, and slow. " +
      "Past papers buried in PDFs. Mark schemes that read like riddles. There had to be a better way.",
    Icon: Sparkles,
    image: storySpark,
  },
  {
    id: "build",
    eyebrow: "Chapter 02",
    title: "The Build",
    body:
      "Late nights, too much coffee, and a stubborn belief that students deserve software that respects them. " +
      "Smart Solve grew from a weekend prototype into a full study platform — one feature at a time.",
    Icon: Code2,
    image: storyBuild,
  },
  {
    id: "launch",
    eyebrow: "Chapter 03",
    title: "The Launch",
    body:
      'The first user. Then ten. Then hundreds. Every message, every bug report, every "this helped me" ' +
      "made it real. Smart Solve isn't mine anymore — it's ours.",
    Icon: Rocket,
    image: storyLaunch,
  },
  {
    id: "future",
    eyebrow: "Chapter 04",
    title: "The Future",
    body:
      "We're just getting started. Smarter marking, kinder collaboration, tools that adapt to how you learn. " +
      "If you're reading this — thank you. You're part of the story now.",
    Icon: Heart,
    image: storyFuture,
  },
];

interface VolunteerSocial {
  label: string;
  href: string;
  Icon: any;
}
const VOLUNTEERS: Array<{
  id: string;
  name: string;
  bio: string;
  joined: string;
  tags: string[];
  color: string;
  socials: VolunteerSocial[];
}> = [
  {
    id: "1",
    name: "Aisha Khan",
    bio: "Past paper archaeologist. Loves chemistry diagrams and tidy mark schemes. Spends weekends digitizing old exam booklets and arguing about the right way to balance equations.",
    joined: "2024-09-01",
    tags: ["Chemistry", "Extractor", "Detail-oriented"],
    color: "hsl(345,72%,60%)",
    socials: [
      { label: "Twitter", href: "https://twitter.com/aishak", Icon: Twitter },
      { label: "GitHub", href: "https://github.com/aishak", Icon: Github },
    ],
  },
  {
    id: "2",
    name: "Marcus Lee",
    bio: "Bio nerd turned community moderator. Keeps the Discord warm and the question forum tidy. Will absolutely roast you for skipping practice questions.",
    joined: "2024-10-12",
    tags: ["Biology", "Community", "Moderation"],
    color: "hsl(160,65%,45%)",
    socials: [
      { label: "LinkedIn", href: "https://linkedin.com/in/marcuslee", Icon: Linkedin },
      { label: "Instagram", href: "https://instagram.com/marcusl", Icon: Instagram },
    ],
  },
  {
    id: "3",
    name: "Priya Sharma",
    bio: "Physics whisperer. Translates dense mark schemes into language a tired student can actually understand. Believes every mistake is a chance to learn.",
    joined: "2024-11-05",
    tags: ["Physics", "Tutoring", "Mentor"],
    color: "hsl(220,75%,60%)",
    socials: [
      { label: "Email", href: "mailto:priya@example.com", Icon: Mail },
      { label: "Twitter", href: "https://twitter.com/priyas", Icon: Twitter },
    ],
  },
  {
    id: "4",
    name: "Tom Becker",
    bio: "Designer-developer hybrid. Built half the icons you see on the site and refuses to let any button be ugly. Has strong opinions about kerning.",
    joined: "2025-01-18",
    tags: ["Design", "UI", "Accessibility"],
    color: "hsl(280,60%,60%)",
    socials: [
      { label: "GitHub", href: "https://github.com/tombecker", Icon: Github },
      { label: "LinkedIn", href: "https://linkedin.com/in/tombecker", Icon: Linkedin },
    ],
  },
  {
    id: "5",
    name: "Zara Ali",
    bio: "Accessibility champion. Tests every flow with a screen reader and writes alt text like poetry. Makes sure no one is left out of the study party.",
    joined: "2025-02-22",
    tags: ["A11y", "Testing", "QA"],
    color: "hsl(30,80%,55%)",
    socials: [{ label: "Twitter", href: "https://twitter.com/zaraa", Icon: Twitter }],
  },
  {
    id: "6",
    name: "Diego Rivera",
    bio: "Translator extraordinaire. Localized Smart Solve into three languages and counting. Drinks more coffee than physically advisable.",
    joined: "2025-03-10",
    tags: ["Translation", "Languages", "Coffee"],
    color: "hsl(190,70%,50%)",
    socials: [
      { label: "Instagram", href: "https://instagram.com/diegor", Icon: Instagram },
      { label: "Email", href: "mailto:diego@example.com", Icon: Mail },
    ],
  },
];

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
  sender_name: z.string().trim().max(200, "Name too long").optional().or(z.literal("")),
  sender_email: z.string().trim().email("Invalid email").max(320).optional().or(z.literal("")),
  subject: z.string().trim().max(300, "Subject too long").optional().or(z.literal("")),
  message_type: z.string().min(1).max(50),
  message: z
    .string()
    .trim()
    .min(5, "Message must be at least 5 characters")
    .max(5000, "Message too long"),
});

interface ContactMessageRow {
  id: string;
  device_id: string;
  sender_name: string | null;
  sender_email: string | null;
  message_type: string;
  subject: string | null;
  message: string;
  status: string;
  created_at: string;
}

const STORY_READ_KEY = "about_story_read_v1";

// ===================================================
// Page
// ===================================================
export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — MCkew" },
      {
        name: "description",
        content: "Meet the story, developer, volunteers, and contact options behind MCkew.",
      },
    ],
  }),
  component: About,
});

function About() {
  const [storyOpen, setStoryOpen] = useState(false);
  const [hasReadStory, setHasReadStory] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(STORY_READ_KEY) === "1";
  });
  const [scrollPrompt, setScrollPrompt] = useState(false);
  const { scrollYProgress } = useScroll();
  const progressX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  // Block scroll until story is opened (only first time, skippable)
  useEffect(() => {
    if (hasReadStory) return;

    let active = true;
    const blockEvent = (e: Event) => {
      if (!active) return;
      e.preventDefault();
      setScrollPrompt(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if (!active) return;
      const blockedKeys = [
        "ArrowDown",
        "ArrowUp",
        "PageDown",
        "PageUp",
        "Space",
        " ",
        "End",
        "Home",
      ];
      if (blockedKeys.includes(e.key)) {
        e.preventDefault();
        setScrollPrompt(true);
      }
    };

    window.addEventListener("wheel", blockEvent, { passive: false });
    window.addEventListener("touchmove", blockEvent, { passive: false });
    window.addEventListener("keydown", onKey);

    return () => {
      active = false;
      window.removeEventListener("wheel", blockEvent);
      window.removeEventListener("touchmove", blockEvent);
      window.removeEventListener("keydown", onKey);
    };
  }, [hasReadStory]);

  function markStoryRead() {
    setHasReadStory(true);
    try {
      localStorage.setItem(STORY_READ_KEY, "1");
    } catch {}
  }

  function handleStoryToggle() {
    if (!storyOpen) {
      setStoryOpen(true);
      markStoryRead();
      setScrollPrompt(false);
      // scroll to first chapter after expansion settles
      setTimeout(() => {
        document.getElementById("spark")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 350);
    }
  }

  function skipStory() {
    markStoryRead();
    setScrollPrompt(false);
  }

  // Easter egg: konami code
  const [easter, setEaster] = useState(false);
  useEffect(() => {
    const seq = [
      "ArrowUp",
      "ArrowUp",
      "ArrowDown",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "ArrowLeft",
      "ArrowRight",
      "b",
      "a",
    ];
    let idx = 0;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === seq[idx]) {
        idx++;
        if (idx === seq.length) {
          setEaster(true);
          idx = 0;
          toast.success("Konami unlocked! Confetti mode engaged.", { icon: "🎉" });
        }
      } else {
        idx = k === seq[0] ? 1 : 0;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Animated background blobs (subtle) */}
      <AnimatedBlobs />

      {/* Reading progress bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-primary z-50 origin-left"
        style={{ scaleX: progressX }}
      />

      <Link
        to="/"
        className="fixed top-4 left-4 z-50 inline-flex items-center gap-2 rounded-full bg-card/80 backdrop-blur px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground border border-border shadow-sm transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      {easter && <ConfettiBurst />}

      {/* Intro / collapsed story trigger */}
      <IntroHero storyOpen={storyOpen} onOpen={handleStoryToggle} />

      {/* Story (read-more / read-less) */}
      <AnimatePresence initial={false}>
        {storyOpen && (
          <motion.div
            key="story"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="relative">
              {STORY_SECTIONS.map((s, i) => (
                <ParallaxStorySection key={s.id} section={s} index={i} />
              ))}

              {/* Collapse button — only one */}
              <div className="flex justify-center pb-16">
                <motion.button
                  onClick={() => {
                    setStoryOpen(false);
                    requestAnimationFrame(() => {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    });
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96 }}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-primary-foreground font-bold shadow-lg hover:shadow-xl transition-shadow"
                >
                  <Smile className="w-5 h-5" />
                  Great story
                  <ChevronUp className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Below: always visible */}
      <MeetDeveloper />
      <ContactSection />
      <VolunteersSection />

      <footer className="relative py-12 text-center text-sm text-muted-foreground">
        <p className="inline-flex items-center gap-1.5">
          Made with <Heart className="inline w-4 h-4 text-primary fill-primary" /> for curious
          minds.
        </p>
      </footer>

      {/* Scroll-block prompt */}
      <AnimatePresence>
        {scrollPrompt && !hasReadStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-background/70 backdrop-blur-sm flex items-center justify-center px-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="relative max-w-md w-full rounded-3xl bg-card border border-border p-8 shadow-2xl text-center"
            >
              <button
                onClick={() => setScrollPrompt(false)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="inline-flex w-14 h-14 rounded-2xl bg-primary/10 items-center justify-center mb-4">
                <BookOpenText className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Don't you want to read our story first?</h3>
              <p className="text-muted-foreground mb-6">
                It's a short read — and it's the best way to get to know us.
              </p>
              <div className="flex gap-3 justify-center flex-wrap">
                <Button onClick={handleStoryToggle} size="lg" className="rounded-full">
                  <BookOpenText className="w-4 h-4 mr-2" /> Read our story
                </Button>
                <Button onClick={skipStory} variant="outline" size="lg" className="rounded-full">
                  Skip for now
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------
// Animated background blobs (subtle)
// ---------------------------------------------------
function AnimatedBlobs() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
      <motion.div
        className="absolute top-[10%] left-[15%] w-[28rem] h-[28rem] rounded-full bg-primary/10 blur-3xl"
        animate={{ x: [0, 80, -40, 0], y: [0, -60, 40, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-[45%] right-[10%] w-[24rem] h-[24rem] rounded-full bg-accent/15 blur-3xl"
        animate={{ x: [0, -70, 30, 0], y: [0, 50, -30, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[5%] left-[40%] w-[30rem] h-[30rem] rounded-full bg-primary/8 blur-3xl"
        animate={{ x: [0, 50, -50, 0], y: [0, -40, 30, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

// ---------------------------------------------------
// Intro hero with read-more toggle
// ---------------------------------------------------
function IntroHero({ storyOpen, onOpen }: { storyOpen: boolean; onOpen: () => void }) {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center px-6 pt-24 pb-16">
      <div className="text-center max-w-2xl">
        <motion.div
          initial={{ scale: 0, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
          whileHover={{ rotate: 8, scale: 1.08 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 mb-6 cursor-pointer"
        >
          <BookOpenText className="w-10 h-10 text-primary" />
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-5xl sm:text-6xl font-bold tracking-tight mb-4"
        >
          Every great tool has a story.
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-lg text-muted-foreground mb-10"
        >
          Pull up a chair. Here's ours — how Smart Solve started, who's behind it, and where it's
          going.
        </motion.p>

        {!storyOpen && (
          <motion.button
            onClick={onOpen}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="group inline-flex items-center gap-3 rounded-full bg-primary px-8 py-4 text-primary-foreground font-bold text-lg shadow-xl shadow-primary/30 hover:shadow-primary/50 transition-shadow"
          >
            Read our story
            <motion.span
              animate={{ y: [0, 4, 0] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            >
              <ChevronDown className="w-5 h-5" />
            </motion.span>
          </motion.button>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------
// Parallax story section — image only, parallax chapter eyebrow
// ---------------------------------------------------
function ParallaxStorySection({
  section,
  index,
}: {
  section: (typeof STORY_SECTIONS)[number];
  index: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const yImage = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  const yText = useTransform(scrollYProgress, [0, 1], ["10%", "-10%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [0.2, 1, 1, 0.2]);
  // Eyebrow grows when section is centered in viewport
  const eyebrowScaleRaw = useTransform(scrollYProgress, [0.25, 0.5, 0.75], [1, 1.35, 1]);
  const eyebrowScale = useSpring(eyebrowScaleRaw, { stiffness: 150, damping: 20 });
  const Icon = section.Icon;
  const reverse = index % 2 === 1;

  return (
    <section
      id={section.id}
      ref={ref}
      className="relative min-h-screen flex items-center justify-center overflow-hidden py-24"
    >
      <motion.div
        style={{ y: yText, opacity }}
        className={`relative z-10 max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}
      >
        {/* Image only — no border, no card, no overlay */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          className="relative aspect-square max-w-md mx-auto w-full"
        >
          <motion.img
            src={section.image}
            alt={section.title}
            loading="lazy"
            style={{ y: yImage }}
            className="w-full h-full object-contain drop-shadow-xl"
          />
        </motion.div>

        {/* Text */}
        <div>
          <motion.p
            style={{ scale: eyebrowScale, transformOrigin: "left center" }}
            className="text-sm font-mono uppercase tracking-widest text-primary mb-3 inline-flex items-center gap-2"
          >
            <Icon className="w-4 h-4" />
            {section.eyebrow}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-6xl font-bold tracking-tight mb-6"
          >
            {section.title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-lg md:text-xl text-muted-foreground leading-relaxed"
          >
            {section.body}
          </motion.p>
        </div>
      </motion.div>
    </section>
  );
}

// ---------------------------------------------------
// Meet the developer (with more-about-me read-more)
// ---------------------------------------------------
function MeetDeveloper() {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          className="text-center mb-16"
        >
          <p className="text-sm font-mono uppercase tracking-widest text-primary mb-3 inline-flex items-center gap-2 justify-center">
            <Star className="w-4 h-4" /> Meet the developer
          </p>
          <h2 className="text-5xl md:text-6xl font-bold flex items-center gap-3 flex-wrap justify-center">
            <span>
              Hi, I'm <span className="text-primary">{DEV.name}</span>
            </span>
            <motion.span
              animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.6 }}
              className="inline-flex origin-bottom-right"
            >
              <Smile className="w-10 h-10 md:w-12 md:h-12 text-primary" />
            </motion.span>
          </h2>
          <p className="text-xl text-muted-foreground mt-4">{DEV.tagline}</p>
        </motion.div>

        <div className="grid md:grid-cols-[1fr_2fr] gap-10 items-center">
          {/* Avatar — Salah's real picture */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            whileHover={{ rotate: -3, scale: 1.04 }}
            transition={{ type: "spring", stiffness: 180, damping: 14 }}
            className="relative mx-auto"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-3 rounded-full border-2 border-dashed border-primary/40"
            />
            <div className="relative w-56 h-56 rounded-full overflow-hidden border-4 border-border shadow-2xl bg-card">
              <img
                src={salahAvatar}
                alt={DEV.name}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
            {/* floating mini icons */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center"
            >
              <Coffee className="w-5 h-5 text-primary" />
            </motion.div>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute -bottom-1 -left-3 w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center"
            >
              <Code2 className="w-5 h-5 text-primary" />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
          >
            <p className="text-lg leading-relaxed text-muted-foreground mb-5">{DEV.shortBio}</p>

            {/* fun facts */}
            <div className="flex flex-wrap gap-2 mb-6">
              {DEV.funFacts.map(({ Icon, label }) => (
                <motion.span
                  key={label}
                  whileHover={{ y: -2, scale: 1.05 }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border px-3 py-1.5 text-xs font-medium"
                >
                  <Icon className="w-3.5 h-3.5 text-primary" />
                  {label}
                </motion.span>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 mb-5">
              {DEV.socials.map(({ label, href, Icon }) => (
                <motion.a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ y: -3, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-5 py-2.5 text-sm font-semibold hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </motion.a>
              ))}
            </div>

            <button
              onClick={() => setMoreOpen((o) => !o)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline underline-offset-4"
            >
              {moreOpen ? "Show less about me" : "More about me"}
              {moreOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <AnimatePresence initial={false}>
              {moreOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-5 space-y-4 text-muted-foreground leading-relaxed border-l-2 border-primary/40 pl-5">
                    {DEV.longBio.map((para, i) => (
                      <motion.p
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                      >
                        {para}
                      </motion.p>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ContactSection now lives in src/components/ContactSection.tsx

// ---------------------------------------------------
// Volunteers — carousel of avatar circles
// ---------------------------------------------------
function VolunteersSection() {
  const [selected, setSelected] = useState<(typeof VOLUNTEERS)[number] | null>(null);

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          className="text-center mb-12"
        >
          <p className="text-sm font-mono uppercase tracking-widest text-primary mb-3 inline-flex items-center gap-2 justify-center">
            <Users className="w-4 h-4" /> Our volunteers
          </p>
          <h2 className="text-5xl md:text-6xl font-bold">The people behind it.</h2>
          <p className="text-muted-foreground mt-4">Tap a circle to meet them.</p>
        </motion.div>

        {VOLUNTEERS.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="rounded-3xl border-2 border-dashed border-border p-12 text-center bg-card/30"
          >
            <div className="inline-flex w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Be the first volunteer</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              We're just getting started. Want to help shape Smart Solve?
            </p>
            <Link to="/volunteer">
              <Button size="lg" className="rounded-full">
                You can volunteer by clicking here <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </motion.div>
        ) : (
          <div className="px-12">
            <Carousel opts={{ align: "start", loop: true }} className="w-full">
              <CarouselContent className="-ml-4">
                {VOLUNTEERS.map((v, i) => (
                  <CarouselItem
                    key={v.id}
                    className="pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5"
                  >
                    <motion.button
                      onClick={() => setSelected(v)}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.04 }}
                      whileHover={{ y: -6, scale: 1.05 }}
                      whileTap={{ scale: 0.96 }}
                      className="flex flex-col items-center gap-3 group w-full py-2"
                    >
                      <div className="relative">
                        <motion.div
                          className="absolute -inset-1.5 rounded-full border-2 border-dashed border-primary/0 group-hover:border-primary/50 transition-colors"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                        />
                        <div
                          className="relative w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg group-hover:shadow-2xl transition-shadow border-4 border-background"
                          style={{ background: v.color }}
                        >
                          {v.name
                            .split(" ")
                            .map((p) => p[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-center">{v.name}</span>
                      {v.socials.length > 0 && (
                        <div className="flex gap-1.5">
                          {v.socials.slice(0, 3).map(({ Icon, label }) => (
                            <span
                              key={label}
                              className="w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground"
                              aria-label={label}
                            >
                              <Icon className="w-3 h-3" />
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.button>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex flex-col items-center gap-3 pt-2">
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 14 }}
                    className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-xl"
                    style={{ background: selected.color }}
                  >
                    {selected.name
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)}
                  </motion.div>
                  <DialogTitle className="text-2xl">{selected.name}</DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    Joined{" "}
                    {new Date(selected.joined).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                    })}
                  </p>
                </div>
              </DialogHeader>
              <p className="text-sm text-muted-foreground text-center leading-relaxed">
                {selected.bio}
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {selected.tags.map((t, i) => (
                  <span
                    key={t}
                    className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white"
                    style={{ background: `hsl(${(i * 67) % 360}, 65%, 55%)` }}
                  >
                    {t}
                  </span>
                ))}
              </div>
              {selected.socials.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 pt-3">
                  {selected.socials.map(({ label, href, Icon }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border px-3 py-1.5 text-xs font-semibold hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

// ---------------------------------------------------
// Easter egg confetti
// ---------------------------------------------------
function ConfettiBurst() {
  const pieces = Array.from({ length: 80 });
  return (
    <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.6;
        const duration = 2.5 + Math.random() * 2;
        const hue = Math.floor(Math.random() * 360);
        const size = 6 + Math.random() * 10;
        return (
          <motion.span
            key={i}
            initial={{ y: -40, opacity: 1, rotate: 0 }}
            animate={{ y: "110vh", opacity: 0, rotate: 720 }}
            transition={{ duration, delay, ease: "easeIn" }}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: 0,
              width: size,
              height: size,
              background: `hsl(${hue},80%,60%)`,
              borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            }}
          />
        );
      })}
    </div>
  );
}
