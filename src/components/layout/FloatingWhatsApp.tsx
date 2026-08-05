"use client";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

// Persistent WhatsApp enquiry button on every marketing page. Most parents here
// prefer WhatsApp to a form, so the channel is always one tap away — and the
// message encodes the current path, so replies land tagged with where they were.
/**
 * `waBase` is built on the server, because the phone number is configuration
 * and this component needs `usePathname` — so it cannot read settings itself.
 */
export function FloatingWhatsApp({ waBase }: { waBase: string }) {
  const pathname = usePathname();
  // Hidden on the enquiry surfaces, which already lead with their own CTAs.
  if (pathname?.startsWith("/admin") || pathname === "/contact" || pathname === "/admissions") return null;

  const where = pathname === "/" ? "home" : pathname?.replace(/^\//, "");
  const href = `${waBase}${encodeURIComponent(where ? ` (from ${where})` : "")}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Enquire on WhatsApp"
      className="group fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-emerald px-4 py-3 text-sm font-semibold text-cream shadow-lift ring-1 ring-emerald-deep/20 transition hover:bg-emerald-dark sm:bottom-6 sm:right-6"
    >
      <Icon name="chat" className="text-[22px] text-gold-light" />
      <span className="hidden sm:inline">Enquire on WhatsApp</span>
    </a>
  );
}
