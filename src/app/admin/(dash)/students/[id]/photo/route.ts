import { NextResponse } from "next/server";
import { getStudent } from "@/lib/students";
import { requireAdmin } from "@/lib/adminAuth";
import { streamObject } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * A student's photograph, streamed behind the admin session.
 *
 * Same shape as the CV route and for the same reason: the file store is
 * private, there is no signed URL, and a photograph of a child must not be
 * reachable by anyone who happens to hold a link. It is served through this
 * route or not at all.
 *
 * ── Why the cache header matters here specifically ──────────────────────────
 *
 * Unlike a CV, which is opened once, a photo is rendered on the profile and
 * eventually on every row of a class list. Without a cache header, thirty
 * photos would stream from Cloud Run on every page load: CPU, egress, and a
 * slow list, all repeated. `private` keeps it out of shared caches — this is a
 * child's face, and the CDN must never hold a copy — while still letting the
 * one authorised browser keep it.
 *
 * `no-cache` alongside `private` is not a contradiction: it means revalidate
 * before reuse, so a replaced photo appears immediately rather than after an
 * hour, while the bytes themselves are still reused when nothing changed.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  const { id } = await params;
  const student = await getStudent(id);
  if (!student?.photoPath) {
    return NextResponse.json({ ok: false, error: "No photo on file." }, { status: 404 });
  }

  let body: ReadableStream<Uint8Array>;
  try {
    body = await streamObject(student.photoPath);
  } catch (err) {
    console.error(`student photo read failed id=${id}`, err);
    return NextResponse.json({ ok: false, error: "Could not read the photo." }, { status: 502 });
  }

  // Derived from the stored path, which carries the sniffed extension — never
  // from anything the uploader supplied.
  const ext = student.photoPath.split(".").pop() ?? "";
  const type =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  return new NextResponse(body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "private, no-cache, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
      // Rendered in an <img>, not downloaded — but still never inline HTML.
      "Content-Disposition": "inline",
    },
  });
}
