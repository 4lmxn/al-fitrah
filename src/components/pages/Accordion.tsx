"use client";
import { useId, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { FaqItem } from "@/content/types";

export function Accordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const uid = useId();
  return (
    <div className="space-y-4">
      {items.map((it, i) => {
        const isOpen = open === i;
        const panelId = `${uid}-panel-${i}`;
        return (
          <div key={it.q} className={`overflow-hidden rounded-xl3 bg-white shadow-soft transition ${isOpen ? "ring-2 ring-emerald/30" : ""}`}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left focus-visible:outline"
            >
              <span className="font-display text-lg font-semibold text-emerald-deep">{it.q}</span>
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald/10 text-emerald transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}>
                <Icon name="add" className="text-[20px]" />
              </span>
            </button>
            <div id={panelId} inert={!isOpen} aria-hidden={!isOpen} className={`grid transition-all duration-300 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
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
