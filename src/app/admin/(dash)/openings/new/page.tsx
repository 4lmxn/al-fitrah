import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { OpeningForm } from "@/components/admin/OpeningForm";
import { getEmploymentTypes } from "@/lib/taxonomy";
import { createOpening } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewOpeningPage() {
  const employmentTypes = await getEmploymentTypes();
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/openings" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald hover:text-emerald-deep">
        <Icon name="arrow_back" className="text-[18px]" /> Back to openings
      </Link>
      <h1 className="mt-4 font-display text-3xl text-emerald-deep">New opening</h1>
      <p className="mt-1 text-sm text-ink/55">Publish a role to the public careers page.</p>
      <div className="mt-7 rounded-2xl border border-emerald/10 bg-white/90 p-6 shadow-soft sm:p-8">
        <OpeningForm action={createOpening} employmentTypes={employmentTypes} submitLabel="Create opening" />
      </div>
    </div>
  );
}
