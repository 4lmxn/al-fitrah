import { requireAdmin } from "@/lib/adminAuth";
import { listStaff } from "@/lib/staff";
import { getAllowlist, getOwners } from "@/lib/roles";
import { Icon } from "@/components/ui/Icon";
import { ActionForm } from "@/components/admin/ActionForm";
import { createStaff, deleteStaff, setStaffAccess, updateStaff } from "./actions";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-lg border border-emerald/15 bg-cream/30 px-3 py-2 text-sm text-ink outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/20";
const label = "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink/45";

export default async function StaffAdmin() {
  const [admin, staff] = await Promise.all([requireAdmin(), listStaff()]);
  const envAllow = getAllowlist();
  const envOwners = getOwners();
  const isOwner = admin.role === "owner";

  const withAccess = staff.filter((s) => s.access && s.status === "active").length;
  const envOnly = envAllow.filter((e) => !staff.some((s) => s.email === e));

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">People</p>
          <h1 className="mt-1 font-display text-3xl text-emerald-deep">Staff</h1>
          <p className="mt-1 text-sm text-ink/55">
            {staff.length} on the list · {withAccess} can sign in to the console.
          </p>
        </div>
      </div>

      {envOwners.length === 0 && (
        <p className="mt-6 rounded-xl border border-gold/30 bg-gold-soft/60 px-4 py-3 text-sm text-ink/75">
          <Icon name="info" className="mr-1.5 align-[-4px] text-[18px] text-gold" />
          No owner is set yet, so <strong>every account here can delete anything</strong>. Give one person
          owner below and the split starts applying.
        </p>
      )}

      <section className="mt-7 rounded-2xl border border-emerald/10 bg-white/90 p-6 shadow-soft">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
          <Icon name="person_add" className="text-[18px] text-gold" /> Add someone
        </h2>
        <ActionForm action={createStaff} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Name</span>
            <input name="name" required className={field} />
          </label>
          <label className="block">
            <span className={label}>Designation</span>
            <input name="designation" placeholder="Class teacher" className={field} />
          </label>
          <label className="block">
            <span className={label}>Google email (for console access)</span>
            <input name="email" type="email" className={field} />
          </label>
          <label className="block">
            <span className={label}>Phone</span>
            <input name="phone" inputMode="tel" className={field} />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-emerald px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-emerald-deep"
            >
              <Icon name="add" className="text-[18px]" /> Add to staff
            </button>
          </div>
        </ActionForm>
      </section>

      {staff.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-emerald/20 px-5 py-8 text-center text-sm text-ink/50">
          Nobody on the staff list yet.
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {staff.map((s) => (
            <li key={s.id} className="rounded-2xl border border-emerald/10 bg-white/90 p-5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-emerald-deep">
                    {s.name}
                    {s.status === "inactive" && (
                      <span className="ml-2 rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-semibold text-ink/50">
                        Inactive
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-ink/50">
                    {s.designation || "—"}
                    {s.email ? ` · ${s.email}` : ""}
                    {s.phone ? ` · ${s.phone}` : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    s.access && s.status === "active"
                      ? s.role === "owner"
                        ? "bg-emerald text-cream"
                        : "bg-emerald/10 text-emerald-deep"
                      : "bg-ink/5 text-ink/45"
                  }`}
                >
                  {s.access && s.status === "active" ? (s.role === "owner" ? "Owner" : "Console access") : "No access"}
                </span>
              </div>

              {!isOwner && (s.access || s.email) ? (
                <p className="mt-4 border-t border-emerald/10 pt-4 text-xs text-ink/45">
                  {s.access
                    ? "This record grants console access, so only an owner can edit it."
                    : "Only an owner can change the email a record signs in with."}
                </p>
              ) : (
              <ActionForm action={updateStaff} className="mt-4 grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={s.id} />
                <label className="block">
                  <span className={label}>Name</span>
                  <input name="name" required defaultValue={s.name} className={field} />
                </label>
                <label className="block">
                  <span className={label}>Designation</span>
                  <input name="designation" defaultValue={s.designation} className={field} />
                </label>
                <label className="block">
                  <span className={label}>Google email</span>
                  <input name="email" type="email" defaultValue={s.email ?? ""} className={field} />
                </label>
                <label className="block">
                  <span className={label}>Phone</span>
                  <input name="phone" inputMode="tel" defaultValue={s.phone} className={field} />
                </label>
                <label className="block">
                  <span className={label}>Status</span>
                  <select name="status" defaultValue={s.status} className={field}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
                <label className="block">
                  <span className={label}>Note</span>
                  <input name="note" defaultValue={s.note ?? ""} className={field} />
                </label>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-deep ring-1 ring-emerald/15 transition hover:bg-emerald/5"
                  >
                    Save details
                  </button>
                </div>
              </ActionForm>
              )}

              {isOwner ? (
                <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-emerald/10 pt-4">
                  <ActionForm action={setStaffAccess} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={s.id} />
                    <label className="block">
                      <span className={label}>Console access</span>
                      <select name="access" defaultValue={s.access ? "yes" : "no"} className={`${field} w-32`}>
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className={label}>Role</span>
                      <select name="role" defaultValue={s.role} className={`${field} w-36`}>
                        <option value="staff">Staff</option>
                        <option value="owner">Owner — can delete</option>
                      </select>
                    </label>
                    <button
                      type="submit"
                      className="rounded-full bg-emerald px-4 py-2 text-sm font-semibold text-cream transition hover:bg-emerald-deep"
                    >
                      Apply
                    </button>
                  </ActionForm>

                  <ActionForm action={deleteStaff} className="ml-auto">
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      className="rounded-full px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </ActionForm>
                </div>
              ) : (
                <p className="mt-4 border-t border-emerald/10 pt-4 text-xs text-ink/45">
                  Only an owner can change who signs in to the console.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {envOnly.length > 0 && (
        <section className="mt-8 rounded-2xl border border-emerald/10 bg-cream/40 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/50">
            Also signed in, from configuration
          </h2>
          <p className="mt-2 text-sm text-ink/60">
            These addresses are set in <code className="rounded bg-white px-1.5 py-0.5 text-xs">ADMIN_EMAILS</code>{" "}
            and always keep access, whatever this list says. They are the way back in if the staff list is
            ever wrong.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {envOnly.map((e) => (
              <li key={e} className="rounded-full bg-white px-3 py-1 text-xs text-ink/60 ring-1 ring-emerald/10">
                {e}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
