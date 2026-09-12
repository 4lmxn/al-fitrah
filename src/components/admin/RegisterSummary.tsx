"use client";
import { useEffect, useState } from "react";

/**
 * Live count of what is currently marked, above the register.
 *
 * The register defaults everyone to present and asks the teacher to mark the
 * exceptions, which means the number that matters — how many are away today —
 * is invisible until after saving. On a phone, with the list scrolled past, it
 * is invisible even then.
 *
 * Deliberately reads the form rather than owning the state. The register is a
 * plain uncontrolled form of radio inputs; lifting twenty children's statuses
 * into React to display two numbers would be a rewrite of the thing that
 * already works, and would put the saved value and the displayed value in two
 * places that can disagree.
 */
export function RegisterSummary({
  formId,
  presentIds,
  total,
}: {
  formId: string;
  /** Status ids that count as the child being here. From settings, not hardcoded. */
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
