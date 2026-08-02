"use client";
import { useState } from "react";
import { CaptureForm } from "@/components/pages/CaptureForm";
import { Icon } from "@/components/ui/Icon";

// Prospectus / fee-sheet lead magnet: capture name + phone, then reveal the
// download. The PDF URL is env-gated (NEXT_PUBLIC_PROSPECTUS_URL) — until the
// school provides the real file, submitting still captures the warm lead and we
// promise to send it, rather than shipping a placeholder PDF.
export function ProspectusMagnet() {
  const [done, setDone] = useState(false);
  const pdfUrl = process.env.NEXT_PUBLIC_PROSPECTUS_URL;

  return (
    <div className="grid items-center gap-8 rounded-xl3 border border-emerald/10 bg-white/80 p-8 shadow-soft sm:p-10 md:grid-cols-[1.1fr_1fr]">
      <div>
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald/8 text-emerald ring-1 ring-emerald/10">
          <Icon name="picture_as_pdf" className="text-[24px]" />
        </span>
        <h2 className="mt-5 text-2xl text-emerald-deep">Get the prospectus</h2>
        <p className="mt-2 max-w-md leading-relaxed text-ink/70">
          Our programme, the daily rhythm, and admissions details in one place. Share your
          details and we&apos;ll send it straight over.
        </p>
      </div>

      <div>
        {done && pdfUrl ? (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-emerald px-6 py-3 text-sm font-semibold text-cream transition hover:bg-emerald-dark"
          >
            <Icon name="download" className="text-[18px]" /> Download the prospectus
          </a>
        ) : (
          <CaptureForm
            source="prospectus"
            cta="Send me the prospectus"
            successTitle="On its way"
            successBody="Thank you — we'll send the prospectus to you shortly, in shaa Allah."
            onSuccess={() => setDone(true)}
          />
        )}
      </div>
    </div>
  );
}
