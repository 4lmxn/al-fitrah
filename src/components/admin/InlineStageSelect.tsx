"use client";
import { updateStage } from "@/app/admin/(dash)/leads/[id]/actions";

// Compact stage changer for the leads table: picking a stage submits the
// server action immediately, so staff can advance a lead without opening it.
export function InlineStageSelect({
  id,
  stage,
  options,
}: {
  id: string;
  stage: string;
  options: { value: string; label: string }[];
}) {
  return (
    <form action={updateStage}>
      <input type="hidden" name="id" value={id} />
      <select
        name="stage"
        defaultValue={stage}
        aria-label="Change stage"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="cursor-pointer rounded-full border border-emerald/15 bg-white py-1.5 pl-3 pr-7 text-xs font-semibold text-emerald-deep outline-none transition hover:bg-emerald/5 focus:border-emerald focus:ring-2 focus:ring-emerald/20"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </form>
  );
}
