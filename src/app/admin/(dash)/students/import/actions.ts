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
import { guardianEmailsFrom, guardianPhonesFrom } from "@/lib/students";

const BATCH_SIZE = 200;

export type ImportOutcome = {
  ok: boolean;
  error?: string;
  created: number;
  skipped: { admissionNumber: string; reason: string }[];
  rowErrors: { rowNumber: number; message: string }[];
  unknownColumns: string[];
  previewOnly: boolean;
  preview: ImportRow[];
};

const empty = (): ImportOutcome => ({
  ok: true, created: 0, skipped: [], rowErrors: [], unknownColumns: [], previewOnly: true, preview: [],
});

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

  const [programs, classSections] = await Promise.all([getPrograms(), getClassSections()]);
  const parsed = parseStudentCsv(text, { programs, classSections });
  const commit = formData.get("commit") === "true";

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

  const existingSnap = await db.collection(COLLECTION).select("admissionNumber").get();
  const taken = new Set<string>(existingSnap.docs.map((d) => d.data().admissionNumber).filter(Boolean));

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
        guardianPhones: guardianPhonesFrom([{ phone: row.guardianPhone }]),
        guardianEmails: guardianEmailsFrom([{ email: row.guardianEmail }]),
        emergencyContact: null,
        medical: null,
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

export async function importStudentsAction(formData: FormData): Promise<ActionResult> {
  return attempt("importStudents", async () => {
    const result = await importStudents(formData);
    return result.ok ? { ok: true as const } : fail(result.error ?? "Import failed.");
  });
}
