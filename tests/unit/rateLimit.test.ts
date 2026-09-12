import { describe, it, expect, vi, beforeEach } from "vitest";

// In-memory stand-in for the slice of Firestore the limiter uses: a document
// store plus runTransaction. Enough to prove the window arithmetic and key
// isolation without a network or an emulator.
const store = new Map<string, Record<string, unknown>>();
let failNext = false;

function snapshotFor(id: string) {
  const data = store.get(id);
  return {
    exists: data !== undefined,
    get(field: string) {
      const v = data?.[field];
      // windowStart is written as a Timestamp; mirror the toMillis() call site.
      if (field === "windowStart" && typeof v === "number") {
        return { toMillis: () => v };
      }
      return v;
    },
  };
}

vi.mock("firebase-admin/firestore", () => ({
  Timestamp: { fromMillis: (ms: number) => ms },
}));

vi.mock("@/lib/firebaseAdmin", () => ({
  getDb: () => ({
    collection: () => ({ doc: (id: string) => ({ id }) }),
    runTransaction: async (fn: (tx: unknown) => Promise<boolean>) => {
      if (failNext) throw new Error("firestore unavailable");
      const tx = {
        get: async (ref: { id: string }) => snapshotFor(ref.id),
        set: (ref: { id: string }, data: Record<string, unknown>) => store.set(ref.id, data),
        update: (ref: { id: string }, data: Record<string, unknown>) =>
          store.set(ref.id, { ...store.get(ref.id), ...data }),
      };
      return fn(tx);
    },
  }),
}));

const { rateLimited } = await import("@/lib/rateLimit");

describe("rateLimited", () => {
  beforeEach(() => {
    store.clear();
    failNext = false;
  });

  it("allows up to max within the window, then blocks", async () => {
    const key = "test-ip";
    const opts = { windowMs: 60_000, max: 3 };
    expect(await rateLimited(key, opts)).toBe(false);
    expect(await rateLimited(key, opts)).toBe(false);
    expect(await rateLimited(key, opts)).toBe(false);
    expect(await rateLimited(key, opts)).toBe(true); // 4th call blocked
  });

  it("isolates different keys", async () => {
    const opts = { windowMs: 60_000, max: 1 };
    expect(await rateLimited("a", opts)).toBe(false);
    expect(await rateLimited("b", opts)).toBe(false);
    expect(await rateLimited("a", opts)).toBe(true);
  });

  it("resets once the window has passed", async () => {
    vi.useFakeTimers();
    try {
      const opts = { windowMs: 1_000, max: 1 };
      expect(await rateLimited("c", opts)).toBe(false);
      expect(await rateLimited("c", opts)).toBe(true);
      vi.advanceTimersByTime(1_500);
      expect(await rateLimited("c", opts)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("fails open when Firestore is unreachable", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    failNext = true;
    // Locking the school out of a system that is already down prevents nothing.
    expect(await rateLimited("d", { max: 1 })).toBe(false);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
