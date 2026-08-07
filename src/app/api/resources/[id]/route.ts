import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { getAdmin } from "@/lib/adminAuth";
import { getParentSession } from "@/lib/parentAuth";
import { canDownload, COLLECTION, getResource } from "@/lib/resources";
import { streamObject } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Download a resource that is not public.
 *
 * Public files never reach here — they are served straight from Cloud Storage,
 * which costs this app nothing and caches. This route exists for the files that
 * must stay behind a session, and it streams them rather than handing out a
 * signed URL, for the reasons recorded in lib/storage: a signed URL keeps
 * working after sign-out, survives in history, and needs an IAM permission the
 * runtime may not hold.
 *
 * The viewer is resolved from the session cookie, never from the request. A
 * parameter that said which audience you belong to would be a parameter anyone
 * could set.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [admin, parent] = await Promise.all([getAdmin(), getParentSession()]);
  const viewer = admin ? "staff" : parent ? "parent" : "public";

  const resource = await getResource(id);
  // 404 rather than 403 for a file this viewer may not have: a signed-in parent
  // probing ids should not be able to learn which files exist for other classes.
  // Same rule as assertOwnStudent.
  if (!resource || !canDownload(resource, viewer)) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  let body: ReadableStream<Uint8Array>;
  try {
    body = await streamObject(resource.storagePath);
  } catch (err) {
    console.error(`resource read failed id=${id}`, err);
    return NextResponse.json({ ok: false, error: "Could not read that file." }, { status: 502 });
  }

  // increment(), not a read-modify-write: two parents downloading at the same
  // moment must both be counted. Fire-and-forget, because a failed counter must
  // never fail a download — the count is a nice-to-have, the file is the point.
  getDb()
    .collection(COLLECTION)
    .doc(id)
    .update({ downloadCount: FieldValue.increment(1) })
    .catch((err) => console.error(`resource count failed id=${id}`, err));

  return new NextResponse(body, {
    headers: {
      "Content-Type": resource.contentType || "application/octet-stream",
      // `attachment` stops the browser rendering an uploaded file inline on this
      // origin, which is what would turn a malicious upload into stored XSS
      // against whoever opened it.
      "Content-Disposition": `attachment; filename="${encodeURIComponent(resource.fileName)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
