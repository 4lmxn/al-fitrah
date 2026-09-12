import "server-only";
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { COLLECTION as STUDENTS } from "@/lib/students";

/**
 * A child's documents — birth certificate, ID proof, medical papers.
 *
 * This is the most sensitive thing the system holds. Not because any single
 * file is dramatic, but because of what a collection of them is: a child's
 * identity documents, uploaded by their parent, held by a school. Under DPDP
 * that is exactly the category that has to be handled deliberately rather than
 * as "just another upload".
 *
 * Three rules follow from that, and they are enforced here rather than left to
 * each caller to remember:
 *
 *   1. A path is stored, never a URL. The bucket is private with public access
 *      prevention enforced, so no address for these files works without a
 *      session, and no link can be forwarded to someone who should not have it.
 *
 *   2. Reads go through an authenticated route on each side — admins through
 *      the console, guardians through the portal — and each side proves its own
 *      right to the file. This module never decides who is allowed; it only
 *      fetches, so a caller cannot accidentally inherit the wrong gate.
 *
 *   3. Nothing is hard-deleted by a parent. Removing a document is an admin
 *      action, because a school may be required to hold what it was given.
 *
 * ── Retention is an open question, deliberately ─────────────────────────────
 *
 * There is no TTL on this collection and no automatic deletion, because how
 * long a school must keep a child's records after they leave is a question for
 * the school and its obligations, not a default a developer should invent.
 * Recorded in docs/school-facts-needed.md. Until it is answered, documents are
 * kept, which is the recoverable direction.
 */

export const DOCUMENTS = "documents";

/** Bounded: a child has a handful of documents, and a list that grows without limit is the pattern this codebase keeps removing. */
export const MAX_DOCUMENTS = 25;

/**
 * 8 MB. A photographed birth certificate from a phone lands around 3–5 MB, so
 * this clears the real case without making a parent-facing upload form a way to
 * fill the bucket.
 */
export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

export const DOCUMENT_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Magic bytes for the accepted formats. The browser's declared type is
 * attacker-controlled and these files are streamed back to a logged-in admin's
 * browser, so the actual bytes decide.
 */
const SIGNATURES: [string, number[]][] = [
  ["application/pdf", [0x25, 0x50, 0x44, 0x46]],
  ["image/jpeg", [0xff, 0xd8, 0xff]],
  ["image/png", [0x89, 0x50, 0x4e, 0x47]],
  ["image/webp", [0x52, 0x49, 0x46, 0x46]], // RIFF….WEBP
];

export function detectDocumentType(buf: Uint8Array): string | null {
  for (const [type, sig] of SIGNATURES) {
    if (sig.every((byte, i) => buf[i] === byte)) {
      if (type === "image/webp") {
        const tag = String.fromCharCode(...buf.slice(8, 12));
        if (tag !== "WEBP") continue;
      }
      return type;
    }
  }
  return null;
}

export type StudentDocument = {
  id: string;
  /** What a person calls it — "Birth certificate", not "IMG_4821.jpg". */
  label: string;
  path: string;
  contentType: string;
  sizeBytes: number;
  /** Email for staff, the verified email or phone for a guardian. */
  uploadedBy: string;
  uploadedByRole: "staff" | "parent";
  atMs: number | null;
};

function toDocument(d: FirebaseFirestore.QueryDocumentSnapshot): StudentDocument {
  const x = d.data();
  return {
    id: d.id,
    label: x.label ?? "Document",
    path: x.path ?? "",
    contentType: x.contentType ?? "application/octet-stream",
    sizeBytes: Number(x.sizeBytes) || 0,
    uploadedBy: x.uploadedBy ?? "—",
    uploadedByRole: x.uploadedByRole === "parent" ? "parent" : "staff",
    atMs: x.at?.toMillis?.() ?? null,
  };
}

function ref(db: Firestore, studentId: string) {
  return db.collection(STUDENTS).doc(studentId).collection(DOCUMENTS);
}

/**
 * A child's documents, newest first.
 *
 * No authorisation here on purpose — see rule 2 above. The admin console and
 * the parent portal each prove their own right to this child before calling.
 */
export async function listDocuments(studentId: string): Promise<StudentDocument[]> {
  const snap = await ref(getDb(), studentId).orderBy("at", "desc").limit(MAX_DOCUMENTS).get();
  return snap.docs.map(toDocument);
}

/** One document, or null. Same rule: the caller has already proved its right. */
export async function getDocument(
  studentId: string,
  docId: string,
): Promise<StudentDocument | null> {
  const doc = await ref(getDb(), studentId).doc(docId).get();
  if (!doc.exists) return null;
  return toDocument(doc as FirebaseFirestore.QueryDocumentSnapshot);
}

/** How many are already on file. Used to enforce MAX_DOCUMENTS before storing bytes. */
export async function countDocuments(studentId: string): Promise<number> {
  const snap = await ref(getDb(), studentId).count().get();
  return snap.data().count;
}

export type NewDocument = {
  label: string;
  path: string;
  contentType: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedByRole: "staff" | "parent";
};

/** Record a stored document. The bytes are written first; this is the index entry. */
export async function addDocument(studentId: string, doc: NewDocument): Promise<string> {
  const docRef = ref(getDb(), studentId).doc();
  await docRef.set({ ...doc, at: FieldValue.serverTimestamp() });
  return docRef.id;
}

/** Remove the index entry. Admin-only by rule 3; the caller enforces that. */
export async function removeDocument(studentId: string, docId: string): Promise<void> {
  await ref(getDb(), studentId).doc(docId).delete();
}
