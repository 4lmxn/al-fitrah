import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/firebaseAdmin";
import { normalizeStage } from "@/lib/leads";
import { stageMeta } from "@/lib/stageMeta";
import { sendFollowUpDigest, type FollowUpDigestLead } from "@/lib/email";
import { SITE_URL } from "@/lib/seo";
import { waLink } from "@/lib/phone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Leads in these stages are done — never chase them.
const TERMINAL = new Set(["admitted", "lost"]);

// Lower bound for the follow-up range query. Any real timestamp sorts above it;
// null and absent fields sort below or aren't indexed. See the query comment.
const EPOCH = new Date(0);

// Constant-time secret check. Hashing both sides to a fixed 32 bytes lets us
// use timingSafeEqual (which throws on length mismatch) without leaking the
// secret's length or short-circuiting on the first differing byte.
function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

// Daily follow-up digest. Triggered by Cloud Scheduler (see apphosting notes),
// authenticated with a shared secret header rather than an admin session.
//
// The query is bounded at BOTH ends on purpose. An upper bound alone
// (followUpDate <= today) matches every lead in the collection: Firestore
// orders null before timestamps, so a lead written with `followUpDate: null`
// — which is how every lead was written until now — satisfies "<= today" and
// comes back. The lower bound excludes them, because `null >= epoch` is false,
// and it excludes documents missing the field entirely, because a field that
// isn't present isn't in the index. Reads are now proportional to the number of
// leads that actually have a follow-up scheduled, not to collection size.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !secretMatches(req.headers.get("x-cron-secret"), secret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  let snap;
  try {
    snap = await getDb()
      .collection("leads")
      .where("followUpDate", ">=", EPOCH)
      .where("followUpDate", "<=", endOfToday)
      .get();
  } catch (err) {
    console.error("cron followups query failed", err);
    return NextResponse.json({ ok: false, error: "Query failed" }, { status: 500 });
  }

  const leads: FollowUpDigestLead[] = snap.docs
    .map((d) => {
      const x = d.data();
      const stage = normalizeStage(x.stage ?? "new");
      const followMs = x.followUpDate?.toMillis?.() ?? null;
      return {
        id: d.id,
        name: x.name ?? x.parentName ?? "—",
        phone: x.phone ?? "",
        stage,
        stageLabel: stageMeta(stage).label,
        followMs,
      };
    })
    .filter((l) => !TERMINAL.has(l.stage) && l.followMs != null)
    .sort((a, b) => (a.followMs ?? 0) - (b.followMs ?? 0))
    .map((l) => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      stage: l.stageLabel,
      overdue: (l.followMs ?? 0) < startOfToday.getTime(),
      waLink: waLink(l.phone),
    }));

  let sent = false;
  try {
    sent = await sendFollowUpDigest(leads, SITE_URL);
  } catch (err) {
    console.error("cron followups digest send failed", err);
  }

  console.log(`cron followups: ${leads.length} due, digest sent=${sent}`);
  return NextResponse.json({ ok: true, count: leads.length, sent });
}
