import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getDocument } from "@/lib/studentDocuments";
import { streamObject } from "@/lib/storage";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  const { id, docId } = await params;
  const doc = await getDocument(id, docId);
  if (!doc) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  let body: ReadableStream<Uint8Array>;
  try {
    body = await streamObject(doc.path);
  } catch (err) {
    console.error(`student document read failed id=${id} doc=${docId}`, err);
    return NextResponse.json({ ok: false, error: "Could not read that file." }, { status: 502 });
  }

  await recordAudit({
    actor: admin.email,
    action: "student.document_accessed",
    entity: { type: "student", id },
    summary: `Downloaded “${doc.label}”`,
    meta: { docId },
  });

  return new NextResponse(body, {
    headers: {
      "Content-Type": doc.contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.label)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
