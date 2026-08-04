import Link from "next/link";
import { getInbox } from "@/lib/leadQueries";
import { PIPELINES, LEAD_TYPE_LABEL, type LeadType } from "@/lib/leads";
import { stageMeta } from "@/lib/stageMeta";
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
  searchParams: Promise<{ type?: string; stage?: string; q?: string; view?: string }>;
}) {
  const sp = await searchParams;
  const type: LeadType = TYPES.includes(sp.type as LeadType) ? (sp.type as LeadType) : "admission_inquiry";
  const attention = sp.view === "attention";
  const stage = !attention && sp.stage && PIPELINES[type].includes(sp.stage) ? sp.stage : undefined;
  const q = sp.q?.trim() || "";

  const { rows, counts, kpis, attentionCount } = await getInbox(type, { stage, q, attention });
  const wonLabel = type === "staff_application" ? "Hired" : "Admitted";

  // Options for the inline stage changer, labelled from the pipeline.
  const stageOptions = PIPELINES[type].map((s) => ({ value: s, label: stageMeta(s).label }));

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

      {/* Interactive board: KPIs, filters, and the leads table. Keyed on the
          active filter so a navigation remounts it with fresh server data;
          between navigations it updates optimistically without re-reading. */}
      <InboxBoard
        key={`${type}|${stage ?? ""}|${attention ? "attn" : ""}|${q}`}
        type={type}
        activeStage={stage}
        attention={attention}
        q={q}
        wonLabel={wonLabel}
        stageOptions={stageOptions}
        initial={{ rows, counts, kpis, attentionCount }}
      />
    </div>
  );
}
