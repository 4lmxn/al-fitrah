import { NextResponse } from "next/server";
import { assertOwnStudent, getParentSession } from "@/lib/parentAuth";
import { getDocument } from "@/lib/studentDocuments";
import { streamObject } from "@/lib/storage";
import { recordAudit } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * A guardian downloads a document from their own child's record.
 *
 * Deliberately a separate route from the admin one, rather than a single route
 * that works out which kind of caller it has. Two gates in one function is how
 * a system ends up with a parent path that falls through to the staff path;
 * here each side proves its own right and neither can inherit the other's.
 *
 * assertOwnStudent resolves the parent's children from their verified session
 * claim, never from this URL. A guardian probing another family's id gets 404 —
 * the same answer as for a child that does not exist, so the URL cannot be used
 * to learn which records are real.
 */
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

  // Who opened what, and when. These are a child's identity documents; the
  // school should be able to answer that question later.
  //
  // The actor is the guardian's own credential, read from the session rather
  // than the URL — the same rule the gate above follows. A second cookie read
  // costs nothing and keeps one definition of who may see this child.
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
      // attachment, always. An uploaded file rendered inline on this origin is
      // how a malicious upload becomes stored XSS against the next signed-in
      // guardian — and nothing here needs to be viewed in place.
      "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.label)}"`,
      // private: a child's identity document must never sit in a shared cache
      // where the session check no longer runs.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
