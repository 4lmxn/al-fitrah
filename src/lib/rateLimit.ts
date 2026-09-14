import { createHash } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";

const COLLECTION = "rateLimits";

function docId(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 40);
}

export async function rateLimited(
  key: string,
  opts: { windowMs?: number; max?: number } = {},
): Promise<boolean> {
  const windowMs = opts.windowMs ?? 60_000;
  const max = opts.max ?? 5;
  const now = Date.now();
  const ref = getDb().collection(COLLECTION).doc(docId(key));

  try {
    return await getDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const startedAt: number = snap.get("windowStart")?.toMillis?.() ?? 0;

      if (!snap.exists || now - startedAt > windowMs) {
        tx.set(ref, {
          count: 1,
          windowStart: Timestamp.fromMillis(now),
          expiresAt: Timestamp.fromMillis(now + windowMs),
        });
        return false;
      }

      const count = (snap.get("count") ?? 0) + 1;
      tx.update(ref, { count });
      return count > max;
    });
  } catch (err) {
    console.error("rateLimit: Firestore unavailable, allowing request", err);
    return false;
  }
}
