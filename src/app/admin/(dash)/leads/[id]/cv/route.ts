import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { streamObject } from "@/lib/storage";

export const runtime = "nodejs";

// CV download.
//
// This used to redirect to a 15-minute signed URL. Two problems with that: the
// URL is a bearer token for the file — anyone who gets it needs no login — and
// it lands in browser history and can leak onward via Referer. It also depended
// on the service account holding iam.serviceAccounts.signBlob, which
// Application Default Credentials on App Hosting may not have been granted, so
// the route could 500 in production in a way local development never reproduces.
//
// Streaming the bytes through this route keeps the file behind the session
// cookie for its whole life, and needs no signing permission at all.
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

  // CVs are personal data. Who opened whose, and when, should be answerable.
  console.log(`cv accessed lead=${id} by=${admin.email}`);

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
      // `attachment` matters beyond convenience: it stops the browser rendering
      // an uploaded file inline on the admin origin, which is what would turn a
      // malicious upload into stored XSS against a logged-in admin.
      "Content-Disposition": `attachment; filename="${encodeURIComponent(cv.filename || "cv")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
