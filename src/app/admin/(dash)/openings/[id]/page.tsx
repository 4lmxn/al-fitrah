import Link from "next/link";
import { notFound } from "next/navigation";
import { getOpening } from "@/lib/jobOpenings";
import { requireAdmin } from "@/lib/adminAuth";
import { Icon } from "@/components/ui/Icon";
import { OpeningForm } from "@/components/admin/OpeningForm";
import { ActionForm } from "@/components/admin/ActionForm";
import { updateOpening, deleteOpening } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditOpeningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ role }, opening] = await Promise.all([requireAdmin(), getOpening(id)]);
  if (!opening) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/openings" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald hover:text-emerald-deep">
        <Icon name="arrow_back" className="text-[18px]" /> Back to openings
      </Link>
      <h1 className="mt-4 font-display text-3xl text-emerald-deep">Edit opening</h1>
      <p className="mt-1 text-sm text-ink/55">Changes go live on the careers page immediately.</p>

      <div className="mt-7 rounded-2xl border border-emerald/10 bg-white/90 p-6 shadow-soft sm:p-8">
        <OpeningForm action={updateOpening} opening={opening} submitLabel="Save changes" />
      </div>

      {/* Owners only. Hiding this is a courtesy so staff aren't shown a control
          that will fail — the real gate is requireOwner() in the action, since
          a hidden button is not a permission. */}
      {role === "owner" && (
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50/50 p-5">
          <div>
            <p className="text-sm font-semibold text-red-800">Delete this opening</p>
            <p className="text-xs text-red-700/70">Permanently removes it. This cannot be undone.</p>
          </div>
          <ActionForm action={deleteOpening}>
            <input type="hidden" name="id" value={opening.id} />
            <button type="submit" className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100">
              Delete
            </button>
          </ActionForm>
        </div>
      )}
    </div>
  );
}
