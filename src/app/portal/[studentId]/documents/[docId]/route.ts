import { NextResponse } from "next/server";
import { assertOwnStudent, getParentSession } from "@/lib/parentAuth";
import { getDocument } from "@/lib/studentDocuments";
import { streamObject } from "@/lib/storage";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ studentId: string; docId: string }> },
) {
  const { studentId, docId } = await params;

  if (!(await assertOwnStudent(studentId))) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  const doc = await getDocument(studentId, docId);
  if (!doc) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  let body: ReadableStream<Uint8Array>;
  try {
    body = await streamObject(doc.path);
  } catch (err) {
    console.error(`portal document read failed student=${studentId} doc=${docId}`, err);
    return NextResponse.json({ ok: false, error: "Could not read that file." }, { status: 502 });
  }

  const parent = await getParentSession();
  await recordAudit({
    actor: parent?.phone ?? "parent",
    action: "portal.document_accessed",
    entity: { type: "student", id: studentId },
    summary: `A guardian downloaded “${doc.label}”`,
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
