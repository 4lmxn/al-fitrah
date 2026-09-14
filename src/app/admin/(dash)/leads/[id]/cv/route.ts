import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { streamObject } from "@/lib/storage";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  const { id } = await params;
  const doc = await getDb().collection("leads").doc(id).get();
  const cv = doc.exists ? doc.data()?.cv : null;
  if (!cv?.path) {
    return NextResponse.json({ ok: false, error: "No CV on file." }, { status: 404 });
  }

  await recordAudit({
    actor: admin.email,
    action: "lead.cv_accessed",
    entity: { type: "lead", id },
    summary: "Downloaded the CV on file",
  });

  let body: ReadableStream<Uint8Array>;
  try {
    body = await streamObject(cv.path);
  } catch (err) {
    console.error(`cv read failed lead=${id}`, err);
    return NextResponse.json({ ok: false, error: "Could not read the CV." }, { status: 502 });
  }

  return new NextResponse(body, {
    headers: {
      "Content-Type": cv.contentType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(cv.filename || "cv")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
