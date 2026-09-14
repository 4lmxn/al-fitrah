import "server-only";
import { FieldValue, type Firestore, type WriteBatch } from "firebase-admin/firestore";

const NOTES = "notes";

export const NOTES_PAGE_SIZE = 50;

export type NoteKind = "note" | "stage";

export type NoteInput = {
  text: string;
  author: string;
  kind: NoteKind;
};

export type StoredNote = {
  text: string;
  author: string;
  atMs: number | null;
  kind: NoteKind;
};

export function queueNote(
  db: Firestore,
  batch: WriteBatch,
  leadId: string,
  note: NoteInput,
): void {
  const leadRef = db.collection("leads").doc(leadId);
  batch.set(leadRef.collection(NOTES).doc(), {
    text: note.text,
    author: note.author,
    kind: note.kind,
    at: FieldValue.serverTimestamp(),
  });
  batch.update(leadRef, {
    noteCount: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export function noteCountOf(lead: FirebaseFirestore.DocumentData): number {
  if (typeof lead.noteCount === "number") return lead.noteCount;
  return Array.isArray(lead.notes) ? lead.notes.length : 0;
}

function fromLegacyArray(lead: FirebaseFirestore.DocumentData): StoredNote[] {
  const raw = Array.isArray(lead.notes) ? lead.notes : [];
  return raw.map((n: { text: string; author: string; at?: { toMillis?: () => number }; kind?: string }) => ({
    text: n.text,
    author: n.author,
    atMs: n.at?.toMillis?.() ?? null,
    kind: n.kind === "stage" ? ("stage" as const) : ("note" as const),
  }));
}

export async function readNotes(
  db: Firestore,
  leadId: string,
  lead: FirebaseFirestore.DocumentData,
): Promise<StoredNote[]> {
  return resolveNotes(await readNotesRaw(db, leadId), lead);
}

export async function readNotesRaw(db: Firestore, leadId: string): Promise<StoredNote[]> {
  const snap = await db
    .collection("leads")
    .doc(leadId)
    .collection(NOTES)
    .orderBy("at", "desc")
    .limit(NOTES_PAGE_SIZE)
    .get();

  return snap.docs.map((d) => {
    const n = d.data();
    return {
      text: n.text ?? "",
      author: n.author ?? "—",
      atMs: n.at?.toMillis?.() ?? null,
      kind: n.kind === "stage" ? ("stage" as const) : ("note" as const),
    };
  });
}

export function resolveNotes(
  notes: StoredNote[],
  lead: FirebaseFirestore.DocumentData,
): StoredNote[] {
  if (notes.length) return notes;
  return fromLegacyArray(lead).sort((a, b) => (b.atMs ?? 0) - (a.atMs ?? 0));
}
