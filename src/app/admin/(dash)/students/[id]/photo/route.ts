import { NextResponse } from "next/server";
import { getStudent } from "@/lib/students";
import { requireAdmin } from "@/lib/adminAuth";
import { streamObject } from "@/lib/storage";

export const runtime = "nodejs";

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

  const ext = student.photoPath.split(".").pop() ?? "";
  const type =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

  return new NextResponse(body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "private, no-cache, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
