import { createFileRoute } from "@tanstack/react-router";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import SubjectCardsShowcase from "@/components/SubjectCardsShowcase";
import TestimonialSection from "@/components/TestimonialSection";
import PricingSection from "@/components/PricingSection";
import Footer from "@/components/Footer";

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
    </div>
  );
}
