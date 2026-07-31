import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { normalizeStage } from "@/lib/leads";
import { stageMeta } from "@/lib/stageMeta";
import { sendFollowUpDigest, type FollowUpDigestLead } from "@/lib/email";
import { SITE_URL } from "@/lib/seo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Leads in these stages are done — never chase them.
const TERMINAL = new Set(["admitted", "lost"]);

function waLink(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
}

// Daily follow-up digest. Triggered by Cloud Scheduler (see apphosting notes),
// authenticated with a shared secret header rather than an admin session.
// A single narrow range query (followUpDate <= today) keeps the read count and
// therefore the Firestore bill minimal — it never scans the whole collection.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
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
