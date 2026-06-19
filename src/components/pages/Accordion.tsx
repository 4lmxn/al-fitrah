"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { FaqItem } from "@/content/types";

export function Accordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-4">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={it.q} className={`overflow-hidden rounded-2xl border bg-white/80 shadow-soft transition-colors ${isOpen ? "border-emerald/30" : "border-emerald/10"}`}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left focus-visible:outline"
            >
              <span className="font-semibold text-emerald-deep">{it.q}</span>
              <Icon name="expand_more" className={`shrink-0 text-ink/50 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
            </button>
            <div className={`grid transition-all duration-300 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
              <div className="overflow-hidden">
                <p className="px-6 pb-5 leading-relaxed text-ink/70">{it.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
