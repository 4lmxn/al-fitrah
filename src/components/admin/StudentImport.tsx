"use client";
import { useActionState } from "react";
import Link from "next/link";
import { importStudents, type ImportOutcome } from "@/app/admin/(dash)/students/import/actions";
import { Icon } from "@/components/ui/Icon";
import { CARD } from "@/components/ui/styles";

const SAMPLE = `admissionNumber,firstName,lastName,dob,program,classSection,status,guardianName,guardianPhone,guardianEmail,feeTotal
AF-2025-0001,Yusuf,Khan,03/08/2022,Pre-KG,Rose,enrolled,Ayesha Khan,9876543210,ayesha@example.com,25000
,Maryam,Ahmed,2022-11-14,Junior KG,Tulip,enrolled,Bilal Ahmed,9876543211,,30000`;

export function StudentImport() {
  const [state, formAction, pending] = useActionState(
    async (_prev: ImportOutcome | null, formData: FormData) => importStudents(formData),
    null,
  );

  const previewed = state?.ok && state.previewOnly && state.preview.length > 0;
  const done = state?.ok && !state.previewOnly;

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald/15 bg-emerald/5 p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald text-cream">
          <Icon name="check" className="text-[26px]" />
        </span>
        <h2 className="mt-4 font-display text-2xl text-emerald-deep">
          {state.created} {state.created === 1 ? "student" : "students"} added
        </h2>
        {state.skipped.length > 0 && (
          <div className="mt-3 text-sm text-ink/70">
            <p className="font-semibold">{state.skipped.length} skipped — already on the roll:</p>
            <p className="mt-1 text-ink/55">{state.skipped.map((s) => s.admissionNumber).join(", ")}</p>
          </div>
        )}
        <div className="mt-6 flex gap-2">
          <Link href="/admin/students" className="rounded-full bg-emerald px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-emerald-deep">
            View the roll
          </Link>
          <Link href="/admin/students/import" className="rounded-full px-5 py-2.5 text-sm font-semibold text-emerald-deep ring-1 ring-inset ring-emerald/20 transition hover:bg-emerald/5">
            Import another file
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div className={`${CARD} p-6`}>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink/70">CSV file</span>
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            className="w-full rounded-lg border border-emerald/15 bg-cream/30 px-3 py-2 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-emerald file:px-4 file:py-1.5 file:text-xs file:font-semibold file:text-cream"
          />
        </label>

        <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-ink/70">or paste it</p>
        <textarea
          name="csv"
          rows={6}
          placeholder={SAMPLE}
          className="mt-1 w-full resize-y rounded-lg border border-emerald/15 bg-cream/30 px-3 py-2 font-mono text-xs text-ink outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/20"
        />

        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-semibold text-emerald">What columns does it need?</summary>
          <div className="mt-3 space-y-2 text-ink/70">
            <p>
              <b>Required:</b> firstName, guardianName, guardianPhone.{" "}
              <b>Optional:</b> admissionNumber, lastName, dob, program, classSection, status,
              guardianEmail, feeTotal.
            </p>
            <p>
              Dates can be <code>YYYY-MM-DD</code> or <code>DD/MM/YYYY</code>. Leave admissionNumber
              blank and one is issued. Rows whose admission number is already on the roll are
              skipped, so re-running the same file is safe.
            </p>
            <pre className="overflow-x-auto rounded-lg bg-cream/60 p-3 text-[11px] leading-relaxed">{SAMPLE}</pre>
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(`${SAMPLE}\n`)}`}
              download="al-fitrah-students-template.csv"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-xs font-semibold text-emerald-deep ring-1 ring-emerald/15 transition hover:bg-emerald/5"
            >
              <Icon name="download" className="text-[16px]" /> Download this as a CSV
            </a>
          </div>
        </details>
      </div>

      {state && !state.ok && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">{state.error}</p>
          {state.rowErrors.length > 0 && (
            <ul className="mt-2 max-h-56 overflow-y-auto text-sm text-red-700">
              {state.rowErrors.map((e) => (
                <li key={e.rowNumber}>Row {e.rowNumber}: {e.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {state?.unknownColumns && state.unknownColumns.length > 0 && (
        <p className="rounded-xl border border-gold/30 bg-gold-soft/40 px-4 py-3 text-xs text-[#7a611a]">
          Ignored unrecognised column{state.unknownColumns.length > 1 ? "s" : ""}:{" "}
          {state.unknownColumns.join(", ")}. Nothing in {state.unknownColumns.length > 1 ? "them" : "it"} will be imported.
        </p>
      )}

      {previewed && (
        <div className="overflow-hidden rounded-2xl border border-emerald/15 bg-white/90 shadow-soft">
          <p className="border-b border-emerald/10 bg-cream/40 px-5 py-3 text-sm font-semibold text-emerald-deep">
            {state.preview.length} {state.preview.length === 1 ? "row" : "rows"} ready — check them, then import
          </p>
          <div className="max-h-80 overflow-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="sticky top-0 bg-cream/60 text-[11px] uppercase tracking-wide text-ink/45">
                <tr>
                  <th className="px-4 py-2 font-semibold">Admission no.</th>
                  <th className="px-4 py-2 font-semibold">Name</th>
                  <th className="px-4 py-2 font-semibold">Program</th>
                  <th className="px-4 py-2 font-semibold">Class</th>
                  <th className="px-4 py-2 font-semibold">Guardian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald/5">
                {state.preview.map((r) => (
                  <tr key={r.rowNumber}>
                    <td className="px-4 py-2 tabular-nums text-ink/55">{r.admissionNumber ?? "auto"}</td>
                    <td className="px-4 py-2 font-medium text-emerald-deep">{[r.firstName, r.lastName].filter(Boolean).join(" ")}</td>
                    <td className="px-4 py-2 text-ink/70">{r.program}</td>
                    <td className="px-4 py-2 text-ink/70">{r.classSection ?? "—"}</td>
                    <td className="px-4 py-2 text-ink/70">{r.guardianName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-emerald-deep ring-1 ring-inset ring-emerald/20 transition hover:bg-emerald/5 disabled:opacity-60"
        >
          <Icon name="search" className="text-[18px]" /> {pending ? "Checking…" : "Check the file"}
        </button>
        {previewed && (
          <button
            type="submit"
            name="commit"
            value="true"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full bg-emerald px-6 py-2.5 text-sm font-semibold text-cream transition hover:bg-emerald-deep disabled:opacity-60"
          >
            <Icon name="upload" className="text-[18px] " /> Import {state.preview.length}{" "}
            {state.preview.length === 1 ? "student" : "students"}
          </button>
        )}
      </div>
    </form>
  );
}
