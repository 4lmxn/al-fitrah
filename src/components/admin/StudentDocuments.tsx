import { Icon } from "@/components/ui/Icon";
import { ActionForm } from "@/components/admin/ActionForm";
import {
  deleteStudentDocumentAction,
  uploadStudentDocumentAction,
} from "@/app/admin/(dash)/students/actions";
import { MAX_DOCUMENTS, type StudentDocument } from "@/lib/studentDocuments";
import { formatDate } from "@/lib/relativeTime";
import { formatBytes } from "@/lib/bytes";
import { CARD, SECTION_LABEL } from "@/components/ui/styles";
import { fileIcon } from "@/components/ui/fileIcon";

export function StudentDocuments({
  studentId,
  documents,
  canDelete,
}: {
  studentId: string;
  documents: StudentDocument[];
  canDelete: boolean;
}) {
  const full = documents.length >= MAX_DOCUMENTS;

  return (
    <div className="mt-7 space-y-3">
      <section className={`${CARD} p-6`}>
        <h2 className={SECTION_LABEL}>
          <Icon name="folder" className="text-[18px] text-gold" /> Documents
          <span className="ml-auto text-xs font-normal normal-case text-ink/40">
            {documents.length} of {MAX_DOCUMENTS}
          </span>
        </h2>

        {documents.length === 0 ? (
          <p className="mt-4 text-sm text-ink/50">
            Nothing on file. Guardians can add documents from the parent portal, or you can add
            them here.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-emerald/5">
            {documents.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald/8 text-emerald-deep">
                  <Icon name={fileIcon(d.contentType)} className="text-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-emerald-deep">
                    {d.label}
                  </span>
                  <span className="block text-[11px] text-ink/45">
                    {formatBytes(d.sizeBytes)} · {formatDate(d.atMs)} ·{" "}
                    {d.uploadedByRole === "parent" ? "from a guardian" : "added by the school"}
                    <span className="ml-1 text-ink/35">({d.uploadedBy})</span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <a
                    href={`/admin/students/${studentId}/documents/${d.id}`}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-emerald/8 px-3 text-xs font-semibold text-emerald-deep transition hover:bg-emerald/15"
                  >
                    <Icon name="download" className="text-[16px]" />
                    Open
                  </a>
                  {canDelete && (
                    <ActionForm
                      action={deleteStudentDocumentAction}
                      errorClassName="sr-only"
                      confirm={`Delete “${d.label}”? This is the child's record and the file itself is deleted. If a guardian uploaded it, they will have to send it again. This cannot be undone.`}
                    >
                      <input type="hidden" name="id" value={studentId} />
                      <input type="hidden" name="docId" value={d.id} />
                      <button
                        type="submit"
                        aria-label={`Remove ${d.label}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink/35 transition hover:bg-red-50 hover:text-red-700"
                      >
                        <Icon name="delete" className="text-[17px]" />
                      </button>
                    </ActionForm>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!full && (
        <ActionForm
          action={uploadStudentDocumentAction}
          className={`${CARD} p-6`}
        >
          <input type="hidden" name="id" value={studentId} />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/50">Add a document</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
            className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-emerald px-5 text-sm font-semibold text-cream transition hover:bg-emerald-deep"
          >
            <Icon name="upload" className="text-[18px]" />
            Add document
          </button>
          <p className="mt-2 text-[11px] text-ink/45">PDF, JPG, PNG or WebP, up to 8 MB.</p>
        </ActionForm>
      )}
    </div>
  );
}
