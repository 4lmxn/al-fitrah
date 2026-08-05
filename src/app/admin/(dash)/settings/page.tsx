import { requireAdmin } from "@/lib/adminAuth";
import { getSettings } from "@/lib/settings";
import { getPipeline } from "@/lib/pipelines";
import { saveSchool, saveTaxonomy, saveOperations } from "./actions";
import { ActionForm } from "@/components/admin/ActionForm";
import { PipelineEditor } from "@/components/admin/PipelineEditor";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-lg border border-emerald/15 bg-cream/30 px-3 py-2 text-sm text-ink outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/20";
const label = "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink/45";
const card = "rounded-2xl border border-emerald/10 bg-white/90 p-6 shadow-soft";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function List({ name, title, hint, values }: { name: string; title: string; hint: string; values: string[] }) {
  return (
    <label className="block">
      <span className={label}>{title}</span>
      <textarea name={name} rows={Math.min(Math.max(values.length, 3), 8)} defaultValue={values.join("\n")} className={`${field} resize-y font-mono text-xs`} />
      <span className="mt-1 block text-[11px] text-ink/45">{hint}</span>
    </label>
  );
}

export default async function SettingsPage() {
  const [{ role }, settings, admission, staff] = await Promise.all([
    requireAdmin(),
    getSettings(),
    getPipeline("admission_inquiry"),
    getPipeline("staff_application"),
  ]);

  if (role !== "owner") {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl text-emerald-deep">Settings</h1>
        <p className="mt-4 rounded-2xl border border-gold/30 bg-gold-soft/40 px-5 py-4 text-sm text-[#7a611a]">
          Settings change how the platform behaves for everyone, so they are limited to owner
          accounts. Ask an owner to make the change.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Platform</p>
        <h1 className="mt-1 font-display text-3xl text-emerald-deep">Settings</h1>
        <p className="mt-1 text-sm text-ink/55">
          Everything here is stored, not compiled in. Anything you leave untouched keeps its shipped default.
        </p>
      </div>

      {!settings.school.grievanceOfficerName && (
        <p className="flex items-start gap-2 rounded-2xl border border-gold/30 bg-gold-soft/40 px-5 py-4 text-sm text-[#7a611a]">
          <Icon name="gavel" className="mt-0.5 text-[18px]" />
          <span>
            <b>A named grievance officer is required.</b> India&apos;s DPDP Act asks for one person
            parents can contact about their data. Until it is set, the privacy page names the school
            instead, which is weaker than the Act asks for.
          </span>
        </p>
      )}

      <section className={card}>
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
          <Icon name="school" className="text-[18px] text-gold" /> School
        </h2>
        <ActionForm action={saveSchool} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className={label}>Name</span><input name="name" defaultValue={settings.school.name} className={field} /></label>
            <label className="block"><span className={label}>Branch</span><input name="branch" defaultValue={settings.school.branch} className={field} /></label>
            <label className="block sm:col-span-2"><span className={label}>Tagline</span><input name="tagline" defaultValue={settings.school.tagline} className={field} /></label>
            <label className="block"><span className={label}>Phone</span><input name="phone" defaultValue={settings.school.phone} className={field} /></label>
            <label className="block"><span className={label}>Email</span><input name="email" defaultValue={settings.school.email} className={field} /></label>
            <label className="block sm:col-span-2"><span className={label}>Address</span><input name="address" defaultValue={settings.school.address} className={field} /></label>
            <label className="block"><span className={label}>Grievance officer</span><input name="grievanceOfficerName" defaultValue={settings.school.grievanceOfficerName} placeholder="Full name" className={field} /></label>
            <label className="block"><span className={label}>Grievance email</span><input name="grievanceOfficerEmail" defaultValue={settings.school.grievanceOfficerEmail} className={field} /></label>
          </div>
          <button type="submit" className="rounded-full bg-emerald px-5 py-2 text-sm font-semibold text-cream transition hover:bg-emerald-deep">Save school details</button>
        </ActionForm>
      </section>

      <section className={card}>
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
          <Icon name="account_tree" className="text-[18px] text-gold" /> Admissions pipeline
        </h2>
        <p className="mt-1 text-xs text-ink/50">The stages an enquiry moves through. Order is the order shown everywhere.</p>
        <div className="mt-4">
          <PipelineEditor type="admission_inquiry" label={settings.pipelines.admission_inquiry.label} stages={admission} />
        </div>
      </section>

      <section className={card}>
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
          <Icon name="work" className="text-[18px] text-gold" /> Recruitment pipeline
        </h2>
        <div className="mt-4">
          <PipelineEditor type="staff_application" label={settings.pipelines.staff_application.label} stages={staff} />
        </div>
      </section>

      <section className={card}>
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
          <Icon name="list" className="text-[18px] text-gold" /> Lists
        </h2>
        <ActionForm action={saveTaxonomy} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <List name="programs" title="Programs" hint="One per line." values={settings.taxonomy.programs} />
            <List name="classSections" title="Class sections" hint="Used to group the attendance register." values={settings.taxonomy.classSections} />
            <List name="leadSources" title="Lead sources" hint="Every way a lead can arrive." values={settings.taxonomy.leadSources} />
            <List name="manualLeadSources" title="Staff-entered sources" hint="Subset offered when logging a lead by hand." values={settings.taxonomy.manualLeadSources} />
            <List name="employmentTypes" title="Employment types" hint="Shown on job openings." values={settings.taxonomy.employmentTypes} />
            <List name="paymentMethods" title="Payment methods" hint="Offered when recording a fee payment." values={settings.taxonomy.paymentMethods} />
          </div>
          <button type="submit" className="rounded-full bg-emerald px-5 py-2 text-sm font-semibold text-cream transition hover:bg-emerald-deep">Save lists</button>
        </ActionForm>
      </section>

      <section className={card}>
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
          <Icon name="tune" className="text-[18px] text-gold" /> Operations
        </h2>
        <ActionForm action={saveOperations} className="mt-4 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={label}>Academic year starts</span>
              <select name="startMonth" defaultValue={settings.academicYear.startMonth} className={field}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </label>
            <label className="block">
              <span className={label}>Flag attendance below (%)</span>
              <input type="number" name="lowAttendancePercent" min={0} max={100} defaultValue={settings.attendance.lowAttendancePercent} className={field} />
            </label>
          </div>

          <div>
            <span className={label}>Non-school days</span>
            <div className="flex flex-wrap gap-3">
              {DAYS.map((d, i) => (
                <label key={d} className="flex items-center gap-1.5 text-sm text-ink/70">
                  <input type="checkbox" name={`nonSchoolDay-${i}`} defaultChecked={settings.attendance.nonSchoolDays.includes(i)} className="h-4 w-4 rounded accent-emerald" />
                  {d.slice(0, 3)}
                </label>
              ))}
            </div>
          </div>

          <div>
            <span className={label}>Features</span>
            <div className="space-y-2">
              {([
                ["onlinePayments", "Online payments", "Reserved for the payment gateway."],
                ["whatsappNotifications", "WhatsApp notifications", "Reserved for the notification engine."],
                ["smsNotifications", "SMS notifications", "Reserved for the notification engine."],
              ] as const).map(([key, title, hint]) => (
                <label key={key} className="flex items-start gap-2 rounded-lg border border-emerald/10 bg-cream/20 px-3 py-2 text-sm">
                  <input type="checkbox" name={key} defaultChecked={settings.features[key]} className="mt-0.5 h-4 w-4 rounded accent-emerald" />
                  <span><b className="font-semibold text-emerald-deep">{title}</b> <span className="text-xs text-ink/50">{hint}</span></span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="rounded-full bg-emerald px-5 py-2 text-sm font-semibold text-cream transition hover:bg-emerald-deep">Save operations</button>
        </ActionForm>
      </section>
    </div>
  );
}
