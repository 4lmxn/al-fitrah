import Link from "next/link";
import { getInbox } from "@/lib/leadQueries";
import { PIPELINES, LEAD_TYPE_LABEL, type LeadType } from "@/lib/leads";
import { stageMeta } from "@/lib/stageMeta";
import { relativeTime } from "@/lib/relativeTime";
import { followUpWaLink } from "@/lib/followup";
import { snoozeFollowUp } from "@/app/admin/(dash)/leads/[id]/actions";
import { Icon } from "@/components/ui/Icon";
import { StatCard } from "@/components/admin/StatCard";
import { LeadAvatar } from "@/components/admin/LeadAvatar";
import { InlineStageSelect } from "@/components/admin/InlineStageSelect";

export const dynamic = "force-dynamic";

const TYPES: LeadType[] = ["admission_inquiry", "staff_application"];
const TYPE_ICON: Record<LeadType, string> = {
  admission_inquiry: "family_restroom",
  staff_application: "work",
};

export default async function AdminInbox({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; stage?: string; q?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const type: LeadType = TYPES.includes(sp.type as LeadType) ? (sp.type as LeadType) : "admission_inquiry";
  const attention = sp.view === "attention";
  const stage = !attention && sp.stage && PIPELINES[type].includes(sp.stage) ? sp.stage : undefined;
  const q = sp.q?.trim() || "";

  const { rows, counts, kpis, attentionCount } = await getInbox(type, { stage, q, attention });
  const wonLabel = type === "staff_application" ? "Hired" : "Admitted";
  // This page is force-dynamic; "today" is intentionally the request time.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startTodayMs = startOfToday.getTime();

  // Options for the inline stage changer, labelled from the pipeline.
  const stageOptions = PIPELINES[type].map((s) => ({ value: s, label: stageMeta(s).label }));

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

      {/* Needs-attention banner — overdue follow-ups + untouched new leads */}
      {attentionCount > 0 && !attention && (
        <Link
          href={`/admin?type=${type}&view=attention`}
          className="mt-6 flex items-center gap-3 rounded-2xl border border-gold/30 bg-gold-soft/50 px-5 py-3.5 text-sm transition hover:bg-gold-soft"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/20 text-[#7a611a]">
            <Icon name="notification_important" className="text-[20px]" />
          </span>
          <span className="font-semibold text-[#7a611a]">
            {attentionCount} lead{attentionCount > 1 ? "s" : ""} need attention
          </span>
          <span className="hidden text-[#7a611a]/70 sm:inline">— overdue follow-ups or untouched new enquiries</span>
          <Icon name="arrow_forward" className="ml-auto text-[18px] text-[#7a611a]" />
        </Link>
      )}

      {/* Toolbar: stage filter + search */}
      <div className="mt-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {attentionCount > 0 && (
            <Link
              href={attention ? `/admin?type=${type}` : `/admin?type=${type}&view=attention`}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
                attention ? "bg-gold text-ink ring-gold" : "bg-white text-[#7a611a] ring-gold/30 hover:bg-gold-soft/50"
              }`}
            >
              <Icon name="notification_important" className="text-[14px]" /> Needs attention
              <span className="tabular-nums opacity-70">{attentionCount}</span>
            </Link>
          )}
          <Link
            href={base({})}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
              !stage && !attention ? "bg-emerald text-cream ring-emerald" : "bg-white text-ink/65 ring-emerald/10 hover:bg-emerald/5"
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
              <Icon name={attention ? "task_alt" : q || stage ? "search_off" : "inbox"} className="text-[30px]" />
            </span>
            <p className="font-display text-lg text-emerald-deep">
              {attention ? "All caught up" : q || stage ? "No matching leads" : "No leads yet"}
            </p>
            <p className="max-w-xs text-sm text-ink/50">
              {attention ? "No overdue follow-ups or untouched enquiries. Nice work." : q || stage ? "Try clearing the filter or search." : "New submissions from the website will land here automatically."}
            </p>
            {(q || stage || attention) && (
              <Link href={`/admin?type=${type}`} className="mt-1 text-sm font-semibold text-emerald hover:text-emerald-deep">
                {attention ? "Back to all leads" : "Clear filters"}
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
                  <td className="px-5 py-3.5"><InlineStageSelect id={l.id} stage={l.stage} options={stageOptions} /></td>
                  <td className="hidden px-5 py-3.5 sm:table-cell">
                    <div className="text-ink/55">{relativeTime(l.createdAtMs)}</div>
                    {l.followUpMs != null && (
                      <div className={`mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold ${l.followUpMs < startTodayMs ? "text-[#9a7b18]" : "text-emerald"}`}>
                        <Icon name={l.followUpMs < startTodayMs ? "notification_important" : "event"} className="text-[13px]" />
                        {l.followUpMs < startTodayMs ? "Overdue" : "Follow-up"} {relativeTime(l.followUpMs)}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      {type === "admission_inquiry" && (() => {
                        const wa = followUpWaLink(l.phone, l.name);
                        return wa ? (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Send a WhatsApp follow-up"
                            aria-label={`Send a WhatsApp follow-up to ${l.name}`}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-emerald transition hover:bg-emerald/10"
                          >
                            <Icon name="chat" className="text-[18px]" />
                          </a>
                        ) : null;
                      })()}
                      {l.followUpMs != null && l.followUpMs < startTodayMs && (
                        <form action={snoozeFollowUp}>
                          <input type="hidden" name="id" value={l.id} />
                          <input type="hidden" name="days" value={7} />
                          <button type="submit" title="Snooze follow-up by a week" aria-label={`Snooze ${l.name} by a week`} className="flex h-8 w-8 items-center justify-center rounded-full text-ink/45 transition hover:bg-emerald/10 hover:text-emerald">
                            <Icon name="snooze" className="text-[18px]" />
                          </button>
                        </form>
                      )}
                      <Link
                        href={`/admin/leads/${l.id}`}
                        className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-emerald opacity-70 transition group-hover:bg-emerald/5 group-hover:opacity-100"
                      >
                        Open <Icon name="arrow_forward" className="text-[16px]" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {rows.length > 0 && (
        <p className="mt-3 text-xs text-ink/45">Showing {rows.length} {rows.length === 1 ? "lead" : "leads"}{attention ? " needing attention" : stage ? ` in ${stageMeta(stage).label}` : ""}{q ? ` matching “${q}”` : ""}.</p>
      )}
    </div>
  );
}
