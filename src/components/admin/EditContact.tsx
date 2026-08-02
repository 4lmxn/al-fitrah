"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { PROGRAM_INTERESTS } from "@/lib/leads";
import { editContact } from "@/app/admin/(dash)/leads/[id]/actions";

type Lead = {
  id: string;
  name: string;
  childName: string | null;
  phone: string;
  whatsapp: boolean;
  email: string | null;
  programInterest?: string | null;
};

const field =
  "w-full rounded-lg border border-emerald/15 bg-cream/40 px-3 py-2 text-sm text-ink outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/20";

// Toggles the contact block between a read-only view and an inline edit form,
// so staff can fix a typo or fill in a walk-in's details without a separate
// page. Saving posts the editContact server action.
export function EditContact({ lead }: { lead: Lead }) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-emerald/20 px-3 py-1.5 text-xs font-semibold text-emerald transition hover:bg-emerald/5"
      >
        <Icon name="edit" className="text-[15px]" /> Edit details
      </button>
    );
  }

  return (
    <form action={editContact} onSubmit={() => setEditing(false)} className="space-y-3 rounded-xl border border-emerald/15 bg-cream/30 p-4">
      <input type="hidden" name="id" value={lead.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink/45">Parent name</span>
          <input name="parentName" required defaultValue={lead.name} className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink/45">Child name</span>
          <input name="childName" defaultValue={lead.childName ?? ""} className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink/45">Phone</span>
          <input name="phone" required defaultValue={lead.phone} className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink/45">Email</span>
          <input name="email" type="email" defaultValue={lead.email ?? ""} className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink/45">Program</span>
          <select name="programInterest" defaultValue={lead.programInterest ?? ""} className={`${field} cursor-pointer`}>
            <option value="">—</option>
            {PROGRAM_INTERESTS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 pt-6 text-sm text-ink/70">
          <input type="checkbox" name="whatsapp" defaultChecked={lead.whatsapp} className="h-4 w-4 rounded accent-emerald" />
          On WhatsApp
        </label>
      </div>
      <div className="flex items-center gap-2">
        <button type="submit" className="rounded-lg bg-emerald px-4 py-2 text-xs font-semibold text-cream transition hover:bg-emerald-deep">Save</button>
        <button type="button" onClick={() => setEditing(false)} className="text-xs font-semibold text-ink/55 hover:text-ink">Cancel</button>
      </div>
    </form>
  );
}
