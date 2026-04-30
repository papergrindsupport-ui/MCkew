import { createFileRoute, Link } from "@tanstack/react-router";
import { LuShield } from "react-icons/lu";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import SubjectCardsShowcase from "@/components/SubjectCardsShowcase";
import TestimonialSection from "@/components/TestimonialSection";
import PricingSection from "@/components/PricingSection";
import Footer from "@/components/Footer";
import { useIsAdminGate } from "@/hooks/useIsAdmin";
import { cn } from "@/lib/utils";

function AdminHomeFab() {
  const { allowed, ready } = useIsAdminGate();
  if (!ready || !allowed) return null;
  return (
    <Link
      to="/admin/editor"
      className={cn(
        "fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full",
        "bg-primary text-primary-foreground shadow-xl ring-2 ring-primary/25",
        "hover:opacity-95 active:scale-95 transition motion-reduce:transition-none",
        "animate-in fade-in zoom-in-95 duration-300",
      )}
      aria-label="Admin editor"
      title="Admin editor"
    >
      <LuShield className="size-7 shrink-0" strokeWidth={2.25} aria-hidden />
    </Link>
  );
}

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "MCkew — Paper 2 made fun" },
      {
        name: "description",
        content:
          "MCkew turns IGCSE Biology, Chemistry & Physics past papers into a gamified challenge with instant smart marking.",
      },
    ],
  }),
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <HeroSection />
      <SubjectCardsShowcase />
      <TestimonialSection />
      <PricingSection />
      <Footer />
      <AdminHomeFab />
    </div>
  );
}
