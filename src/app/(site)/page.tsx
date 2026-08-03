import { Hero } from "@/components/home/Hero";
import { QuickFacts } from "@/components/home/QuickFacts";
import { Approach } from "@/components/home/Approach";
import { Welcome } from "@/components/home/Welcome";
import { Highlights } from "@/components/home/Highlights";
import { AdmissionCTA } from "@/components/home/AdmissionCTA";
import { ContactPreview } from "@/components/home/ContactPreview";

export default function HomePage() {
  return (
    <>
      <Hero />
      <QuickFacts />
      <Approach />
      <Welcome />
      <Highlights />
      <AdmissionCTA />
      <ContactPreview />
    </>
  );
}
