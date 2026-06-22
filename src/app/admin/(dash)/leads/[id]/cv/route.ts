import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { getCvSignedUrl } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.redirect(new URL("/admin/login", _req.url));
  }
  const { id } = await params;
  const doc = await getDb().collection("leads").doc(id).get();
  const cvPath = doc.exists ? doc.data()?.cv?.path : null;
  if (!cvPath) {
    return NextResponse.json({ ok: false, error: "No CV on file." }, { status: 404 });
  }
  const url = await getCvSignedUrl(cvPath);
  return NextResponse.redirect(url);
}
