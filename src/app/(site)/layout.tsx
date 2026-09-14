import { getSettings } from "@/lib/settings";
import { SchoolContactProvider } from "@/components/SchoolContact";
import { waEnquiryLink } from "@/lib/seo";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingLead } from "@/components/layout/FloatingLead";
import { SmoothScroll } from "@/components/ui/SmoothScroll";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [{ school }, wa] = await Promise.all([getSettings(), waEnquiryLink()]);
  const contact = { waHref: wa, phone: school.phone };
  return (
    <SchoolContactProvider value={contact}>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-emerald focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-cream"
      >
        Skip to content
      </a>
      <SmoothScroll />
      {/* Ambient geometric texture across marketing pages */}
      <div className="bg-geo pointer-events-none fixed inset-0 z-0 opacity-60" aria-hidden />
      <div className="relative z-10">
        <Header name={school.name} branch={school.branch} />
        <main id="content">{children}</main>
        <Footer />
      </div>
      <FloatingLead waBase={wa} />
    </SchoolContactProvider>
  );
}
