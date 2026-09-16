import { Icon } from "@/components/ui/Icon";
import { ActionForm } from "@/components/admin/ActionForm";
import { uploadDocument } from "@/app/portal/[studentId]/actions";
import { MAX_DOCUMENTS, type StudentDocument } from "@/lib/studentDocuments";
import { formatDate } from "@/lib/relativeTime";
import { formatBytes } from "@/lib/bytes";

const ICON_FOR: Record<string, string> = {
  "application/pdf": "picture_as_pdf",
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
};

export function PortalDocuments({
  studentId,
  documents,
}: {
  studentId: string;
  documents: StudentDocument[];
}) {
  const full = documents.length >= MAX_DOCUMENTS;

  return (
    <section className="mt-8 rounded-2xl border border-emerald/10 bg-white/90 p-6 shadow-soft">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/50">
        <Icon name="folder" className="text-[18px] text-gold" /> Documents
      </h2>

      {documents.length === 0 ? (
        <p className="mt-4 text-sm text-ink/50">
          Nothing on file yet. You can add your child&apos;s birth certificate, ID proof or
          medical papers here.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-emerald/5">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center gap-3 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald/8 text-emerald-deep">
                <Icon name={ICON_FOR[d.contentType] ?? "description"} className="text-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-emerald-deep">{d.label}</span>
                <span className="block text-[11px] text-ink/45">
                  {formatBytes(d.sizeBytes)} · {formatDate(d.atMs)}
                  {d.uploadedByRole === "staff" && " · added by the school"}
                </span>
              </span>
              <a
                href={`/portal/${studentId}/documents/${d.id}`}
                className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-emerald/8 px-3 text-xs font-semibold text-emerald-deep transition hover:bg-emerald/15"
              >
                <Icon name="download" className="text-[16px]" />
                Download
              </a>
            </li>
          ))}
        </ul>
      )}

      {full ? (
        <p className="mt-5 rounded-xl bg-gold-soft/40 px-4 py-3 text-xs text-[#7a611a]">
          There are {MAX_DOCUMENTS} documents on this record, which is the limit. Please ask the
          school office if you need to add another.
        </p>
      ) : (
        <ActionForm action={uploadDocument} className="mt-5 border-t border-emerald/10 pt-5">
          <input type="hidden" name="studentId" value={studentId} />
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink/45">
                What is it?
              </span>
              <input
                name="label"
                required
                maxLength={80}
                placeholder="e.g. Birth certificate"
                className="w-full rounded-lg border border-emerald/15 bg-cream/30 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/20"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink/45">
                File
              </span>
              <input
                type="file"
                name="file"
                required
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="w-full rounded-lg border border-emerald/15 bg-cream/30 px-3 py-2 text-xs text-ink/70 outline-none file:mr-3 file:rounded-md file:border-0 file:bg-emerald/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-emerald-deep"
              />
            </label>
          </div>
          <button
            type="submit"
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald px-6 text-sm font-semibold text-cream transition hover:bg-emerald-deep sm:w-auto"
          >
            <Icon name="upload" className="text-[18px]" />
            Add document
          </button>
          <p className="mt-2 text-[11px] text-ink/45">
            PDF, JPG, PNG or WebP, up to 8 MB. Only you and the school can see these. To remove
            something, please ask the office.
          </p>
        </ActionForm>
      )}
    </section>
  );
}
