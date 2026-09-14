import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { getAdmin } from "@/lib/adminAuth";
import { getParentSession } from "@/lib/parentAuth";
import { canDownload, COLLECTION, getResource } from "@/lib/resources";
import { streamObject } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [admin, parent] = await Promise.all([getAdmin(), getParentSession()]);
  const viewer = admin ? "staff" : parent ? "parent" : "public";

  const resource = await getResource(id);
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

  getDb()
    .collection(COLLECTION)
    .doc(id)
    .update({ downloadCount: FieldValue.increment(1) })
    .catch((err) => console.error(`resource count failed id=${id}`, err));

  return new NextResponse(body, {
    headers: {
      "Content-Type": resource.contentType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(resource.fileName)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
