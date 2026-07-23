import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SmoothScroll } from "@/components/ui/SmoothScroll";

// Marketing chrome lives here — admin routes sit outside this group, so they
// render without the public header, footer, or smooth-scroll.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
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
        <Header />
        <main id="content">{children}</main>
        <Footer />
      </div>
    </>
  );
}
