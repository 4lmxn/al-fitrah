import Link from "next/link";
import { getInbox, SEARCH_SCAN_LIMIT } from "@/lib/leadQueries";
import { requireAdmin } from "@/lib/adminAuth";
import { LEAD_TYPE_LABEL, type LeadType } from "@/lib/leads";
import { Icon } from "@/components/ui/Icon";
import { InboxBoard } from "@/components/admin/InboxBoard";

export const dynamic = "force-dynamic";

const TYPES: LeadType[] = ["admission_inquiry", "staff_application"];
const TYPE_ICON: Record<LeadType, string> = {
  admission_inquiry: "family_restroom",
  staff_application: "work",
};

export default async function AdminInbox({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; stage?: string; q?: string; view?: string; after?: string }>;
}) {
  const sp = await searchParams;
  const { role } = await requireAdmin();
  const type: LeadType = TYPES.includes(sp.type as LeadType) ? (sp.type as LeadType) : "admission_inquiry";
  const attention = sp.view === "attention";
  const requestedStage = !attention ? sp.stage : undefined;
  const q = sp.q?.trim() || "";

  const inbox = await getInbox(type, {
    stage: requestedStage,
    q,
    attention,
    cursor: sp.after,
  });

  const { pipeline, attentionCount, rows, counts, kpis, nextCursor, searchTruncated } = inbox;

  const wonLabel = type === "staff_application" ? "Hired" : "Admitted";

  const stage = pipeline.some((s) => s.id === requestedStage) ? requestedStage : undefined;

  const nextHref = nextCursor
    ? `/admin?${new URLSearchParams({ type, ...(stage ? { stage } : {}), after: nextCursor }).toString()}`
    : null;
  const isPaged = Boolean(sp.after);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Pipeline</p>
          <h1 className="mt-1 font-display text-3xl text-emerald-deep">Leads</h1>
          <p className="mt-1 text-sm text-ink/55">Track and move every inquiry and application through the pipeline.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
          {role === "owner" && (
            <a
              href={`/admin/leads/export?${new URLSearchParams({ type, ...(stage ? { stage } : {}) })}`}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-emerald-deep shadow-soft ring-1 ring-emerald/10 transition hover:bg-emerald/5"
            >
              <Icon name="download" className="text-[18px]" /> Export CSV
            </a>
          )}
          <Link
            href="/admin/leads/new"
            className="inline-flex items-center gap-2 rounded-full bg-emerald px-4 py-2.5 text-sm font-semibold text-cream shadow-soft transition hover:bg-emerald-deep"
          >
            <Icon name="add" className="text-[18px]" /> New lead
          </Link>
        </div>
      </div>

      <InboxBoard
        key={`${type}|${stage ?? ""}|${attention ? "attn" : ""}|${q}|${sp.after ?? ""}`}
        type={type}
        activeStage={stage}
        attention={attention}
        q={q}
        wonLabel={wonLabel}
        stages={pipeline}
        initial={{ rows, counts, kpis, attentionCount }}
      />

      {searchTruncated && (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-gold/30 bg-gold-soft/40 px-4 py-3 text-xs text-[#7a611a]">
          <Icon name="info" className="text-[16px]" />
          Searched the {SEARCH_SCAN_LIMIT} most recent {LEAD_TYPE_LABEL[type].toLowerCase()} records. Narrow the
          search, or filter by stage first, if you expect an older match.
        </p>
      )}

      {(nextHref || isPaged) && (
        <nav aria-label="Pagination" className="mt-5 flex items-center justify-between gap-3">
          {isPaged ? (
            <Link
              href={`/admin?${new URLSearchParams({ type, ...(stage ? { stage } : {}) }).toString()}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-deep shadow-soft ring-1 ring-emerald/10 transition hover:bg-emerald/5"
            >
              <Icon name="first_page" className="text-[18px]" /> First page
            </Link>
          ) : (
            <span />
          )}
          {nextHref && (
            <Link
              href={nextHref}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-deep shadow-soft ring-1 ring-emerald/10 transition hover:bg-emerald/5"
            >
              Older <Icon name="arrow_forward" className="text-[18px]" />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
