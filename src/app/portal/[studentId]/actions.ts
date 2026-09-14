"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { assertOwnStudent, getParentSession } from "@/lib/parentAuth";
import { attempt, fail, type ActionResult } from "@/lib/actionResult";
import { rateLimited } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/clientIp";
import { recordAudit } from "@/lib/audit";
import { uploadStudentDocument } from "@/lib/storage";
import {
  DOCUMENT_TYPES,
  MAX_DOCUMENTS,
  MAX_DOCUMENT_BYTES,
  addDocument,
  countDocuments,
  detectDocumentType,
} from "@/lib/studentDocuments";

export async function uploadDocument(formData: FormData): Promise<ActionResult> {
  return attempt("portal.uploadDocument", async () => {
    const session = await getParentSession();
    if (!session) return fail("Your session has expired. Please sign in again.");

    const studentId = String(formData.get("studentId") ?? "");
    if (!studentId || !(await assertOwnStudent(studentId))) {
      return fail("That child is not on your account.");
    }

    const ip = getClientIp(await asRequest());
    if (ip !== "unknown" && (await rateLimited(`portal-upload:${ip}`, { max: 10, windowMs: 10 * 60_000 }))) {
      return fail("Too many uploads just now. Please wait a few minutes and try again.");
    }

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return fail("Choose a file first.");
    if (file.size > MAX_DOCUMENT_BYTES) return fail("Files must be 8 MB or smaller.");

    const label = String(formData.get("label") ?? "").trim().slice(0, 80);
    if (!label) return fail("Give the document a name, so the office knows what it is.");

    if ((await countDocuments(studentId)) >= MAX_DOCUMENTS) {
      return fail(
        `There are already ${MAX_DOCUMENTS} documents on this record. Please ask the office to remove one first.`,
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sniffed = detectDocumentType(buffer);
    if (!sniffed) return fail("That file isn't a PDF, JPG, PNG or WebP.");

    const docId = crypto.randomUUID();
    const { path } = await uploadStudentDocument(studentId, docId, {
      buffer,
      contentType: sniffed,
      ext: DOCUMENT_TYPES[sniffed] ?? "bin",
    });

    await addDocument(studentId, {
      label,
      path,
      contentType: sniffed,
      sizeBytes: file.size,
      uploadedBy: session.phone,
      uploadedByRole: "parent",
    });

    await recordAudit({
      actor: session.phone,
      action: "student.document_added",
      entity: { type: "student", id: studentId },
      summary: `Guardian uploaded "${label}"`,
      meta: { sizeBytes: file.size, contentType: sniffed },
    });

    revalidatePath(`/portal/${studentId}`);
    return { ok: true };
  });
}

async function asRequest(): Promise<Request> {
  const h = await headers();
  return new Request("https://portal.local/", { headers: h });
}
