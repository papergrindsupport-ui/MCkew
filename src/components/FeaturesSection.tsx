import { motion } from "framer-motion";
import { FlaskConical, Dna, Atom, Gamepad2, type LucideIcon } from "@/lib/icons";
import { useVibeStore } from "@/stores/useVibeStore";

const features: { icon: LucideIcon; title: string; desc: string; bg: string }[] = [
  {
    icon: FlaskConical,
    title: "Chemistry Papers",
    desc: "Tackle IGCSE Chemistry past papers with instant smart marking.",
    bg: "bg-card-pink",
  },
  {
    icon: Dna,
    title: "Biology Papers",
    desc: "Solve Biology questions and get detailed feedback in seconds.",
    bg: "bg-card-blue",
  },
  {
    icon: Atom,
    title: "Physics Papers",
    desc: "Master Physics problem-solving with guided hints and solutions.",
    bg: "bg-card-green",
  },
  {
    icon: Gamepad2,
    title: "Gamified Challenges",
    desc: "Timed quizzes, streaks, and achievements make revision addictive.",
    bg: "bg-card-purple",
  },
];

const fun = {
  hidden: { opacity: 0, y: 50, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.12, type: "spring" as const, stiffness: 180, damping: 18 },
  }),
};
const pro = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.2 } }),
};

export default function FeaturesSection() {
  const isBoring = useVibeStore((s) => s.vibe) === "boring";
  return (
    <section id="features" className="py-10 sm:py-16 px-4 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.title}
              custom={i}
              variants={isBoring ? pro : fun}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              whileHover={
                isBoring ? { y: -2 } : { scale: 1.07, y: -10, rotate: i % 2 === 0 ? 2 : -2 }
              }
              transition={isBoring ? { duration: 0.15 } : { type: "spring", stiffness: 300 }}
              className={`${f.bg} rounded-2xl border-[2.5px] border-border p-6 sm:p-8 text-center`}
            >
              <div className="flex justify-center mb-4">
                <Icon size={36} className="text-foreground" strokeWidth={2.2} />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-foreground mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm sm:text-base">{f.desc}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
