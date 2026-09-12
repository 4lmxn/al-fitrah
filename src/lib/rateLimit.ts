import { createHash } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";

// Rate limit backed by Firestore, so the counter is shared by every instance.
//
// The previous implementation kept counters in process memory, which made the
// limit per-instance rather than per-deployment: at N instances every limit
// silently became N times looser. That coupled the whole app to
// `maxInstances: 1` and blocked both horizontal scaling on App Hosting and any
// multi-process deployment on AWS. The counter now lives where every instance
// can see it.
//
// Cost is one read and one write per request on limited routes only — sign-in,
// enquiry, application and capture. Those are low volume by nature; the admin
// console and the public pages are untouched.
//
// Housekeeping: documents carry `expiresAt` for a Firestore TTL policy on the
// `rateLimits` collection. Without that policy nothing breaks, the collection
// just grows — see docs/aws-cloudflare.md.

const COLLECTION = "rateLimits";

// The key is usually a client IP. Hashing it keeps a raw address — personal
// data on a platform holding children's records — out of the database, and
// sidesteps document-id characters at the same time.
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

      // Fixed window: the first hit of a window resets the counter.
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
    // Fail open, loudly. Firestore being unreachable means sign-in and every
    // form are already broken for legitimate reasons, so refusing traffic here
    // would lock the school out of a system that is down anyway rather than
    // prevent anything. The log is what makes the degradation visible.
    console.error("rateLimit: Firestore unavailable, allowing request", err);
    return false;
  }
}
