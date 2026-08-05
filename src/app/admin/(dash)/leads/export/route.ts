import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getDb } from "@/lib/firebaseAdmin";
import { recordAudit } from "@/lib/audit";
import { csvDocument, csvFilename } from "@/lib/csv";
import { normalizeStage, type LeadType } from "@/lib/leads";
import { getPipeline } from "@/lib/pipelines";
import { findStage } from "@/lib/stageMeta";

export const runtime = "nodejs";

/**
 * Export leads as CSV.
 *
 * Owner-only, and audited. Everything in this file is already visible in the
 * console to any admin — the difference is that an export LEAVES the system.
 * It becomes a file on a laptop, an email attachment, a shared drive. Under
 * DPDP that is the moment worth restricting and recording, not the reading.
 *
 * Bounded: an export is a query like any other, and "download everything" is
 * how a cheap feature becomes an expensive one.
 */
const MAX_ROWS = 5000;

const HEADER = [
  "Received", "Type", "Name", "Child", "Phone", "WhatsApp", "Email",
  "Stage", "Owner", "Source", "Campaign", "Referred by", "Child age",
  "Program", "Role", "Notes", "Follow-up", "Possible duplicate of",
];

function isoDate(ms: number | null): string {
  if (!ms) return "";
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export async function GET(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  if (admin.role !== "owner") {
    return NextResponse.json(
      { ok: false, error: "Exporting contact details needs an owner account." },
      { status: 403 },
    );
  }

  const url = new URL(req.url);
  const type = (url.searchParams.get("type") ?? "admission_inquiry") as LeadType;
  const stage = url.searchParams.get("stage") ?? undefined;
  const assignee = url.searchParams.get("assignee") ?? undefined;

  let q = getDb().collection("leads").where("type", "==", type) as FirebaseFirestore.Query;
  if (stage) q = q.where("stage", "==", stage);
  if (assignee === "unassigned") q = q.where("assignedTo", "==", null);
  else if (assignee) q = q.where("assignedTo", "==", assignee);

  const snap = await q.orderBy("createdAt", "desc").limit(MAX_ROWS).get();
  const pipeline = await getPipeline(type);

  const rows = snap.docs.map((d) => {
    const x = d.data();
    const stageId = normalizeStage(x.stage ?? "new");
    return [
      isoDate(x.createdAt?.toMillis?.() ?? null),
      type === "staff_application" ? "Staff application" : "Admission enquiry",
      x.parentName ?? x.name ?? "",
      x.childName ?? "",
      x.phone ?? "",
      x.whatsapp ? "yes" : "",
      x.email ?? "",
      findStage(pipeline, stageId).label,
      x.assignedTo ?? "",
      x.source ?? "",
      x.utm?.campaign ?? x.utm?.source ?? "",
      x.referredBy ?? "",
      x.childAge ?? "",
      x.programInterest ?? "",
      x.role ?? "",
      typeof x.noteCount === "number" ? x.noteCount : 0,
      isoDate(x.followUpDate?.toMillis?.() ?? null),
      x.possibleDuplicateOf ?? "",
    ];
  });

  // Recorded before returning, so the export is on the record even if the
  // download is interrupted — the data has already been read either way.
  await recordAudit({
    actor: admin.email,
    action: "lead.exported",
    entity: { type: "lead", id: "bulk" },
    summary: `Exported ${rows.length} ${type === "staff_application" ? "applications" : "enquiries"}`,
    meta: { rows: rows.length, type, stage: stage ?? null, assignee: assignee ?? null },
  });

  return new NextResponse(csvDocument(HEADER, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename(type === "staff_application" ? "applications" : "leads")}"`,
      // Contact details for children's families: never cached anywhere.
      "Cache-Control": "private, no-store",
    },
  });
}
