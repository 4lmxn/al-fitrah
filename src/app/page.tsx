// src/app/page.tsx
import { Hero } from "@/components/home/Hero";
import { QuickFacts } from "@/components/home/QuickFacts";
import { WhyUs } from "@/components/home/WhyUs";
import { ProgramsPreview } from "@/components/home/ProgramsPreview";
import { AdmissionCTA } from "@/components/home/AdmissionCTA";

export default function HomePage() {
  return (
    <>
      <Hero />
      <QuickFacts />
      <WhyUs />
      <ProgramsPreview />
      <AdmissionCTA />
    </>
  );
}
