import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/firebaseAdmin";
import { normalizeStage } from "@/lib/leads";
import { findStage } from "@/lib/stageMeta";
import { getPipeline, allTerminalStages } from "@/lib/pipelines";
import { notify } from "@/lib/notify";
import { SITE_URL } from "@/lib/seo";
import { waLink } from "@/lib/phone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EPOCH = new Date(0);

function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

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

  const [admissionStages, terminal] = await Promise.all([
    getPipeline("admission_inquiry"),
    allTerminalStages(),
  ]);

  type DueLead = { id: string; name: string; phone: string; stage: string; overdue: boolean; waLink: string | null };
  const leads: DueLead[] = snap.docs
    .map((d) => {
      const x = d.data();
      const stage = normalizeStage(x.stage ?? "new");
      const followMs = x.followUpDate?.toMillis?.() ?? null;
      return {
        id: d.id,
        name: x.name ?? x.parentName ?? "—",
        phone: x.phone ?? "",
        stage,
        stageLabel: findStage(admissionStages, stage).label,
        followMs,
      };
    })
    .filter((l) => !terminal.has(l.stage) && l.followMs != null)
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
  if (leads.length > 0) {
    const list = leads
      .map((l) => `${l.overdue ? "[OVERDUE]" : "[due today]"} ${l.name} — ${l.phone} — ${l.stage}${l.waLink ? `\n   ${l.waLink}` : ""}\n   ${SITE_URL}/admin/leads/${l.id}`)
      .join("\n");
    const result = await notify("followup.due", {
      count: leads.length,
      overdue: leads.filter((l) => l.overdue).length,
      list,
      link: `${SITE_URL}/admin`,
    });
    sent = result.delivered.length > 0;
  }

  console.log(`cron followups: ${leads.length} due, digest sent=${sent}`);
  return NextResponse.json({ ok: true, count: leads.length, sent });
}
