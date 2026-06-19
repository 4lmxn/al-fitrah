import { Hero } from "@/components/home/Hero";
import { Approach } from "@/components/home/Approach";
import { Highlights } from "@/components/home/Highlights";
import { AdmissionCTA } from "@/components/home/AdmissionCTA";
import { ContactPreview } from "@/components/home/ContactPreview";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Approach />
      <Highlights />
      <AdmissionCTA />
      <ContactPreview />
    </>
  );
}
