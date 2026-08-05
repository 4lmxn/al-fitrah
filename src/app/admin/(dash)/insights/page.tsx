import Link from "next/link";
import { getInsights, INSIGHTS_SCAN_LIMIT } from "@/lib/leadQueries";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

// Deliberately just numbers — no charts. Enough to see which channels convert
// and where leads stall, without the weight (or cost) of an analytics stack.
export default async function InsightsPage() {
  const { totalThisMonth, sources, funnel, referrers } = await getInsights();
  const funnelTop = funnel[0]?.count || 1;

  return (
    <div className="mx-auto max-w-5xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Marketing</p>
        <h1 className="mt-1 font-display text-3xl text-emerald-deep">Insights</h1>
        <p className="mt-1 text-sm text-ink/55">Where admission enquiries come from, and how far they get.</p>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        {/* Funnel */}
        <section className="rounded-2xl border border-emerald/10 bg-white/90 p-6 shadow-soft">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
            <Icon name="filter_alt" className="text-[18px] text-gold" /> Admission funnel
          </h2>
          <ol className="mt-5 space-y-3">
            {funnel.map((step) => {
              const pct = Math.round((step.count / funnelTop) * 100);
              return (
                <li key={step.stage}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-semibold text-emerald-deep">{step.label}</span>
                    <span className="tabular-nums text-ink/60">{step.count}</span>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-emerald/8">
                    <div className="h-full rounded-full bg-emerald transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-5 border-t border-emerald/10 pt-3 text-[11px] text-ink/45">
            Cumulative — a lead that reached a later stage is counted in every earlier one.
          </p>
        </section>

        {/* Sources */}
        <section className="rounded-2xl border border-emerald/10 bg-white/90 p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
              <Icon name="campaign" className="text-[18px] text-gold" /> Sources
            </h2>
            <span className="rounded-full bg-emerald/8 px-3 py-1 text-xs font-semibold text-emerald-deep">
              {totalThisMonth} this month
            </span>
          </div>
          {sources.length === 0 ? (
            <p className="mt-5 text-sm text-ink/45">No enquiries yet.</p>
          ) : (
            <table className="mt-4 w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-ink/45">
                <tr>
                  <th className="pb-2 font-semibold">Channel</th>
                  <th className="pb-2 text-right font-semibold">This month</th>
                  <th className="pb-2 text-right font-semibold">Recent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald/5">
                {sources.map((s) => (
                  <tr key={s.source}>
                    <td className="py-2.5 font-medium text-emerald-deep">{s.source}</td>
                    <td className="py-2.5 text-right tabular-nums text-ink/70">{s.thisMonth}</td>
                    <td className="py-2.5 text-right tabular-nums text-ink/55">{s.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-4 border-t border-emerald/10 pt-3 text-[11px] text-ink/45">
            Tag links with <code className="rounded bg-emerald/8 px-1 py-0.5">?utm_source=…</code> to attribute a campaign.
            Channel figures cover the {INSIGHTS_SCAN_LIMIT} most recent enquiries.
          </p>
        </section>
      </div>

      {/* Referrers */}
      <section className="mt-6 rounded-2xl border border-emerald/10 bg-white/90 p-6 shadow-soft">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
          <Icon name="handshake" className="text-[18px] text-gold" /> Referrals
        </h2>
        {referrers.length === 0 ? (
          <p className="mt-4 text-sm text-ink/45">
            No referrals yet. Share a link with <code className="rounded bg-emerald/8 px-1 py-0.5">?ref=CODE</code> — enquiries from it show here.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-emerald/5">
            {referrers.map((r) => (
              <li key={r.code} className="flex items-center justify-between py-2.5 text-sm">
                <Link href={`/admin?type=admission_inquiry&q=${encodeURIComponent(r.code)}`} className="font-semibold text-emerald-deep hover:text-emerald">
                  {r.code}
                </Link>
                <span className="text-ink/60">
                  <span className="tabular-nums">{r.total}</span> referred
                  {r.admitted > 0 && <span className="ml-2 rounded-full bg-emerald/8 px-2 py-0.5 text-xs font-semibold text-emerald-deep">{r.admitted} admitted</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
