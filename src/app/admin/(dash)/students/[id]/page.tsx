import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudent, STUDENT_STATUSES, STUDENT_STATUS_LABEL } from "@/lib/students";
import { getAttendanceStatuses, getClassSections, getPrograms, getPaymentMethods } from "@/lib/taxonomy";
import { updateStudent } from "../actions";
import { Icon } from "@/components/ui/Icon";
import { ActionForm } from "@/components/admin/ActionForm";
import { FeesPanel } from "@/components/admin/FeesPanel";
import { listPayments } from "@/lib/fees";
import { dateKey, listRegisters, monthBounds, summarise } from "@/lib/attendance";
import { StudentPhoto } from "@/components/admin/StudentPhoto";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-lg border border-emerald/15 bg-cream/30 px-3 py-2 text-sm text-ink outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/20";
const label = "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink/45";

function toDateInput(ms: number | null): string {
  if (!ms) return "";
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const TABS = [
  { id: "overview", label: "Overview", icon: "person" },
  { id: "attendance", label: "Attendance", icon: "fact_check" },
  { id: "fees", label: "Fees", icon: "payments" },
  { id: "guardians", label: "Guardians", icon: "family_restroom" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default async function StudentDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  // Tabs live in the URL rather than in client state: the page is
  // server-rendered, so a tab that costs a round trip to Firestore should not
  // also cost a hydration boundary — and a link to a child's fees is a thing
  // staff will want to send each other.
  const tab: TabId = (TABS.find((t) => t.id === sp.tab)?.id ?? "overview") as TabId;

  // Independent reads — the payment ledger is keyed by student id, not by
  // anything on the student document, so waiting for one before the other only
  // added a round trip.
  const [student, payments, programs, sections, methods, statuses] = await Promise.all([
    getStudent(id), listPayments(id), getPrograms(), getClassSections(), getPaymentMethods(),
    getAttendanceStatuses(),
  ]);
  if (!student) notFound();

  // Only for the attendance tab, and only when the child is in a class — the
  // register is stored per class-day, so without one there is nothing to read.
  const monthKey = dateKey();
  const { from, to } = monthBounds(monthKey);
  const registers =
    tab === "attendance" && student.classSection
      ? await listRegisters(student.academicYear, student.classSection, from, to)
      : [];
  const attendance = summarise(registers, student.id, statuses);

  const tabHref = (t: TabId) => `/admin/students/${student.id}${t === "overview" ? "" : `?tab=${t}`}`;

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/students" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald transition hover:text-emerald-deep">
        <Icon name="arrow_back" className="text-[18px]" /> Back to students
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <StudentPhoto
            studentId={student.id}
            hasPhoto={student.photoPath !== null}
            name={student.fullName}
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">{student.admissionNumber}</p>
            <h1 className="mt-1 font-display text-3xl text-emerald-deep">{student.fullName}</h1>
            <p className="mt-1 text-sm text-ink/55">
              {student.program}
              {student.classSection ? ` · ${student.classSection}` : ""} · {student.academicYear} ·{" "}
              {STUDENT_STATUS_LABEL[student.status]}
            </p>
          </div>
        </div>
        {student.leadId && (
          <Link
            href={`/admin/leads/${student.leadId}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-deep shadow-soft ring-1 ring-emerald/10 transition hover:bg-emerald/5"
          >
            <Icon name="history" className="text-[18px]" /> Original enquiry
          </Link>
        )}
      </div>

      <nav aria-label="Student record" className="mt-6 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-1 border-b border-emerald/10">
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <Link
                key={t.id}
                href={tabHref(t.id)}
                aria-current={active ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "border-emerald text-emerald-deep"
                    : "border-transparent text-ink/50 hover:border-emerald/20 hover:text-emerald-deep"
                }`}
              >
                <Icon name={t.icon} className="text-[17px]" />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {tab === "attendance" && (
        <section className="mt-7">
          {!student.classSection ? (
            <div className="rounded-2xl border border-emerald/10 bg-white/90 p-8 text-center shadow-soft">
              <p className="font-semibold text-emerald-deep">Not in a class yet</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-ink/55">
                Attendance is taken per class, so this child needs a class before there is a
                register to read. Set one on the Overview tab.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Present", value: attendance.present, tone: "text-emerald-deep" },
                  { label: "Away", value: attendance.absent, tone: attendance.absent > 0 ? "text-red-700" : "text-ink/40" },
                  { label: "Days counted", value: attendance.counted, tone: "text-ink/70" },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-emerald/10 bg-white/90 p-5 shadow-soft">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/45">{s.label}</p>
                    <p className={`mt-1 text-3xl font-semibold tabular-nums ${s.tone}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-2xl border border-emerald/10 bg-white/90 p-6 shadow-soft">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/50">
                    This month · {student.classSection}
                  </h2>
                  {/* Null, not zero: a child enrolled today has no counted days,
                      and "0%" would read as a truancy problem. */}
                  <p className="text-2xl font-semibold tabular-nums text-emerald-deep">
                    {attendance.percent === null ? "—" : `${attendance.percent}%`}
                  </p>
                </div>
                <span className="mt-3 block h-2 overflow-hidden rounded-full bg-emerald/10" aria-hidden="true">
                  <span
                    className="block h-full rounded-full bg-emerald"
                    style={{ width: `${attendance.percent ?? 0}%` }}
                  />
                </span>
                <p className="mt-3 text-xs text-ink/45">
                  Counted days exclude statuses the school has marked as not counting — an
                  authorised absence neither credits attendance nor counts against the child.
                </p>
                <Link
                  href={`/admin/attendance?class=${encodeURIComponent(student.classSection)}`}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald hover:text-emerald-deep"
                >
                  <Icon name="fact_check" className="text-[18px]" /> Open the register
                </Link>
              </div>
            </>
          )}
        </section>
      )}

      {/* Guardians — read-only here. They come from the enquiry, and editing
          them belongs with contact management rather than this form. */}
      <section hidden={tab !== "guardians"} className="mt-7 rounded-2xl border border-emerald/10 bg-white/90 p-6 shadow-soft">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
          <Icon name="family_restroom" className="text-[18px] text-gold" /> Guardians
        </h2>
        {student.guardians.length === 0 ? (
          <p className="mt-4 text-sm text-ink/45">No guardian on record.</p>
        ) : (
          <ul className="mt-4 divide-y divide-emerald/5">
            {student.guardians.map((g, i) => (
              <li key={`${g.phone}-${i}`} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span>
                  <span className="font-semibold text-emerald-deep">{g.name}</span>
                  <span className="ml-2 text-xs text-ink/45">{g.relationship}</span>
                  {g.isPrimary && (
                    <span className="ml-2 rounded-full bg-emerald/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-deep">
                      Primary
                    </span>
                  )}
                </span>
                <span className="text-sm tabular-nums text-ink/70">
                  {g.phone}
                  {g.email && <span className="ml-3 text-ink/45">{g.email}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {tab === "fees" && (
        <FeesPanel studentId={student.id} fees={student.fees} payments={payments} methods={methods} />
      )}

      {/* One form, three sections. They stay together because they save
          together — splitting Medical onto its own tab would mean a partial
          save, or two forms that can disagree about the same record. */}
      {tab === "overview" && (
      <ActionForm action={updateStudent} className="mt-6 space-y-6">
        <input type="hidden" name="id" value={student.id} />

        <section className="rounded-2xl border border-emerald/10 bg-white/90 p-6 shadow-soft">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
            <Icon name="badge" className="text-[18px] text-gold" /> Details
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={label}>First name</span>
              <input name="firstName" required defaultValue={student.firstName} className={field} />
            </label>
            <label className="block">
              <span className={label}>Last name</span>
              <input name="lastName" defaultValue={student.lastName} className={field} />
            </label>
            <label className="block">
              <span className={label}>Program</span>
              <select name="program" defaultValue={student.program} className={field}>
                {programs.map((p: string) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={label}>Class / section</span>
              {/* A fixed list, not free text: attendance groups by this value,
                  and "Rose" vs "rose" would silently split the register. */}
              <select
                name="classSection"
                defaultValue={student.classSection ?? ""}
                disabled={sections.length === 0}
                className={`${field} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <option value="">Not assigned</option>
                {sections.map((c: string) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {sections.length === 0 && (
                // An empty dropdown reads as a broken form. Say what is missing
                // and where to fix it instead.
                <span className="mt-1 block text-xs text-ink/50">
                  No class sections yet —{" "}
                  <Link href="/admin/settings" className="font-semibold text-emerald hover:underline">
                    add them in Settings
                  </Link>
                  .
                </span>
              )}
            </label>
            <label className="block">
              <span className={label}>Status</span>
              <select name="status" defaultValue={student.status} className={field}>
                {STUDENT_STATUSES.map((s) => (
                  <option key={s} value={s}>{STUDENT_STATUS_LABEL[s]}</option>
                ))}
              </select>
            </label>
            <div className="block">
              <span className={label}>Date of birth</span>
              {/* Read-only: DOB determines eligibility, so a correction should be
                  a deliberate act with the birth certificate in hand, not a
                  stray keystroke in a form that also edits the class section. */}
              <input value={toDateInput(student.dobMs)} readOnly disabled className={`${field} opacity-60`} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-emerald/10 bg-white/90 p-6 shadow-soft">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
            <Icon name="emergency" className="text-[18px] text-gold" /> Emergency contact
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className={label}>Name</span>
              <input name="emergencyName" defaultValue={student.emergencyContact?.name ?? ""} className={field} />
            </label>
            <label className="block">
              <span className={label}>Phone</span>
              <input name="emergencyPhone" defaultValue={student.emergencyContact?.phone ?? ""} className={field} />
            </label>
            <label className="block">
              <span className={label}>Relationship</span>
              <input name="emergencyRelationship" defaultValue={student.emergencyContact?.relationship ?? ""} className={field} />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-gold/30 bg-gold-soft/20 p-6 shadow-soft">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
            <Icon name="medical_information" className="text-[18px] text-gold" /> Medical
          </h2>
          <p className="mt-1 text-xs text-ink/50">
            Health information about a child. Keep it accurate and share it only with staff who need it.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={label}>Allergies</span>
              <input name="allergies" defaultValue={student.medical?.allergies ?? ""} placeholder="e.g. peanuts" className={field} />
            </label>
            <label className="block">
              <span className={label}>Conditions</span>
              <input name="conditions" defaultValue={student.medical?.conditions ?? ""} className={field} />
            </label>
            <label className="block">
              <span className={label}>Doctor</span>
              <input name="doctorName" defaultValue={student.medical?.doctorName ?? ""} className={field} />
            </label>
            <label className="block">
              <span className={label}>Doctor&apos;s phone</span>
              <input name="doctorPhone" defaultValue={student.medical?.doctorPhone ?? ""} className={field} />
            </label>
            <label className="block sm:col-span-2">
              <span className={label}>Notes</span>
              <textarea name="medicalNotes" rows={3} defaultValue={student.medical?.notes ?? ""} className={`${field} resize-none`} />
            </label>
          </div>
        </section>

        <button
          type="submit"
          className="rounded-full bg-emerald px-6 py-2.5 text-sm font-semibold text-cream transition hover:bg-emerald-deep"
        >
          Save changes
        </button>
      </ActionForm>
      )}
    </div>
  );
}
