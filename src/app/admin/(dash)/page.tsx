import Link from "next/link";
import { listLeads } from "@/lib/leadQueries";
import { PIPELINES, LEAD_TYPE_LABEL, stageLabel, type LeadType } from "@/lib/leads";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

const TYPES: LeadType[] = ["admission_inquiry", "staff_application"];

function fmtDate(ms: number | null): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AdminInbox({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; stage?: string }>;
}) {
  const sp = await searchParams;
  const type: LeadType = TYPES.includes(sp.type as LeadType) ? (sp.type as LeadType) : "admission_inquiry";
  const stage = sp.stage && PIPELINES[type].includes(sp.stage) ? sp.stage : undefined;

  const leads = await listLeads(type, stage);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl text-emerald-deep">Leads</h1>
        <div className="flex gap-2">
          {TYPES.map((t) => (
            <Link
              key={t}
              href={`/admin?type=${t}`}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                t === type ? "bg-emerald text-cream" : "bg-white text-emerald-deep ring-1 ring-emerald/15 hover:bg-emerald/5"
              }`}
            >
              {LEAD_TYPE_LABEL[t]}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href={`/admin?type=${type}`}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            !stage ? "bg-gold text-ink" : "bg-white text-ink/70 ring-1 ring-emerald/10 hover:bg-emerald/5"
          }`}
        >
          All
        </Link>
        {PIPELINES[type].map((s) => (
          <Link
            key={s}
            href={`/admin?type=${type}&stage=${s}`}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              stage === s ? "bg-gold text-ink" : "bg-white text-ink/70 ring-1 ring-emerald/10 hover:bg-emerald/5"
            }`}
          >
            {stageLabel(s)}
          </Link>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl3 border border-emerald/10 bg-white/80 shadow-soft">
        {leads.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <Icon name="inbox" className="text-[36px] text-emerald/30" />
            <p className="text-ink/60">No leads here yet.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-emerald/10 text-xs uppercase tracking-wide text-ink/50">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">{type === "staff_application" ? "Role" : "Child age"}</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Stage</th>
                <th className="px-5 py-3">Received</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald/5">
              {leads.map((l) => (
                <tr key={l.id} className="hover:bg-emerald/5">
                  <td className="px-5 py-3 font-semibold text-emerald-deep">{l.name}</td>
                  <td className="px-5 py-3 text-ink/70">{type === "staff_application" ? l.role ?? "—" : l.childAge ?? "—"}</td>
                  <td className="px-5 py-3 text-ink/70">{l.phone}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-emerald/8 px-2.5 py-1 text-xs font-semibold text-emerald-deep">{stageLabel(l.stage)}</span>
                  </td>
                  <td className="px-5 py-3 text-ink/60">{fmtDate(l.createdAtMs)}</td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/admin/leads/${l.id}`} className="font-semibold text-emerald hover:text-emerald-deep">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
