import { motion } from "framer-motion";
import { Quote } from "@/lib/icons";
import { useVibeStore } from "@/stores/useVibeStore";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function TestimonialSection() {
  const isBoring = useVibeStore((s) => s.vibe) === "boring";
  return (
    <section className="py-10 sm:py-14 px-4 max-w-4xl mx-auto">
      <motion.div
        className="bg-primary rounded-2xl border-[2.5px] border-border p-6 sm:p-10 md:p-14 text-center relative overflow-hidden"
        initial={{ opacity: 0, scale: isBoring ? 1 : 0.92, y: 30 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true }}
        whileHover={isBoring ? undefined : { scale: 1.02 }}
        transition={isBoring ? { duration: 0.2 } : { type: "spring", stiffness: 180 }}
      >
        <div className="absolute top-4 left-6 text-primary-foreground/20">
          <Quote size={isBoring ? 36 : 48} />
        </div>
        <motion.p
          className="text-lg sm:text-xl md:text-2xl font-bold italic text-primary-foreground mb-4 sm:mb-5 relative z-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          "MCkew turned my exam revision from a chore into a fun game. I actually look forward to
          doing paper 2 now — my grades went up two levels!"
        </motion.p>
        <TooltipProvider delayDuration={120}>
          <motion.p
            className="font-bold text-primary-foreground/80 relative z-10 text-sm sm:text-base"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            — Salah Y., founder of MCkew{" "}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help underline decoration-dotted underline-offset-2">/s</span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">
                /s MEANS SARCASM but try the site it&apos;s good
              </TooltipContent>
            </Tooltip>
          </motion.p>
        </TooltipProvider>
      </motion.div>
    </section>
  );
}
