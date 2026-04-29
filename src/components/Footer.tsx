import { motion } from "framer-motion";
import { Pencil, Heart } from "@/lib/icons";
import { useVibeStore } from "@/stores/useVibeStore";
import { Link } from "@tanstack/react-router";

export default function Footer() {
  const isBoring = useVibeStore((s) => s.vibe) === "boring";
  return (
    <motion.footer
      className="border-t-[2.5px] border-border py-8 sm:py-10 text-center bg-primary/15 px-4"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      <motion.div
        className="flex items-center justify-center gap-2 text-lg sm:text-xl font-bold text-foreground mb-2"
        whileHover={isBoring ? undefined : { scale: 1.05 }}
      >
        <Pencil size={20} className="text-primary sm:w-6 sm:h-6" />
        MCkew
      </motion.div>
      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm font-semibold text-muted-foreground mb-4">
        <Link to="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <Link to="/about" className="hover:text-foreground transition-colors">
          About
        </Link>
        <Link to="/smart-solve-papers" className="hover:text-foreground transition-colors">
          Papers
        </Link>
        <Link to="/smart-solve-bio" className="hover:text-foreground transition-colors">
          Biology
        </Link>
        <Link to="/smart-solve-chem" className="hover:text-foreground transition-colors">
          Chemistry
        </Link>
        <Link to="/smart-solve-phys" className="hover:text-foreground transition-colors">
          Physics
        </Link>
        <Link to="/smart-solve-all" className="hover:text-foreground transition-colors">
          All Subjects
        </Link>
        <Link to="/volunteer" className="hover:text-foreground transition-colors">
          Volunteer
        </Link>
        <Link to="/feedback" className="hover:text-foreground transition-colors">
          Feedback
        </Link>
        <Link to="/help" className="hover:text-foreground transition-colors">
          Help
        </Link>
      </nav>
      <p className="text-muted-foreground flex items-center justify-center gap-1 text-sm sm:text-base">
        Made with <Heart size={14} className="text-primary" fill="currentColor" /> for IGCSE
        students & teachers. © 2025
      </p>
    </motion.footer>
  );
}
