import Link from "next/link";
import { getInbox } from "@/lib/leadQueries";
import { PIPELINES, LEAD_TYPE_LABEL, type LeadType } from "@/lib/leads";
import { stageMeta } from "@/lib/stageMeta";
import { relativeTime } from "@/lib/relativeTime";
import { Icon } from "@/components/ui/Icon";
import { StatCard } from "@/components/admin/StatCard";
import { StagePill } from "@/components/admin/StagePill";
import { LeadAvatar } from "@/components/admin/LeadAvatar";

export const dynamic = "force-dynamic";

const TYPES: LeadType[] = ["admission_inquiry", "staff_application"];
const TYPE_ICON: Record<LeadType, string> = {
  admission_inquiry: "family_restroom",
  staff_application: "work",
};

export default async function AdminInbox({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; stage?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const type: LeadType = TYPES.includes(sp.type as LeadType) ? (sp.type as LeadType) : "admission_inquiry";
  const stage = sp.stage && PIPELINES[type].includes(sp.stage) ? sp.stage : undefined;
  const q = sp.q?.trim() || "";

  const { rows, counts, kpis } = await getInbox(type, { stage, q });
  const wonLabel = type === "staff_application" ? "Hired" : "Enrolled";

  const base = (extra: Record<string, string>) => {
    const params = new URLSearchParams({ type, ...(q ? { q } : {}), ...extra });
    return `/admin?${params.toString()}`;
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header + type switch */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Pipeline</p>
          <h1 className="mt-1 font-display text-3xl text-emerald-deep">Leads</h1>
          <p className="mt-1 text-sm text-ink/55">Track and move every inquiry and application through the pipeline.</p>
        </div>
        <div className="inline-flex rounded-full bg-white p-1 shadow-soft ring-1 ring-emerald/10">
          {TYPES.map((t) => (
            <Link
              key={t}
              href={`/admin?type=${t}`}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                t === type ? "bg-emerald text-cream shadow-sm" : "text-emerald-deep hover:bg-emerald/5"
              }`}
            >
              <Icon name={TYPE_ICON[t]} className="text-[18px]" />
              {LEAD_TYPE_LABEL[t]}
            </Link>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total" value={kpis.total} icon="groups" tone="brand" />
        <StatCard label="New" value={kpis.new} icon="mark_email_unread" tone="gold" hint="Awaiting first contact" />
        <StatCard label="In progress" value={kpis.active} icon="trending_up" tone="soft" />
        <StatCard label={wonLabel} value={kpis.won} icon="verified" tone="deep" />
      </div>

      {/* Toolbar: stage filter + search */}
      <div className="mt-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <Link
            href={base({})}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
              !stage ? "bg-emerald text-cream ring-emerald" : "bg-white text-ink/65 ring-emerald/10 hover:bg-emerald/5"
            }`}
          >
            All <span className="ml-1 tabular-nums opacity-70">{kpis.total}</span>
          </Link>
          {PIPELINES[type].map((s) => {
            const m = stageMeta(s);
            const active = stage === s;
            return (
              <Link
                key={s}
                href={base({ stage: s })}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
                  active ? "bg-emerald text-cream ring-emerald" : "bg-white text-ink/65 ring-emerald/10 hover:bg-emerald/5"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
                {m.label}
                <span className="tabular-nums opacity-70">{counts[s] ?? 0}</span>
              </Link>
            );
          })}
        </div>

        <form action="/admin" method="get" className="relative w-full lg:w-72">
          <input type="hidden" name="type" value={type} />
          {stage && <input type="hidden" name="stage" value={stage} />}
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-ink/35" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name, phone, email…"
            className="w-full rounded-full border border-emerald/15 bg-white py-2.5 pl-10 pr-4 text-sm text-ink shadow-soft outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/20 placeholder:text-ink/35"
          />
        </form>
      </div>

      {/* Table */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-emerald/10 bg-white/90 shadow-soft">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald/5 text-emerald/40">
              <Icon name={q || stage ? "search_off" : "inbox"} className="text-[30px]" />
            </span>
            <p className="font-display text-lg text-emerald-deep">
              {q || stage ? "No matching leads" : "No leads yet"}
            </p>
            <p className="max-w-xs text-sm text-ink/50">
              {q || stage ? "Try clearing the filter or search." : "New submissions from the website will land here automatically."}
            </p>
            {(q || stage) && (
              <Link href={`/admin?type=${type}`} className="mt-1 text-sm font-semibold text-emerald hover:text-emerald-deep">
                Clear filters
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-emerald/10 bg-cream/40 text-[11px] uppercase tracking-wide text-ink/45">
              <tr>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="hidden px-5 py-3 font-semibold sm:table-cell">{type === "staff_application" ? "Role" : "Child age"}</th>
                <th className="hidden px-5 py-3 font-semibold md:table-cell">Phone</th>
                <th className="px-5 py-3 font-semibold">Stage</th>
                <th className="hidden px-5 py-3 font-semibold sm:table-cell">Received</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald/5">
              {rows.map((l) => (
                <tr key={l.id} className="group transition hover:bg-emerald/[0.035]">
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/leads/${l.id}`} className="flex items-center gap-3">
                      <LeadAvatar name={l.name} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-emerald-deep">{l.name}</span>
                        <span className="block truncate text-xs text-ink/45">{l.email ?? "No email"}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="hidden px-5 py-3.5 text-ink/70 sm:table-cell">{type === "staff_application" ? l.role ?? "—" : l.childAge ?? "—"}</td>
                  <td className="hidden px-5 py-3.5 text-ink/70 md:table-cell tabular-nums">{l.phone}</td>
                  <td className="px-5 py-3.5"><StagePill stage={l.stage} /></td>
                  <td className="hidden px-5 py-3.5 text-ink/55 sm:table-cell">{relativeTime(l.createdAtMs)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/admin/leads/${l.id}`}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-emerald opacity-70 transition group-hover:bg-emerald/5 group-hover:opacity-100"
                    >
                      Open <Icon name="arrow_forward" className="text-[16px]" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {rows.length > 0 && (
        <p className="mt-3 text-xs text-ink/45">Showing {rows.length} {rows.length === 1 ? "lead" : "leads"}{stage ? ` in ${stageMeta(stage).label}` : ""}{q ? ` matching “${q}”` : ""}.</p>
      )}
    </div>
  );
}
