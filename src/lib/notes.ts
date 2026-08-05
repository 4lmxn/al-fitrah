import "server-only";
import { FieldValue, type Firestore, type WriteBatch } from "firebase-admin/firestore";

// Lead activity timeline.
//
// Notes used to live in a `notes` array on the lead document. That had a hard
// ceiling: Firestore documents cap at 1 MiB, and stage changes append to the
// same array, so a busy lead would eventually reject every further write —
// no notes, no stage moves — with an opaque error. It was also read-amplifying:
// the inbox pulls every lead of a type and only wants `notes.length`, but paid
// to transfer the entire note history of every lead to get it.
//
// Notes now live in `leads/{id}/notes/{noteId}`, with a denormalised
// `noteCount` on the parent so list views never touch the subcollection.

export const NOTES = "notes";

// How many timeline entries the detail page loads. Older entries stay in
// Firestore; nobody scrolls two years of call logs, and an unbounded read here
// would reintroduce the cost problem this module exists to remove.
// ponytail: fixed window, add a "load older" cursor if staff ever ask for it.
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

/**
 * Queue a timeline entry and its counter bump onto a batch.
 *
 * Both halves must land together — a note without the increment makes
 * `noteCount` (and therefore the "untouched new lead" attention rule) wrong,
 * and an increment without a note inflates the badge over a note nobody can
 * read. Callers commit the batch.
 */
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

/** Note count for a list row, tolerating both storage shapes. */
export function noteCountOf(lead: FirebaseFirestore.DocumentData): number {
  if (typeof lead.noteCount === "number") return lead.noteCount;
  // Pre-migration lead: fall back to the legacy array length.
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

/**
 * Read a lead's timeline, newest first.
 *
 * Reads the subcollection, and falls back to the legacy array only when the
 * subcollection is empty. That fallback is what makes this safe to deploy
 * *before* the backfill runs: in the window between deploy and migration, old
 * leads still render their full history instead of appearing blank.
 */
export async function readNotes(
  db: Firestore,
  leadId: string,
  lead: FirebaseFirestore.DocumentData,
): Promise<StoredNote[]> {
  return resolveNotes(await readNotesRaw(db, leadId), lead);
}

/**
 * Fetch the timeline without needing the parent document.
 *
 * Split out so a caller that also wants the lead can issue both requests at
 * once. The subcollection path is derivable from the id alone, so waiting for
 * the parent first bought nothing and cost a round trip — which is the dominant
 * latency in a page like this, not the query.
 */
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

/** Apply the legacy-array fallback once both the notes and the lead are in hand. */
export function resolveNotes(
  notes: StoredNote[],
  lead: FirebaseFirestore.DocumentData,
): StoredNote[] {
  if (notes.length) return notes;
  return fromLegacyArray(lead).sort((a, b) => (b.atMs ?? 0) - (a.atMs ?? 0));
}
