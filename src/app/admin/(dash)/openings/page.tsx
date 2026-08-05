import Link from "next/link";
import { listAllOpenings } from "@/lib/jobOpenings";
import { relativeTime } from "@/lib/relativeTime";
import { Icon } from "@/components/ui/Icon";
import { ActionForm } from "@/components/admin/ActionForm";
import { toggleOpening } from "./actions";

export const dynamic = "force-dynamic";

export default async function OpeningsAdmin() {
  const openings = await listAllOpenings();
  const activeCount = openings.filter((o) => o.active).length;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Careers</p>
          <h1 className="mt-1 font-display text-3xl text-emerald-deep">Job openings</h1>
          <p className="mt-1 text-sm text-ink/55">
            {openings.length} total · {activeCount} live on the public careers page.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/admin?type=staff_application"
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-emerald-deep shadow-soft ring-1 ring-emerald/10 transition hover:bg-emerald/5"
        >
          <Icon name="group" className="text-[18px]" /> View applicants
        </Link>
        <Link
          href="/admin/openings/new"
          className="inline-flex items-center gap-2 rounded-full bg-emerald px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-emerald-deep"
        >
          <Icon name="add" className="text-[18px]" /> New opening
        </Link>
        </div>
      </div>

      {openings.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-emerald/10 bg-white/90 p-16 text-center shadow-soft">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald/5 text-emerald/40">
            <Icon name="work_off" className="text-[30px]" />
          </span>
          <p className="font-display text-lg text-emerald-deep">No openings yet</p>
          <p className="max-w-xs text-sm text-ink/50">Create your first job opening — it shows on the public careers page when marked active.</p>
          <Link href="/admin/openings/new" className="mt-1 text-sm font-semibold text-emerald hover:text-emerald-deep">
            Create opening
          </Link>
        </div>
      ) : (
        <div className="mt-7 space-y-3">
          {openings.map((o) => (
            <div
              key={o.id}
              className="flex flex-col gap-4 rounded-2xl border border-emerald/10 bg-white/90 p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="font-semibold text-emerald-deep">{o.title}</h2>
                  <span className="rounded-full bg-emerald/8 px-2.5 py-0.5 text-xs font-semibold text-emerald-deep">{o.employmentType}</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      o.active ? "bg-emerald/10 text-emerald-deep" : "bg-ink/5 text-ink/45"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${o.active ? "bg-emerald" : "bg-ink/30"}`} />
                    {o.active ? "Active" : "Hidden"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink/45">
                  {o.requirements.length} requirement{o.requirements.length === 1 ? "" : "s"}
                  {o.updatedAtMs ? ` · updated ${relativeTime(o.updatedAtMs)}` : ""}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <ActionForm action={toggleOpening}>
                  <input type="hidden" name="id" value={o.id} />
                  <input type="hidden" name="active" value={String(!o.active)} />
                  <button
                    type="submit"
                    className="rounded-full px-3 py-1.5 text-xs font-semibold text-emerald ring-1 ring-inset ring-emerald/20 transition hover:bg-emerald/5"
                  >
                    {o.active ? "Hide" : "Make active"}
                  </button>
                </ActionForm>
                <Link
                  href={`/admin/openings/${o.id}`}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald/8 px-3 py-1.5 text-xs font-semibold text-emerald-deep transition hover:bg-emerald/15"
                >
                  Edit <Icon name="edit" className="text-[15px]" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
