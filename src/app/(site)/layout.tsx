import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SmoothScroll } from "@/components/ui/SmoothScroll";

// Marketing chrome lives here — admin routes sit outside this group, so they
// render without the public header, footer, or smooth-scroll.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SmoothScroll />
      {/* Ambient geometric texture across marketing pages */}
      <div className="bg-geo pointer-events-none fixed inset-0 z-0 opacity-60" aria-hidden />
      <div className="relative z-10">
        <Header />
        <main>{children}</main>
        <Footer />
      </div>
    </>
  );
}
