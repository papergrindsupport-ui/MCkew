import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Pencil } from "@/lib/icons";
import { useVibeStore } from "@/stores/useVibeStore";
import { useUnlockStore } from "@/stores/useUnlockStore";
import { useProStore } from "@/stores/useProStore";
import { UnlockModal } from "@/components/payments/UnlockModal";
import { toast } from "sonner";

const plans = [
  {
    name: "Starter",
    price: "Free",
    features: ["2023–2026 papers", "All subjects", "Full analytics"],
    highlighted: false,
    cta: "Get Started",
  },
  {
    name: "Scholar",
    price: "$9.99",
    priceNote: "one-time",
    features: ["All years (2016–2026)", "ALL topics", "Full analytics", "Priority access"],
    highlighted: true,
    cta: "Unlock Now",
  },
  {
    name: "Supporter",
    price: "Donate",
    features: ["Support development", "Early access to features", "Community recognition"],
    highlighted: false,
    cta: "Donate",
  },
];

export default function PricingSection() {
  const isBoring = useVibeStore((s) => s.vibe) === "boring";
  const unlocked = useUnlockStore((s) => s.unlocked);
  const lockAll = useUnlockStore((s) => s.lockAll);
  const isPro = useProStore((s) => s.isPro);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const handleCta = (cta: string) => {
    if (cta === "Unlock Now") {
      setUnlockOpen(true);
    }
  };
  return (
    <section id="pricing" className="py-10 sm:py-16 px-4 max-w-5xl mx-auto text-center">
      <motion.h2
        className="text-2xl sm:text-4xl md:text-6xl font-bold text-primary mb-8 sm:mb-12 flex items-center justify-center gap-2 sm:gap-3"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={isBoring ? { duration: 0.2 } : { type: "spring" }}
      >
        Pick your plan
        <Pencil size={28} className="text-primary sm:w-10 sm:h-10" />
      </motion.h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            className={`relative rounded-2xl border-[2.5px] border-border p-6 sm:p-8 flex flex-col items-center ${
              plan.highlighted
                ? "bg-primary text-primary-foreground"
                : "bg-card text-card-foreground"
            } ${plan.highlighted && !isBoring ? "animate-shimmer-border" : ""}`}
            initial={{ opacity: 0, y: isBoring ? 20 : 50, scale: isBoring ? 1 : 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: i === 1 ? 1.08 : 1 }}
            viewport={{ once: true }}
            transition={
              isBoring
                ? { delay: i * 0.05, duration: 0.2 }
                : { delay: i * 0.12, type: "spring", stiffness: 180 }
            }
            whileHover={
              isBoring ? { y: -2 } : i === 1 ? { scale: 1.12, y: -10 } : { scale: 1.06, y: -10 }
            }
          >
            {plan.highlighted && !isBoring && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-card-yellow text-foreground text-xs font-bold px-3 py-1 rounded-full border-[2.5px] border-border animate-wiggle whitespace-nowrap">
                Most Popular
              </div>
            )}
            <h3 className="text-lg font-bold mb-2">{plan.name}</h3>
            <p className="text-3xl sm:text-4xl font-bold mb-1">{plan.price}</p>
            {plan.priceNote ? (
              <p
                className={`text-sm mb-4 ${plan.highlighted ? "text-primary-foreground/70" : "text-muted-foreground"}`}
              >
                {plan.priceNote}
              </p>
            ) : (
              <div className="mb-5" />
            )}
            <ul className="space-y-2 mb-6 sm:mb-7">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 justify-center text-sm sm:text-base">
                  <Check size={16} strokeWidth={3} /> {f}
                </li>
              ))}
            </ul>
            <motion.button
              onClick={() => {
                if (plan.cta === "Donate") {
                  window.open(
                    "https://www.paypal.com/donate/?hosted_button_id=7MMM37XLLSTMY",
                    "_blank",
                  );
                  return;
                }

                if (plan.cta === "Get Started") {
                  window.open("/smart-solve-all", "_blank");
                  return;
                }

                if (plan.cta === "Unlock Now") {
                  if (isPro) {
                    toast.success("You already have Pro 🎉");
                    return;
                  }
                  if (unlocked) {
                    lockAll();
                    toast("Locked again — premium years/topics now hidden.");
                    return;
                  }
                  setUnlockOpen(true);
                  return;
                }

                handleCta(plan.cta);
              }}
              className={`w-full py-2.5 sm:py-3 rounded-full font-bold border-[2.5px] border-border ${
                plan.highlighted ? "bg-card text-primary" : "bg-primary text-primary-foreground"
              }`}
              whileHover={isBoring ? { opacity: 0.9 } : { scale: 1.06 }}
              whileTap={isBoring ? undefined : { scale: 0.95 }}
            >
              {plan.cta === "Unlock Now"
                ? isPro
                  ? "✓ Pro unlocked"
                  : unlocked
                    ? "✓ Unlocked (click to re-lock)"
                    : plan.cta
                : plan.cta}
            </motion.button>
          </motion.div>
        ))}
      </div>
      <UnlockModal open={unlockOpen} onOpenChange={setUnlockOpen} />
    </section>
  );
}
