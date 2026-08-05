"use server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { attempt, fail, type ActionResult } from "@/lib/actionResult";
import { COLLECTION, academicYearFor, nextAdmissionNumber } from "@/lib/students";
import { parseStudentCsv, type ImportRow } from "@/lib/studentImport";
import { recordAudit } from "@/lib/audit";
import { getClassSections, getPrograms } from "@/lib/taxonomy";

// Firestore batches cap at 500 writes. Each student is one write, so this is
// well inside it — but the cap is why the import commits in chunks rather than
// building one giant batch and discovering the limit at 501 children.
const BATCH_SIZE = 200;

export type ImportOutcome = {
  ok: boolean;
  error?: string;
  created: number;
  skipped: { admissionNumber: string; reason: string }[];
  rowErrors: { rowNumber: number; message: string }[];
  unknownColumns: string[];
  /** True when nothing was written because the caller only asked for a preview. */
  previewOnly: boolean;
  preview: ImportRow[];
};

const empty = (): ImportOutcome => ({
  ok: true, created: 0, skipped: [], rowErrors: [], unknownColumns: [], previewOnly: true, preview: [],
});

/**
 * Parse a CSV and either preview it or write it.
 *
 * Preview is the default and the only way to reach a write is a second,
 * explicit submit. Bulk-creating children from a spreadsheet nobody has looked
 * at is how a roll ends up with 200 subtly wrong records that are far harder to
 * clean up than to prevent.
 */
export async function importStudents(formData: FormData): Promise<ImportOutcome> {
  const admin = await requireAdmin();

  const file = formData.get("file");
  const pasted = String(formData.get("csv") ?? "");
  let text = pasted.trim();
  if (!text && file instanceof File && file.size > 0) {
    if (file.size > 2 * 1024 * 1024) {
      return { ...empty(), ok: false, error: "That file is over 2 MB. Split it into smaller batches." };
    }
    text = (await file.text()).trim();
  }
  if (!text) return { ...empty(), ok: false, error: "Paste some CSV or choose a file." };

  // Validated against the school's configured lists, so an import is rejected
  // for a program this school does not offer rather than one it never shipped.
  const [programs, classSections] = await Promise.all([getPrograms(), getClassSections()]);
  const parsed = parseStudentCsv(text, { programs, classSections });
  const commit = formData.get("commit") === "true";

  // Refuse to write a file with any bad row. A partial import leaves the school
  // unsure which children made it, and re-running would duplicate the ones that
  // did — fix the spreadsheet and come back.
  if (parsed.errors.length) {
    return {
      ok: false,
      error: `${parsed.errors.length} row(s) need fixing before anything can be imported.`,
      created: 0,
      skipped: [],
      rowErrors: parsed.errors,
      unknownColumns: parsed.unknownColumns,
      previewOnly: true,
      preview: parsed.rows,
    };
  }

  if (!commit) {
    return { ...empty(), rowErrors: [], unknownColumns: parsed.unknownColumns, preview: parsed.rows };
  }

  const db = getDb();
  const year = academicYearFor();

  // Existing admission numbers, so a re-run skips rather than duplicates.
  // One read per 1000 via a projection-free query is still cheaper than a
  // per-row existence check, and the roll is small enough to hold in memory.
  const existingSnap = await db.collection(COLLECTION).select("admissionNumber").get();
  const taken = new Set<string>(existingSnap.docs.map((d) => d.data().admissionNumber).filter(Boolean));

  // Numbers we generate must not collide with each other or with the roll.
  let highest = [...taken].filter((n) => n.startsWith(`AF-${year.split("-")[0]}-`)).sort().pop() ?? null;

  const skipped: ImportOutcome["skipped"] = [];
  const toWrite: { admissionNumber: string; row: ImportRow }[] = [];

  for (const row of parsed.rows) {
    let admissionNumber = row.admissionNumber;
    if (admissionNumber) {
      if (taken.has(admissionNumber)) {
        skipped.push({ admissionNumber, reason: "already on the roll" });
        continue;
      }
    } else {
      admissionNumber = nextAdmissionNumber(year, highest);
      highest = admissionNumber;
    }
    taken.add(admissionNumber);
    toWrite.push({ admissionNumber, row });
  }

  let created = 0;
  for (let i = 0; i < toWrite.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const { admissionNumber, row } of toWrite.slice(i, i + BATCH_SIZE)) {
      batch.set(db.collection(COLLECTION).doc(), {
        admissionNumber,
        firstName: row.firstName,
        lastName: row.lastName,
        ...(row.dob ? { dob: new Date(`${row.dob}T00:00:00`) } : {}),
        program: row.program,
        classSection: row.classSection,
        academicYear: year,
        status: row.status,
        guardians: [
          {
            name: row.guardianName,
            phone: row.guardianPhone,
            email: row.guardianEmail,
            relationship: "Parent",
            isPrimary: true,
          },
        ],
        emergencyContact: null,
        medical: null,
        // Imported children have no enquiry behind them, which is the honest
        // record: they predate the CRM.
        leadId: null,
        fees: { totalPaise: row.feeTotalPaise, paidPaise: 0 },
        importedAt: FieldValue.serverTimestamp(),
        importedBy: admin.email,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      created += 1;
    }
    await batch.commit();
  }

  // Bulk creation is the single largest change anyone can make to the roll.
  await recordAudit({
    actor: admin.email,
    action: "student.imported",
    entity: { type: "student", id: "bulk" },
    summary: `Imported ${created} student${created === 1 ? "" : "s"} from a CSV`,
    meta: { created, skipped: skipped.length },
  });
  revalidatePath("/admin/students");
  revalidatePath("/admin/fees");

  return { ok: true, created, skipped, rowErrors: [], unknownColumns: parsed.unknownColumns, previewOnly: false, preview: [] };
}

/** Server-action wrapper for forms that only need pass/fail. */
export async function importStudentsAction(formData: FormData): Promise<ActionResult> {
  return attempt("importStudents", async () => {
    const result = await importStudents(formData);
    return result.ok ? { ok: true as const } : fail(result.error ?? "Import failed.");
  });
}
