import { Hero } from "@/components/home/Hero";
import { QuickFacts } from "@/components/home/QuickFacts";
import { Welcome } from "@/components/home/Welcome";
import { Approach } from "@/components/home/Approach";
import { Stats } from "@/components/home/Stats";
import { Highlights } from "@/components/home/Highlights";
import { AdmissionCTA } from "@/components/home/AdmissionCTA";
import { ContactPreview } from "@/components/home/ContactPreview";

export default function HomePage() {
  return (
    <>
      <Hero />
      <QuickFacts />
      <Welcome />
      <Approach />
      <Stats />
      <Highlights />
      <AdmissionCTA />
      <ContactPreview />
    </>
  );
}
