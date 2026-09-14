import "server-only";
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { COLLECTION as STUDENTS } from "@/lib/students";

const DOCUMENTS = "documents";

export const MAX_DOCUMENTS = 25;

export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

export const DOCUMENT_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

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
  label: string;
  path: string;
  contentType: string;
  sizeBytes: number;
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

export async function listDocuments(studentId: string): Promise<StudentDocument[]> {
  const snap = await ref(getDb(), studentId).orderBy("at", "desc").limit(MAX_DOCUMENTS).get();
  return snap.docs.map(toDocument);
}

export async function getDocument(
  studentId: string,
  docId: string,
): Promise<StudentDocument | null> {
  const doc = await ref(getDb(), studentId).doc(docId).get();
  if (!doc.exists) return null;
  return toDocument(doc as FirebaseFirestore.QueryDocumentSnapshot);
}

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

export async function addDocument(studentId: string, doc: NewDocument): Promise<string> {
  const docRef = ref(getDb(), studentId).doc();
  await docRef.set({ ...doc, at: FieldValue.serverTimestamp() });
  return docRef.id;
}

export async function removeDocument(studentId: string, docId: string): Promise<void> {
  await ref(getDb(), studentId).doc(docId).delete();
}
