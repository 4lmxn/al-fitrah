"use client";
import { Icon } from "@/components/ui/Icon";
import { useSchoolContact } from "@/components/SchoolContact";

export function SubmitErrorFallback({
  message,
  dark = false,
}: {
  message: string;
  dark?: boolean;
}) {
  const { waHref, phone } = useSchoolContact();
  return (
    <div
      role="alert"
      className={`space-y-3 rounded-xl px-4 py-3.5 ${
        dark ? "bg-cream/10 " : "border border-red-200 bg-red-50"
      }`}
    >
      <p className={`text-sm font-medium ${dark ? "text-gold-light" : "text-red-700"}`}>
        {message} You can also reach us directly:
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald px-4 py-2 text-xs font-semibold text-cream transition hover:bg-emerald-deep"
        >
          <Icon name="chat" className="text-[16px]" /> WhatsApp us
        </a>
        <a
          href={`tel:${phone}`}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold ring-1 ring-inset transition ${
            dark
              ? "text-cream ring-cream/25 hover:bg-cream/10"
              : "text-emerald-deep ring-emerald/20 hover:bg-emerald/5"
          }`}
        >
          <Icon name="call" className="text-[16px]" /> Call {phone}
        </a>
      </div>
    </div>
  );
}
