import { notFound } from "next/navigation";
import Link from "next/link";
import { getLead } from "@/lib/leadQueries";
import { LEAD_TYPE_LABEL } from "@/lib/leads";
import { findStage } from "@/lib/stageMeta";
import { getPipeline } from "@/lib/pipelines";
import { getPrograms } from "@/lib/taxonomy";
import { relativeTime } from "@/lib/relativeTime";
import { Icon } from "@/components/ui/Icon";
import { LeadAvatar } from "@/components/admin/LeadAvatar";
import { StagePill } from "@/components/admin/StagePill";
import { CopyButton } from "@/components/admin/CopyButton";
import { ActionForm } from "@/components/admin/ActionForm";
import { studentForLead } from "@/lib/students";
import { waLink } from "@/lib/phone";
import { createStudentFromLead } from "../../students/actions";
import { EditContact } from "@/components/admin/EditContact";
import { sourceLabel } from "@/lib/leads";
import { referralCode, referralLink, referralShareLink } from "@/lib/referral";
import { updateStage, logContact, setFollowUp, snoozeFollowUp, assignLead } from "./actions";
import { getAllowlist } from "@/lib/roles";

export const dynamic = "force-dynamic";

function fmt(ms: number | null): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function authorInitials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Local yyyy-mm-dd for a <input type="date"> default (avoids the UTC shift
// toISOString would introduce for a midnight-local timestamp).
function toDateInput(ms: number | null): string {
  if (!ms) return "";
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // The enrolment lookup keys off the lead id alone, so it goes out with the
  // lead rather than after it.
  //
  // This deliberately trades one read for one round trip: it now runs for every
  // lead, including ones that can't have a student, where the answer is always
  // no. That is a single extra read against a 50k/day allowance, versus ~60ms
  // of Mumbai round trip on a page staff open constantly. Latency is the
  // scarcer resource here, not reads.
  const [lead, enrolledEarly] = await Promise.all([getLead(id), studentForLead(id)]);
  if (!lead) notFound();

  const [pipeline, programs] = await Promise.all([getPipeline(lead.type), getPrograms()]);
  const admins = getAllowlist();
  const currentIdx = pipeline.findIndex((s) => s.id === lead.stage);
  const wa = waLink(lead.phone);
  const notes = [...lead.notes].sort((a, b) => (b.atMs ?? 0) - (a.atMs ?? 0));

  // Admitted parents are the highest-ROI referral channel — surface a personal
  // link they can forward. Code is derived deterministically, no extra storage.
  const showReferral = lead.type === "admission_inquiry" && lead.stage === "admitted";
  // Only looked up for admitted leads: an extra read on every other lead page
  // would be paid by every view to answer a question that can't be yes.
  const enrolled = showReferral ? enrolledEarly : null;
  const refCode = showReferral ? referralCode(lead.name, lead.phone) : "";

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
                <StagePill stage={lead.stage} stages={pipeline} />
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

        {/* Attribution — how this lead reached us */}
        {(lead.type === "admission_inquiry" || lead.utm?.source || lead.referredBy) && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-emerald/10 bg-cream/40 px-6 py-3 text-[11px] text-ink/55">
            <Icon name="campaign" className="text-[15px] text-gold" />
            <span>Source: <b className="font-semibold text-ink/70">{sourceLabel(lead.source)}</b></span>
            {lead.utm?.source && <span>· utm: <b className="font-semibold text-ink/70">{lead.utm.source}</b></span>}
            {lead.utm?.medium && <span>/ {lead.utm.medium}</span>}
            {lead.utm?.campaign && <span>/ {lead.utm.campaign}</span>}
            {lead.referredBy && <span>· Referred by <b className="font-semibold text-ink/70">{lead.referredBy}</b></span>}
          </div>
        )}

        {/* Inline contact edit (admission leads) */}
        {lead.type === "admission_inquiry" && (
          <div className="border-t border-emerald/10 bg-white/90 px-6 py-4">
            <EditContact
              programs={programs}
              lead={{
                id: lead.id,
                name: lead.name,
                childName: lead.childName,
                phone: lead.phone,
                whatsapp: lead.whatsapp,
                email: lead.email,
                programInterest: lead.programInterest,
              }}
            />
          </div>
        )}
      </div>

      {lead.possibleDuplicateOf && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-gold/30 bg-gold-soft/40 px-5 py-4 text-sm text-[#7a611a]">
          <Icon name="content_copy" className="text-[20px]" />
          <span>
            <b>This may be a duplicate.</b> An earlier enquiry used the same phone number — it could
            be the same family, or a second child.
          </span>
          <Link
            href={`/admin/leads/${lead.possibleDuplicateOf}`}
            className="ml-auto rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#7a611a] ring-1 ring-gold/40 transition hover:bg-gold-soft"
          >
            Open the earlier one
          </Link>
        </div>
      )}

      <section className="mt-6 rounded-2xl border border-emerald/10 bg-white/90 p-5 shadow-soft">
        <ActionForm action={assignLead} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="id" value={lead.id} />
          <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
            <Icon name="person_add" className="text-[18px] text-gold" /> Owner
          </span>
          <select
            name="assignedTo"
            defaultValue={lead.assignedTo ?? ""}
            className="rounded-lg border border-emerald/15 bg-cream/30 px-3 py-2 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/20"
          >
            <option value="">Unassigned</option>
            {admins.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <button type="submit" className="rounded-full bg-emerald px-4 py-2 text-sm font-semibold text-cream transition hover:bg-emerald-deep">
            Save owner
          </button>
        </ActionForm>
      </section>

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

          {/* Activity timeline — notes + stage changes, newest first */}
          <section className="rounded-2xl border border-emerald/10 bg-white/90 p-6 shadow-soft">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
              <Icon name="history" className="text-[18px] text-gold" /> Activity
            </h2>
            {/* Log what happened and schedule the next follow-up together — the
                core "what happened + what's next" loop, in one submit. */}
            <ActionForm action={logContact} className="mt-4 space-y-3 rounded-xl border border-emerald/15 bg-cream/30 p-4">
              <input type="hidden" name="id" value={lead.id} />
              <textarea name="text" rows={2} placeholder="Log a call, visit, or decision…" className="w-full resize-none rounded-lg border border-emerald/15 bg-white/70 px-3 py-2 text-sm text-ink outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/20" />
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-ink/55">
                  <Icon name="event" className="text-[16px] text-emerald" /> Next follow-up
                </label>
                <input type="date" name="followUpDate" defaultValue={toDateInput(lead.followUpMs)} className="rounded-lg border border-emerald/15 bg-white/70 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/20" />
                <button type="submit" className="ml-auto rounded-lg bg-emerald px-4 py-2 text-sm font-semibold text-cream transition hover:bg-emerald-deep">Log</button>
              </div>
            </ActionForm>

            {notes.length === 0 ? (
              <p className="mt-5 text-sm text-ink/45">No activity yet. Log calls, visits, and decisions here.</p>
            ) : (
              <ol className="mt-6 space-y-5">
                {notes.map((n, i) => {
                  const isStage = n.kind === "stage";
                  return (
                    <li key={i} className="relative flex gap-3 pl-1">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-1 ${
                        isStage ? "bg-gold-soft text-[#7a611a] ring-gold/30" : "bg-emerald/8 text-emerald-deep ring-emerald/15"
                      }`}>
                        {isStage ? <Icon name="trending_flat" className="text-[16px]" /> : authorInitials(n.author)}
                      </span>
                      <div className={`min-w-0 flex-1 rounded-xl p-3.5 ring-1 ${isStage ? "bg-gold-soft/30 ring-gold/15" : "bg-cream/50 ring-emerald/5"}`}>
                        <p className={`text-sm leading-relaxed ${isStage ? "font-medium text-emerald-deep" : "text-ink/85"}`}>{n.text}</p>
                        <p className="mt-1.5 text-[11px] text-ink/45">{n.author} · {relativeTime(n.atMs)}</p>
                      </div>
                    </li>
                  );
                })}
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
                const m = findStage(pipeline, s.id);
                const done = idx < currentIdx;
                const current = idx === currentIdx;
                const last = idx === pipeline.length - 1;
                return (
                  <li key={s.id} className="relative">
                    {!last && <span className={`absolute left-[15px] top-7 h-[calc(100%-12px)] w-px ${idx < currentIdx ? "bg-emerald/40" : "bg-emerald/10"}`} />}
                    <ActionForm action={updateStage}>
                      <input type="hidden" name="id" value={lead.id} />
                      <input type="hidden" name="stage" value={s.id} />
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
                    </ActionForm>
                  </li>
                );
              })}
            </ol>
            <p className="mt-4 border-t border-emerald/10 pt-3 text-[11px] text-ink/45">Tap a stage to move this lead.</p>
          </section>

          {/* Follow-up */}
          <section className="mt-6 rounded-2xl border border-emerald/10 bg-white/90 p-6 shadow-soft">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
              <Icon name="event" className="text-[18px] text-gold" /> Follow-up
            </h2>

            {lead.followUpMs != null && (
              <p className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                lead.followUpMs < startOfToday()
                  ? "bg-gold-soft text-[#7a611a] ring-1 ring-gold/30"
                  : "bg-emerald/8 text-emerald-deep ring-1 ring-emerald/15"
              }`}>
                <Icon name={lead.followUpMs < startOfToday() ? "notification_important" : "schedule"} className="text-[15px]" />
                {lead.followUpMs < startOfToday() ? "Overdue" : "Due"} {relativeTime(lead.followUpMs)}
              </p>
            )}

            <ActionForm action={setFollowUp} className="mt-4 flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={lead.id} />
              <input
                type="date"
                name="followUpDate"
                defaultValue={toDateInput(lead.followUpMs)}
                className="rounded-xl border border-emerald/15 bg-cream/40 px-3 py-2 text-sm text-ink outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/20"
              />
              <button type="submit" className="rounded-xl bg-emerald px-4 py-2 text-sm font-semibold text-cream transition hover:bg-emerald-deep">Set</button>
            </ActionForm>

            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { label: "+3 days", days: 3 },
                { label: "+1 week", days: 7 },
                { label: "+2 weeks", days: 14 },
              ].map((s) => (
                <ActionForm key={s.days} action={snoozeFollowUp}>
                  <input type="hidden" name="id" value={lead.id} />
                  <input type="hidden" name="days" value={s.days} />
                  <button type="submit" className="rounded-full border border-emerald/20 px-3 py-1.5 text-xs font-semibold text-emerald transition hover:bg-emerald/5">
                    {s.label}
                  </button>
                </ActionForm>
              ))}
            </div>
          </section>

          {/* Enrolment — the one way a student record gets created, so the
              pipeline stays the single entry point and every student keeps a
              traceable line back to the enquiry that produced them. */}
          {showReferral && (
            <section className="mt-6 rounded-2xl border border-emerald/15 bg-white/90 p-6 shadow-soft">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
                <Icon name="school" className="text-[18px] text-gold" /> Enrolment
              </h2>
              {enrolled ? (
                <p className="mt-3 text-sm text-ink/70">
                  Enrolled as{" "}
                  <Link href={`/admin/students/${enrolled.id}`} className="font-semibold text-emerald hover:text-emerald-deep">
                    {enrolled.fullName} ({enrolled.admissionNumber})
                  </Link>
                  .
                </p>
              ) : (
                <>
                  <p className="mt-2 text-xs leading-relaxed text-ink/60">
                    Creates the student record and issues an admission number.
                  </p>
                  <ActionForm action={createStudentFromLead} className="mt-4 grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="leadId" value={lead.id} />
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink/45">Child&apos;s first name</span>
                      <input
                        name="firstName"
                        required
                        defaultValue={(lead.childName ?? "").split(" ")[0] ?? ""}
                        className="w-full rounded-lg border border-emerald/15 bg-cream/30 px-3 py-2 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/20"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink/45">Last name</span>
                      <input
                        name="lastName"
                        defaultValue={(lead.childName ?? "").split(" ").slice(1).join(" ")}
                        className="w-full rounded-lg border border-emerald/15 bg-cream/30 px-3 py-2 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/20"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink/45">Program</span>
                      <select
                        name="program"
                        defaultValue={lead.programInterest ?? "Pre-KG"}
                        className="w-full rounded-lg border border-emerald/15 bg-cream/30 px-3 py-2 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/20"
                      >
                        {programs.map((p: string) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink/45">Date of birth</span>
                      <input
                        type="date"
                        name="dob"
                        defaultValue={lead.childDob ?? ""}
                        className="w-full rounded-lg border border-emerald/15 bg-cream/30 px-3 py-2 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/20"
                      />
                    </label>
                    <button
                      type="submit"
                      className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-full bg-emerald px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-emerald-deep"
                    >
                      <Icon name="school" className="text-[18px]" /> Enrol as student
                    </button>
                  </ActionForm>
                </>
              )}
            </section>
          )}

          {/* Referral — only once a family is admitted */}
          {showReferral && (
            <section className="mt-6 rounded-2xl border border-gold/25 bg-gold-soft/30 p-6 shadow-soft">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#7a611a]">
                <Icon name="handshake" className="text-[18px]" /> Referral link
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-ink/60">
                Parents trust parents. Share this with {lead.name.split(" ")[0]} — enquiries from it are tagged{" "}
                <b className="font-semibold text-ink/75">{refCode}</b> and show up in Insights.
              </p>
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/80 p-2.5 ring-1 ring-emerald/10">
                <span className="min-w-0 flex-1 truncate text-xs text-ink/70">{referralLink(refCode)}</span>
                <CopyButton value={referralLink(refCode)} />
              </div>
              <a
                href={referralShareLink(refCode)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-emerald/25 px-3 py-2 text-xs font-semibold text-emerald transition hover:bg-emerald/5"
              >
                <Icon name="chat" className="text-[16px]" /> Share via WhatsApp
              </a>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
