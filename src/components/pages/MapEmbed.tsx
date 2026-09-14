"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

export function MapEmbed({
  embedUrl,
  directionsUrl,
  title,
}: {
  embedUrl: string;
  directionsUrl: string;
  title: string;
}) {
  const [loaded, setLoaded] = useState(false);

  if (loaded) {
    return (
      <iframe
        src={embedUrl}
        title={title}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="absolute inset-0 h-full w-full border-0"
      />
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-emerald/5 p-6 text-center">
      <div className="bg-geo pointer-events-none absolute inset-0 opacity-70" aria-hidden />
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-emerald/10 text-emerald ring-1 ring-emerald/15">
        <Icon name="map" className="text-[28px]" />
      </span>
      <p className="relative max-w-xs text-sm text-ink/70">
        We keep Google Maps off until you need it, so the page stays fast and
        cookie-free.
      </p>
      <div className="relative flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setLoaded(true)}
          className="inline-flex items-center gap-2 rounded-full bg-emerald px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-emerald-dark"
        >
          <Icon name="map" className="text-[18px]" /> Load interactive map
        </button>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-emerald/30 px-5 py-2.5 text-sm font-semibold text-emerald transition hover:bg-emerald/5"
        >
          <Icon name="open_in_new" className="text-[18px]" /> Open in Google Maps
        </a>
      </div>
    </div>
  );
}
