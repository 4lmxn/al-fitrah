import { Hero } from "@/components/home/Hero";
import { QuickFacts } from "@/components/home/QuickFacts";
import { Welcome } from "@/components/home/Welcome";
import { Approach } from "@/components/home/Approach";
import { Stats } from "@/components/home/Stats";
import { Highlights } from "@/components/home/Highlights";
import { Trust } from "@/components/home/Trust";
import { AdmissionCTA } from "@/components/home/AdmissionCTA";
import { ContactPreview } from "@/components/home/ContactPreview";
import { KeyFacts } from "@/components/pages/FactSections";

export default function HomePage() {
  return (
    <>
      <Hero />
      <QuickFacts />
      <KeyFacts />
      <Welcome />
      <Approach />
      <Stats />
      <Highlights />
      <Trust />
      <AdmissionCTA />
      <ContactPreview />
    </>
  );
}
