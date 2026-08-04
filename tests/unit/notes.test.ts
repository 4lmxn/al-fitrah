import { describe, expect, it, vi } from "vitest";
import { noteCountOf, queueNote, readNotes, NOTES_PAGE_SIZE } from "@/lib/notes";

// Minimal Firestore doubles. Enough to assert what the batch is asked to do and
// what shape the reads come back in, without an emulator.
function fakeDb(noteDocs: unknown[] = []) {
  const calls = { sets: [] as { path: string; data: Record<string, unknown> }[], updates: [] as Record<string, unknown>[] };

  const notesCollection = {
    doc: () => ({ __path: "leads/L1/notes/generated" }),
    orderBy: () => notesCollection,
    limit: () => notesCollection,
    get: async () => ({
      empty: noteDocs.length === 0,
      docs: noteDocs.map((d) => ({ data: () => d })),
    }),
  };

  const leadRef = { collection: () => notesCollection };

  const db = { collection: () => ({ doc: () => leadRef }) };

  const batch = {
    set: (ref: { __path: string }, data: Record<string, unknown>) => calls.sets.push({ path: ref.__path, data }),
    update: (_ref: unknown, data: Record<string, unknown>) => calls.updates.push(data),
  };

  return { db, batch, calls };
}

const ts = (ms: number) => ({ toMillis: () => ms });

describe("noteCountOf", () => {
  it("uses the denormalised counter when present", () => {
    expect(noteCountOf({ noteCount: 7, notes: [1, 2] })).toBe(7);
  });

  it("falls back to the legacy array for a lead not yet migrated", () => {
    expect(noteCountOf({ notes: [1, 2, 3] })).toBe(3);
  });

  it("treats a lead with neither as zero", () => {
    expect(noteCountOf({})).toBe(0);
  });

  it("trusts an explicit zero counter over a stale array", () => {
    // A migrated-then-emptied lead must not resurrect a count from the array.
    expect(noteCountOf({ noteCount: 0, notes: [1, 2] })).toBe(0);
  });
});

describe("queueNote", () => {
  it("writes the note and bumps the counter on the same batch", () => {
    const { db, batch, calls } = fakeDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queueNote(db as any, batch as any, "L1", { text: "Called, no answer", author: "a@b.com", kind: "note" });

    expect(calls.sets).toHaveLength(1);
    expect(calls.sets[0].data).toMatchObject({ text: "Called, no answer", author: "a@b.com", kind: "note" });

    // The increment must ride along: a note without it leaves noteCount wrong,
    // which silently breaks the "untouched new lead" attention rule.
    expect(calls.updates).toHaveLength(1);
    expect(calls.updates[0]).toHaveProperty("noteCount");
    expect(calls.updates[0]).toHaveProperty("updatedAt");
  });
});

describe("readNotes", () => {
  it("reads the subcollection when it has entries", async () => {
    const { db } = fakeDb([
      { text: "second", author: "a@b.com", kind: "note", at: ts(2000) },
      { text: "first", author: "a@b.com", kind: "stage", at: ts(1000) },
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notes = await readNotes(db as any, "L1", { notes: [{ text: "legacy", author: "x" }] });

    expect(notes.map((n) => n.text)).toEqual(["second", "first"]);
    expect(notes[1].kind).toBe("stage");
  });

  it("falls back to the legacy array when the subcollection is empty", async () => {
    // This is what keeps the app correct between deploy and backfill: an
    // un-migrated lead must render its history, not an empty timeline.
    const { db } = fakeDb([]);
    const legacy = {
      notes: [
        { text: "older", author: "a@b.com", kind: "note", at: ts(1000) },
        { text: "newer", author: "a@b.com", kind: "note", at: ts(5000) },
      ],
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notes = await readNotes(db as any, "L1", legacy);

    expect(notes).toHaveLength(2);
    // Newest first, matching the subcollection's ordering.
    expect(notes[0].text).toBe("newer");
  });

  it("returns an empty timeline when there is nothing in either shape", async () => {
    const { db } = fakeDb([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await readNotes(db as any, "L1", {})).toEqual([]);
  });

  it("tolerates a legacy note missing its timestamp", async () => {
    const { db } = fakeDb([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notes = await readNotes(db as any, "L1", { notes: [{ text: "no date", author: "a@b.com" }] });
    expect(notes[0].atMs).toBeNull();
  });
});

describe("timeline read is bounded", () => {
  it("caps the page size so a long history can't reintroduce an unbounded read", () => {
    expect(NOTES_PAGE_SIZE).toBeLessThanOrEqual(100);
  });
});

vi.restoreAllMocks();
