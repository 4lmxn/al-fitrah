import Link from "next/link";
import { listResources, AUDIENCES, AUDIENCE_LABEL, isHidden, type Resource } from "@/lib/resources";
import { ACCEPTED_RESOURCE_TYPES, MAX_RESOURCE_BYTES } from "@/lib/storage";
import { getClassSections } from "@/lib/taxonomy";
import { academicYearFor } from "@/lib/students";
import { requireAdmin } from "@/lib/adminAuth";
import { ActionForm } from "@/components/admin/ActionForm";
import { Icon } from "@/components/ui/Icon";
import { createResource, deleteResource, updateResource } from "./actions";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-lg border border-emerald/15 bg-cream/30 px-3 py-2 text-sm text-ink outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/20";
const label = "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink/45";

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function AudienceChoice({ resource }: { resource?: Resource }) {
  return (
    <fieldset>
      <legend className={label}>Shared with</legend>
      <div className="flex flex-wrap gap-3">
        {AUDIENCES.map((a) => (
          <label key={a} className="flex items-center gap-2 text-sm text-ink/70">
            <input
              type="checkbox"
              name="audience"
              value={a}
              defaultChecked={resource?.audience.includes(a) ?? false}
              className="h-4 w-4 accent-emerald"
            />
            {AUDIENCE_LABEL[a]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string }>;
}) {
  const sp = await searchParams;
  const cursor = Number(sp.after) || undefined;
  const [admin, { rows, nextCursor }, sections] = await Promise.all([
    requireAdmin(),
    listResources(cursor),
    getClassSections(),
  ]);

  const accepted = [...new Set(Object.values(ACCEPTED_RESOURCE_TYPES))].join(", ");

  return (
    <div className="mx-auto max-w-4xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Content</p>
        <h1 className="mt-1 font-display text-3xl text-emerald-deep">Resources</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink/55">
          Newsletters, worksheets, forms and calendars. Files shared with anyone are published on
          the website; everything else stays behind a sign-in.
        </p>
      </div>

      <section className="mt-7 rounded-2xl border border-emerald/10 bg-white/90 p-6 shadow-soft">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
          <Icon name="upload_file" className="text-[18px] text-gold" /> Share a file
        </h2>
        <ActionForm action={createResource} className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className={label}>Title</span>
              <input name="title" required placeholder="August newsletter" className={field} />
            </label>
            <label className="block sm:col-span-2">
              <span className={label}>Description</span>
              <textarea name="description" rows={2} className={field} />
            </label>
            <label className="block">
              <span className={label}>Category</span>
              <input name="category" placeholder="Newsletter" className={field} />
            </label>
            <label className="block">
              <span className={label}>Class</span>
              <select name="classSection" defaultValue="" className={field}>
                <option value="">All classes</option>
                {sections.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={label}>Academic year</span>
              <input name="academicYear" defaultValue={academicYearFor()} className={field} />
            </label>
            <label className="block">
              <span className={label}>File</span>
              <input type="file" name="file" required className={`${field} py-1.5`} />
            </label>
            <div className="sm:col-span-2">
              <AudienceChoice />
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald px-5 py-2 text-sm font-semibold text-cream transition hover:bg-emerald-deep"
          >
            <Icon name="upload" className="text-[18px]" /> Upload
          </button>
          <p className="mt-2 text-[11px] text-ink/45">
            {accepted}. Up to {Math.round(MAX_RESOURCE_BYTES / (1024 * 1024))} MB. Leave every box
            unticked to keep a file uploaded but visible to nobody.
          </p>
        </ActionForm>
      </section>

      {rows.length === 0 ? (
        <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl border border-emerald/10 bg-white/90 p-16 text-center shadow-soft">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald/5 text-emerald/40">
            <Icon name="folder_open" className="text-[30px]" />
          </span>
          <p className="font-display text-lg text-emerald-deep">Nothing shared yet</p>
          <p className="max-w-sm text-sm text-ink/50">
            Upload a newsletter or a form above and choose who should see it.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {rows.map((r) => (
            <section key={r.id} className="rounded-2xl border border-emerald/10 bg-white/90 p-6 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-lg text-emerald-deep">{r.title}</h3>
                  <p className="mt-0.5 text-xs text-ink/50">
                    {r.fileName} · {fmtSize(r.sizeBytes)} · {r.academicYear}
                    {r.classSection ? ` · ${r.classSection}` : ""}
                    {r.category ? ` · ${r.category}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-ink/45">
                    {r.downloadCount} {r.downloadCount === 1 ? "download" : "downloads"} · uploaded by{" "}
                    {r.uploadedBy}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isHidden(r) ? (
                    <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-semibold text-ink/50">
                      Shared with nobody
                    </span>
                  ) : (
                    r.audience.map((a) => (
                      <span
                        key={a}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          a === "public" ? "bg-gold/15 text-emerald-deep" : "bg-emerald/8 text-emerald-deep"
                        }`}
                      >
                        {AUDIENCE_LABEL[a]}
                      </span>
                    ))
                  )}
                  <a
                    href={r.publicUrl ?? `/api/resources/${r.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-emerald-deep ring-1 ring-emerald/20 transition hover:bg-emerald/5"
                  >
                    <Icon name="download" className="text-[16px]" /> Open
                  </a>
                </div>
              </div>

              <ActionForm action={updateResource} className="mt-4 grid gap-3 sm:grid-cols-3">
                <input type="hidden" name="id" value={r.id} />
                <label className="block sm:col-span-3">
                  <span className={label}>Title</span>
                  <input name="title" defaultValue={r.title} className={field} />
                </label>
                <label className="block sm:col-span-3">
                  <span className={label}>Description</span>
                  <textarea name="description" rows={2} defaultValue={r.description} className={field} />
                </label>
                <label className="block">
                  <span className={label}>Category</span>
                  <input name="category" defaultValue={r.category} className={field} />
                </label>
                <label className="block">
                  <span className={label}>Class</span>
                  <select name="classSection" defaultValue={r.classSection ?? ""} className={field}>
                    <option value="">All classes</option>
                    {sections.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className={label}>Academic year</span>
                  <input name="academicYear" defaultValue={r.academicYear} className={field} />
                </label>
                <div className="sm:col-span-3">
                  <AudienceChoice resource={r} />
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
                  <button
                    type="submit"
                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-deep ring-1 ring-emerald/20 transition hover:bg-emerald/5"
                  >
                    Save
                  </button>
                  <span className="text-[11px] text-ink/45">
                    Adding or removing “Anyone” moves the file between the public website and the
                    private area, so an un-shared file stops being reachable by its old link.
                  </span>
                </div>
              </ActionForm>

              {admin.role === "owner" && (
                <ActionForm
                  action={deleteResource}
                  className="mt-3"
                  confirm={`Delete “${r.title}”? The file itself is deleted, not just the listing, so any link to it stops working. This cannot be undone.`}
                >
                  <input type="hidden" name="id" value={r.id} />
                  <button
                    type="submit"
                    className="text-xs font-semibold text-red-700/80 underline-offset-2 transition hover:underline"
                  >
                    Delete this file
                  </button>
                </ActionForm>
              )}
            </section>
          ))}
        </div>
      )}

      {(nextCursor || cursor) && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3">
          {cursor ? (
            <Link
              href="/admin/resources"
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-deep shadow-soft ring-1 ring-emerald/10 transition hover:bg-emerald/5"
            >
              <Icon name="first_page" className="text-[18px]" /> First page
            </Link>
          ) : (
            <span />
          )}
          {nextCursor && (
            <Link
              href={`/admin/resources?after=${nextCursor}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-deep shadow-soft ring-1 ring-emerald/10 transition hover:bg-emerald/5"
            >
              Next <Icon name="arrow_forward" className="text-[18px]" />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
