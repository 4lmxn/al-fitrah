import { notFound } from "next/navigation";
import Link from "next/link";
import { getLead } from "@/lib/leadQueries";
import { PIPELINES, LEAD_TYPE_LABEL } from "@/lib/leads";
import { stageMeta } from "@/lib/stageMeta";
import { relativeTime } from "@/lib/relativeTime";
import { Icon } from "@/components/ui/Icon";
import { LeadAvatar } from "@/components/admin/LeadAvatar";
import { StagePill } from "@/components/admin/StagePill";
import { updateStage, addNote } from "./actions";

export const dynamic = "force-dynamic";

function fmt(ms: number | null): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

// Build a wa.me link from an Indian phone number (default +91 if 10 digits).
function waLink(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const full = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${full}`;
}

function authorInitials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

export default async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  const pipeline = PIPELINES[lead.type];
  const currentIdx = pipeline.indexOf(lead.stage);
  const wa = waLink(lead.phone);
  const notes = [...lead.notes].sort((a, b) => (b.atMs ?? 0) - (a.atMs ?? 0));

  return (
    <div className="mx-auto max-w-5xl">
      <Link href={`/admin?type=${lead.type}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald transition hover:text-emerald-deep">
        <Icon name="arrow_back" className="text-[18px]" /> Back to leads
      </Link>

      {/* Header card */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-emerald/10 bg-white/90 shadow-soft">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex items-center gap-4">
            <LeadAvatar name={lead.name} />
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald/8 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-deep ring-1 ring-inset ring-emerald/15">
                  <Icon name={lead.type === "staff_application" ? "work" : "family_restroom"} className="text-[14px]" />
                  {LEAD_TYPE_LABEL[lead.type]}
                </span>
                <StagePill stage={lead.stage} />
              </div>
              <h1 className="mt-1.5 font-display text-2xl text-emerald-deep">{lead.name}</h1>
              {lead.childName && (
                <p className="text-sm text-ink/60">Child: <span className="font-medium text-ink/80">{lead.childName}</span></p>
              )}
              <p className="text-xs text-ink/45">Received {relativeTime(lead.createdAtMs)} · {fmt(lead.createdAtMs)}</p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <a href={`tel:${lead.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 rounded-full bg-emerald px-4 py-2 text-sm font-semibold text-cream transition hover:bg-emerald-deep">
              <Icon name="call" className="text-[18px]" /> Call
            </a>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-emerald/25 px-4 py-2 text-sm font-semibold text-emerald transition hover:bg-emerald/5">
                <Icon name="chat" className="text-[18px]" /> WhatsApp
              </a>
            )}
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 rounded-full border border-emerald/25 px-4 py-2 text-sm font-semibold text-emerald transition hover:bg-emerald/5">
                <Icon name="mail" className="text-[18px]" /> Email
              </a>
            )}
          </div>
        </div>

        {/* Detail strip */}
        <dl className="grid gap-px border-t border-emerald/10 bg-emerald/10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white/90 p-5">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">Phone</dt>
            <dd className="mt-1 flex items-center gap-1.5 tabular-nums text-ink/85">
              {lead.phone}
              {lead.whatsapp && lead.type === "admission_inquiry" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald/8 px-2 py-0.5 text-[10px] font-semibold text-emerald-deep ring-1 ring-emerald/15">
                  <Icon name="chat" className="text-[12px]" /> WhatsApp
                </span>
              )}
            </dd>
          </div>
          <div className="bg-white/90 p-5">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">Email</dt>
            <dd className="mt-1 truncate text-ink/85">{lead.email ?? "—"}</dd>
          </div>
          <div className="bg-white/90 p-5">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">{lead.type === "staff_application" ? "Role" : "Child age"}</dt>
            <dd className="mt-1 text-ink/85">{lead.type === "staff_application" ? lead.role ?? "—" : lead.childAge ?? "—"}</dd>
          </div>
          <div className="bg-white/90 p-5">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">{lead.type === "staff_application" ? "Source" : "Program"}</dt>
            <dd className="mt-1 text-ink/85">{lead.type === "staff_application" ? (lead.source ?? "—") : (lead.programInterest ?? "—")}</dd>
          </div>
        </dl>

        {/* Attribution — only when a campaign or referral produced this lead */}
        {(lead.utm?.source || lead.referredBy) && (
          <div className="flex flex-wrap items-center gap-2 border-t border-emerald/10 bg-cream/40 px-6 py-3 text-[11px] text-ink/55">
            <Icon name="campaign" className="text-[15px] text-gold" />
            {lead.utm?.source && <span>Source: <b className="font-semibold text-ink/70">{lead.utm.source}</b></span>}
            {lead.utm?.medium && <span>· {lead.utm.medium}</span>}
            {lead.utm?.campaign && <span>· {lead.utm.campaign}</span>}
            {lead.referredBy && <span>· Referred by <b className="font-semibold text-ink/70">{lead.referredBy}</b></span>}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {lead.message && (
            <section className="rounded-2xl border border-emerald/10 bg-white/90 p-6 shadow-soft">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
                <Icon name="format_quote" className="text-[18px] text-gold" /> Message
              </h2>
              <p className="mt-3 whitespace-pre-wrap leading-relaxed text-ink/80">{lead.message}</p>
            </section>
          )}

          {lead.type === "staff_application" && (
            <section className="rounded-2xl border border-emerald/10 bg-white/90 p-6 shadow-soft">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
                <Icon name="description" className="text-[18px] text-gold" /> Application CV
              </h2>
              {lead.cv ? (
                <a href={`/admin/leads/${lead.id}/cv`} className="mt-3 inline-flex items-center gap-3 rounded-xl border border-emerald/15 bg-cream/40 p-4 transition hover:border-emerald/30 hover:bg-emerald/5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald/10 text-emerald">
                    <Icon name="picture_as_pdf" className="text-[24px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-emerald-deep">{lead.cv.filename}</span>
                    <span className="block text-xs text-ink/50">Click to download (secure link)</span>
                  </span>
                  <Icon name="download" className="ml-auto text-[20px] text-emerald" />
                </a>
              ) : (
                <p className="mt-3 text-sm text-ink/50">No CV on file.</p>
              )}
            </section>
          )}

          {/* Notes */}
          <section className="rounded-2xl border border-emerald/10 bg-white/90 p-6 shadow-soft">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
              <Icon name="sticky_note_2" className="text-[18px] text-gold" /> Internal notes
            </h2>
            <form action={addNote} className="mt-4 flex gap-2">
              <input type="hidden" name="id" value={lead.id} />
              <input name="text" placeholder="Add a note…" className="w-full rounded-xl border border-emerald/15 bg-cream/40 px-4 py-2.5 text-sm text-ink outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/20" />
              <button type="submit" className="shrink-0 rounded-xl bg-emerald px-4 py-2.5 text-sm font-semibold text-cream transition hover:bg-emerald-deep">Add</button>
            </form>

            {notes.length === 0 ? (
              <p className="mt-5 text-sm text-ink/45">No notes yet. Log calls, tours, and decisions here.</p>
            ) : (
              <ol className="mt-6 space-y-5">
                {notes.map((n, i) => (
                  <li key={i} className="relative flex gap-3 pl-1">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald/8 text-[11px] font-semibold text-emerald-deep ring-1 ring-emerald/15">
                      {authorInitials(n.author)}
                    </span>
                    <div className="min-w-0 flex-1 rounded-xl bg-cream/50 p-3.5 ring-1 ring-emerald/5">
                      <p className="text-sm leading-relaxed text-ink/85">{n.text}</p>
                      <p className="mt-1.5 text-[11px] text-ink/45">{n.author} · {relativeTime(n.atMs)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        {/* Right column — stage pipeline */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-2xl border border-emerald/10 bg-white/90 p-6 shadow-soft">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
              <Icon name="conversion_path" className="text-[18px] text-gold" /> Pipeline
            </h2>
            <ol className="mt-5 space-y-1">
              {pipeline.map((s, idx) => {
                const m = stageMeta(s);
                const done = idx < currentIdx;
                const current = idx === currentIdx;
                const last = idx === pipeline.length - 1;
                return (
                  <li key={s} className="relative">
                    {!last && <span className={`absolute left-[15px] top-7 h-[calc(100%-12px)] w-px ${idx < currentIdx ? "bg-emerald/40" : "bg-emerald/10"}`} />}
                    <form action={updateStage}>
                      <input type="hidden" name="id" value={lead.id} />
                      <input type="hidden" name="stage" value={s} />
                      <button
                        type="submit"
                        className={`group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition ${
                          current ? "bg-emerald/8" : "hover:bg-emerald/5"
                        }`}
                      >
                        <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[15px] transition ${
                          current ? "bg-emerald text-cream ring-2 ring-gold/40"
                          : done ? "bg-emerald/15 text-emerald"
                          : "bg-cream text-ink/40 ring-1 ring-emerald/15 group-hover:ring-emerald/30"
                        }`}>
                          <Icon name={done ? "check" : current ? "radio_button_checked" : "radio_button_unchecked"} className="text-[18px]" />
                        </span>
                        <span className={`font-semibold ${current ? "text-emerald-deep" : done ? "text-ink/70" : "text-ink/55"}`}>{m.label}</span>
                        {current && <span className="ml-auto text-[11px] font-semibold uppercase tracking-wide text-gold">Current</span>}
                      </button>
                    </form>
                  </li>
                );
              })}
            </ol>
            <p className="mt-4 border-t border-emerald/10 pt-3 text-[11px] text-ink/45">Tap a stage to move this lead.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
