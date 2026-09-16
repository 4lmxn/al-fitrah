import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import { getSettings } from "@/lib/settings";
import { getPipeline } from "@/lib/pipelines";
import { saveSchool, saveTaxonomy, saveOperations, saveNotifications } from "./actions";
import { NOTIFY_CHANNELS, NOTIFY_EVENTS, tokensIn } from "@/lib/notify";
import { ActionForm } from "@/components/admin/ActionForm";
import { PipelineEditor } from "@/components/admin/PipelineEditor";
import { Icon } from "@/components/ui/Icon";
import { CARD, SECTION_LABEL } from "@/components/ui/styles";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-lg border border-emerald/15 bg-cream/30 px-3 py-2 text-sm text-ink outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/20";
const label = "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink/45";

const TABS = [
  { id: "school", label: "School", icon: "school" },
  { id: "pipelines", label: "Pipelines", icon: "account_tree" },
  { id: "lists", label: "Lists", icon: "list" },
  { id: "notifications", label: "Notifications", icon: "notifications" },
  { id: "operations", label: "Operations", icon: "tune" },
] as const;

type TabId = (typeof TABS)[number]["id"];

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

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab: TabId = (TABS.find((t) => t.id === sp.tab)?.id ?? "school") as TabId;

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

      <nav aria-label="Settings" className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-1 border-b border-emerald/10">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={t.id === "school" ? "/admin/settings" : `/admin/settings?tab=${t.id}`}
              aria-current={t.id === tab ? "page" : undefined}
              className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                t.id === tab
                  ? "border-emerald text-emerald-deep"
                  : "border-transparent text-ink/50 hover:border-emerald/20 hover:text-emerald-deep"
              }`}
            >
              <Icon name={t.icon} className="text-[17px]" />
              {t.label}
            </Link>
          ))}
        </div>
      </nav>

      {tab === "school" && (
        <section className={`${CARD} p-6`}>
          <h2 className={SECTION_LABEL}>
            <Icon name="school" className="text-[18px] text-gold" /> School
          </h2>
          <ActionForm action={saveSchool} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block"><span className={label}>Name</span><input name="name" defaultValue={settings.school.name} className={field} /></label>
              <label className="block"><span className={label}>Branch</span><input name="branch" defaultValue={settings.school.branch} className={field} /></label>
              <label className="block sm:col-span-2"><span className={label}>Tagline</span><input name="tagline" defaultValue={settings.school.tagline} className={field} /></label>
              <label className="block"><span className={label}>Phone</span><input name="phone" defaultValue={settings.school.phone} className={field} /></label>
              <label className="block"><span className={label}>Email</span><input name="email" defaultValue={settings.school.email} className={field} /></label>
              <label className="block sm:col-span-2"><span className={label}>Street</span><input name="street" defaultValue={settings.school.address.street} className={field} /></label>
              <label className="block"><span className={label}>Locality</span><input name="locality" defaultValue={settings.school.address.locality} className={field} /></label>
              <label className="block"><span className={label}>City</span><input name="city" defaultValue={settings.school.address.city} className={field} /></label>
              <label className="block"><span className={label}>State</span><input name="region" defaultValue={settings.school.address.region} className={field} /></label>
              <label className="block"><span className={label}>PIN code</span><input name="postalCode" defaultValue={settings.school.address.postalCode} className={field} /></label>
              <label className="block"><span className={label}>Country code</span><input name="country" defaultValue={settings.school.address.country} maxLength={2} placeholder="IN" className={field} /></label>
              <label className="block"><span className={label}>Grievance officer</span><input name="grievanceOfficerName" defaultValue={settings.school.grievanceOfficerName} placeholder="Full name" className={field} /></label>
              <label className="block"><span className={label}>Grievance email</span><input name="grievanceOfficerEmail" defaultValue={settings.school.grievanceOfficerEmail} className={field} /></label>
            </div>
            <button type="submit" className="rounded-full bg-emerald px-5 py-2 text-sm font-semibold text-cream transition hover:bg-emerald-deep">Save school details</button>
          </ActionForm>
        </section>
      )}

      {tab === "pipelines" && (
        <section className={`${CARD} p-6`}>
          <h2 className={SECTION_LABEL}>
            <Icon name="account_tree" className="text-[18px] text-gold" /> Admissions pipeline
          </h2>
          <p className="mt-1 text-xs text-ink/50">The stages an enquiry moves through. Order is the order shown everywhere.</p>
          <div className="mt-4">
            <PipelineEditor type="admission_inquiry" label={settings.pipelines.admission_inquiry.label} stages={admission} />
          </div>
        </section>
      )}
      {tab === "pipelines" && (
        <section className={`${CARD} p-6`}>
          <h2 className={SECTION_LABEL}>
            <Icon name="work" className="text-[18px] text-gold" /> Recruitment pipeline
          </h2>
          <div className="mt-4">
            <PipelineEditor type="staff_application" label={settings.pipelines.staff_application.label} stages={staff} />
          </div>
        </section>
      )}

      {tab === "lists" && (
        <section className={`${CARD} p-6`}>
          <h2 className={SECTION_LABEL}>
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
      )}

      {tab === "notifications" && (
        <section className={`${CARD} p-6`}>
          <h2 className={SECTION_LABEL}>
            <Icon name="notifications" className="text-[18px] text-gold" /> Notifications
          </h2>
          <p className="mt-1 text-xs text-ink/50">
            Who gets told what, and in what words. Switching a channel off stops that event using it.
          </p>
          <ActionForm action={saveNotifications} className="mt-4 space-y-5">
            {NOTIFY_EVENTS.map((event) => {
              const t = settings.notifications.templates[event];
              const on = settings.notifications.events[event];
              return (
                <div key={event} className="rounded-xl border border-emerald/15 bg-cream/20 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-deep">{event}</p>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {NOTIFY_CHANNELS.map((c) => (
                      <label key={c} className="flex items-center gap-1.5 text-xs text-ink/70">
                        <input type="checkbox" name={`ch-${event}-${c}`} defaultChecked={on.includes(c)} className="h-3.5 w-3.5 rounded accent-emerald" />
                        {c}
                        {(c === "whatsapp" || c === "sms") && <span className="text-[10px] text-ink/35">(not wired yet)</span>}
                      </label>
                    ))}
                  </div>
                  <input name={`subject-${event}`} defaultValue={t.subject} className={`${field} mt-3`} />
                  <textarea name={`body-${event}`} rows={6} defaultValue={t.body} className={`${field} mt-2 resize-y font-mono text-xs`} />
                  <p className="mt-1 text-[11px] text-ink/45">
                    Available: {tokensIn(t.body).concat(tokensIn(t.subject)).filter((v, i, a) => a.indexOf(v) === i).map((x) => `{{${x}}}`).join(" ") || "none"}
                  </p>
                </div>
              );
            })}
            <button type="submit" className="rounded-full bg-emerald px-5 py-2 text-sm font-semibold text-cream transition hover:bg-emerald-deep">Save notifications</button>
          </ActionForm>
        </section>
      )}

      {tab === "operations" && (
        <section className={`${CARD} p-6`}>
          <h2 className={SECTION_LABEL}>
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
              <span className={label}>Campus location (staff check-in)</span>
              <p className="-mt-1 mb-3 text-xs text-ink/50">
                Stand at the campus and check in on the attendance page — the card reports how far it
                thinks you are from this pin. Correct these numbers until that reads near zero, then
                switch enforcement on. Right-click the campus in Google Maps to copy its coordinates.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className={label}>Latitude</span>
                  <input type="number" step="any" name="campusLat" defaultValue={settings.attendance.campus.lat} className={field} />
                </label>
                <label className="block">
                  <span className={label}>Longitude</span>
                  <input type="number" step="any" name="campusLng" defaultValue={settings.attendance.campus.lng} className={field} />
                </label>
                <label className="block">
                  <span className={label}>Allowed radius (m)</span>
                  <input type="number" name="campusRadiusM" min={20} max={5000} defaultValue={settings.attendance.campus.radiusM} className={field} />
                </label>
                <label className="block">
                  <span className={label}>Reject fixes vaguer than (m)</span>
                  <input type="number" name="campusMaxAccuracyM" min={20} max={2000} defaultValue={settings.attendance.campus.maxAccuracyM} className={field} />
                </label>
              </div>
              <label className="mt-3 flex items-start gap-2 rounded-lg border border-emerald/10 bg-cream/20 px-3 py-2 text-sm">
                <input type="checkbox" name="campusEnforce" defaultChecked={settings.attendance.campus.enforce} className="mt-0.5 h-4 w-4 rounded accent-emerald" />
                <span>
                  <span className="font-semibold text-ink/80">Block attendance marked away from campus</span>
                  <span className="block text-xs text-ink/50">
                    Off: the distance is still recorded, nobody is stopped. On: check-in and the class
                    register are both refused off-campus, and the attempt is written to the audit log.
                  </span>
                </span>
              </label>
            </div>
  
            <div>
              <span className={label}>Features</span>
              <div className="space-y-2">
                {([
                  ["whatsappNotifications", "WhatsApp notifications", "Needs WHATSAPP_TOKEN set on the server."],
                  ["smsNotifications", "SMS notifications", "Needs SMS_TOKEN set on the server."],
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
      )}
    </div>
  );
}
