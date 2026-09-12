import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getDocument } from "@/lib/studentDocuments";
import { streamObject } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * The office opens a document on a child's record.
 *
 * The staff-side twin of /portal/[studentId]/documents/[docId]. Kept separate
 * rather than folded into one route that decides which kind of caller it has:
 * two gates in one function is how a parent path ends up falling through to the
 * staff path. Each side proves its own right; neither can inherit the other's.
 */
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

  // A child's identity documents. Who opened which, and when, should be
  // answerable — same reasoning as the CV route.
  console.log(`student document accessed id=${id} doc=${docId} by=${admin.email}`);

  return new NextResponse(body, {
    headers: {
      "Content-Type": doc.contentType,
      // attachment, always — an uploaded file rendered inline on the admin
      // origin is how a malicious upload becomes stored XSS against a
      // logged-in member of staff.
      "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.label)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
