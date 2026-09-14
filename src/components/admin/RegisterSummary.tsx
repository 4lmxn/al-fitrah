"use client";
import { useEffect, useState } from "react";

export function RegisterSummary({
  formId,
  presentIds,
  total,
}: {
  formId: string;
  presentIds: string[];
  total: number;
}) {
  const [present, setPresent] = useState(total);

  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;

    const count = () => {
      const checked = form.querySelectorAll<HTMLInputElement>('input[type="radio"]:checked');
      let here = 0;
      checked.forEach((input) => {
        if (presentIds.includes(input.value)) here += 1;
      });
      setPresent(here);
    };

    count();
    form.addEventListener("change", count);
    return () => form.removeEventListener("change", count);
  }, [formId, presentIds]);

  const away = total - present;

  return (
    <div className="flex items-center gap-4" aria-live="polite">
      <span className="inline-flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tabular-nums text-emerald-deep">{present}</span>
        <span className="text-xs font-medium uppercase tracking-wide text-ink/45">here</span>
      </span>
      <span className="h-8 w-px bg-emerald/10" aria-hidden="true" />
      <span className="inline-flex items-baseline gap-1.5">
        <span
          className={`text-2xl font-semibold tabular-nums ${away > 0 ? "text-red-700" : "text-ink/30"}`}
        >
          {away}
        </span>
        <span className="text-xs font-medium uppercase tracking-wide text-ink/45">away</span>
      </span>
    </div>
  );
}
