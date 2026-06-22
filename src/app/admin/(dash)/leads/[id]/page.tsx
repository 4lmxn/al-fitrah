import { notFound } from "next/navigation";
import Link from "next/link";
import { getLead } from "@/lib/leadQueries";
import { PIPELINES, stageLabel, LEAD_TYPE_LABEL } from "@/lib/leads";
import { Icon } from "@/components/ui/Icon";
import { updateStage, addNote } from "./actions";

export const dynamic = "force-dynamic";

function fmt(ms: number | null): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/admin?type=${lead.type}`} className="inline-flex items-center gap-1 text-sm font-semibold text-emerald hover:text-emerald-deep">
        <Icon name="arrow_back" className="text-[18px]" /> Back to leads
      </Link>

      <div className="mt-4 rounded-xl3 border border-emerald/10 bg-white/80 p-8 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gold">{LEAD_TYPE_LABEL[lead.type]}</p>
            <h1 className="mt-1 text-2xl text-emerald-deep">{lead.name}</h1>
          </div>
          <span className="rounded-full bg-emerald/8 px-3 py-1.5 text-sm font-semibold text-emerald-deep">{stageLabel(lead.stage)}</span>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div><dt className="text-xs uppercase tracking-wide text-ink/50">Phone</dt><dd className="text-ink/80">{lead.phone}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-ink/50">Email</dt><dd className="text-ink/80">{lead.email ?? "—"}</dd></div>
          {lead.type === "staff_application"
            ? <div><dt className="text-xs uppercase tracking-wide text-ink/50">Role</dt><dd className="text-ink/80">{lead.role ?? "—"}</dd></div>
            : <div><dt className="text-xs uppercase tracking-wide text-ink/50">Child age</dt><dd className="text-ink/80">{lead.childAge ?? "—"}</dd></div>}
          <div><dt className="text-xs uppercase tracking-wide text-ink/50">Received</dt><dd className="text-ink/80">{fmt(lead.createdAtMs)}</dd></div>
        </dl>

        {lead.message && (
          <div className="mt-6">
            <p className="text-xs uppercase tracking-wide text-ink/50">Message</p>
            <p className="mt-1 whitespace-pre-wrap text-ink/80">{lead.message}</p>
          </div>
        )}

        {lead.type === "staff_application" && lead.cv && (
          <a href={`/admin/leads/${lead.id}/cv`} className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald/30 px-5 py-2.5 text-sm font-semibold text-emerald transition hover:bg-emerald/5">
            <Icon name="description" className="text-[18px]" /> Download CV ({lead.cv.filename})
          </a>
        )}
      </div>

      {/* Stage pipeline */}
      <div className="mt-6 rounded-xl3 border border-emerald/10 bg-white/80 p-8 shadow-soft">
        <h2 className="text-lg text-emerald-deep">Update stage</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {PIPELINES[lead.type].map((s) => (
            <form key={s} action={updateStage}>
              <input type="hidden" name="id" value={lead.id} />
              <input type="hidden" name="stage" value={s} />
              <button
                type="submit"
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  s === lead.stage ? "bg-emerald text-cream" : "bg-white text-emerald-deep ring-1 ring-emerald/15 hover:bg-emerald/5"
                }`}
              >
                {stageLabel(s)}
              </button>
            </form>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="mt-6 rounded-xl3 border border-emerald/10 bg-white/80 p-8 shadow-soft">
        <h2 className="text-lg text-emerald-deep">Internal notes</h2>
        <form action={addNote} className="mt-4 flex gap-3">
          <input type="hidden" name="id" value={lead.id} />
          <input name="text" placeholder="Add a note…" className="w-full rounded-xl border border-emerald/15 bg-cream/40 px-4 py-2.5 text-ink outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/20" />
          <button type="submit" className="shrink-0 rounded-full bg-emerald px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-emerald-deep">Add</button>
        </form>
        <ul className="mt-5 space-y-3">
          {lead.notes.length === 0 && <li className="text-sm text-ink/50">No notes yet.</li>}
          {lead.notes.map((n, i) => (
            <li key={i} className="rounded-xl bg-cream-deep/50 p-4">
              <p className="text-ink/80">{n.text}</p>
              <p className="mt-1 text-xs text-ink/50">{n.author} · {fmt(n.atMs)}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
