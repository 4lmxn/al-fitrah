"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { useSchoolContact } from "@/components/SchoolContact";

/**
 * Persistent lead widget on every marketing page: an "Enquire now" pill plus
 * round Call and WhatsApp buttons. Most parents here prefer a phone or a
 * WhatsApp message to a form, so both channels stay one tap away — and the
 * WhatsApp message encodes the current path, so replies land tagged with where
 * the parent was reading.
 *
 * The pill hides on very small screens; the two round buttons never do.
 */
export function FloatingLead({ waBase }: { waBase: string }) {
  const pathname = usePathname();
  const { phone } = useSchoolContact();

  // Hidden on the enquiry surfaces, which already lead with their own CTAs.
  if (pathname?.startsWith("/admin") || pathname === "/contact" || pathname === "/admissions") return null;

  const where = pathname === "/" ? "home" : pathname?.replace(/^\//, "");
  const href = `${waBase}${encodeURIComponent(where ? ` (from ${where})` : "")}`;
  const tel = `tel:${phone.replace(/[^\d+]/g, "")}`;

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      <Link
        href="/admissions#enroll"
        className="hidden items-center gap-2 rounded-full bg-gold px-4 py-2.5 font-display text-sm font-bold text-ink shadow-lift transition hover:-translate-y-0.5 sm:inline-flex"
      >
        <Icon name="chat" className="text-[18px]" />
        Enquire now
      </Link>
      <div className="flex gap-3">
        <a
          href={tel}
          aria-label="Call the school"
          className="relative inline-grid h-14 w-14 place-items-center rounded-full bg-emerald text-cream shadow-lift transition hover:scale-105"
        >
          {/* Expanding ring, drawn behind the button. Decorative. */}
          <span aria-hidden className="absolute inset-0 -z-10 animate-pulsering rounded-full bg-emerald" />
          <Icon name="call" className="text-[26px]" />
        </a>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Enquire on WhatsApp"
          className="relative inline-grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lift transition hover:scale-105"
        >
          <span aria-hidden className="absolute inset-0 -z-10 animate-pulsering rounded-full bg-[#25D366]" />
          <Icon name="chat" className="text-[26px]" />
        </a>
      </div>
    </div>
  );
}
