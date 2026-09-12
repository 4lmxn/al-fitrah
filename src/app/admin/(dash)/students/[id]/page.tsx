import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudent, STUDENT_STATUSES, STUDENT_STATUS_LABEL } from "@/lib/students";
import { getClassSections, getPrograms, getPaymentMethods } from "@/lib/taxonomy";
import { updateStudent } from "../actions";
import { Icon } from "@/components/ui/Icon";
import { ActionForm } from "@/components/admin/ActionForm";
import { FeesPanel } from "@/components/admin/FeesPanel";
import { listPayments } from "@/lib/fees";

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

export default async function StudentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Independent reads — the payment ledger is keyed by student id, not by
  // anything on the student document, so waiting for one before the other only
  // added a round trip.
  const [student, payments, programs, sections, methods] = await Promise.all([
    getStudent(id), listPayments(id), getPrograms(), getClassSections(), getPaymentMethods(),
  ]);
  if (!student) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/students" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald transition hover:text-emerald-deep">
        <Icon name="arrow_back" className="text-[18px]" /> Back to students
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">{student.admissionNumber}</p>
          <h1 className="mt-1 font-display text-3xl text-emerald-deep">{student.fullName}</h1>
          <p className="mt-1 text-sm text-ink/55">
            {student.program}
            {student.classSection ? ` · ${student.classSection}` : ""} · {student.academicYear} ·{" "}
            {STUDENT_STATUS_LABEL[student.status]}
          </p>
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

      {/* Guardians — read-only here. They come from the enquiry, and editing
          them belongs with contact management rather than this form. */}
      <section className="mt-7 rounded-2xl border border-emerald/10 bg-white/90 p-6 shadow-soft">
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

      <FeesPanel studentId={student.id} fees={student.fees} payments={payments} methods={methods} />

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
    </div>
  );
}
