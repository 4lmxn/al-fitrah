import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { rateLimited } from "@/lib/rateLimit";
import { applicationSchema, validateCvFile } from "@/lib/applicationSchema";
import { uploadCv, deleteObject } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, error: "Too many requests. Please try again shortly." }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const fields = {
    name: String(form.get("name") ?? ""),
    phone: String(form.get("phone") ?? ""),
    email: String(form.get("email") ?? ""),
    role: String(form.get("role") ?? ""),
    message: String(form.get("message") ?? ""),
    website: String(form.get("website") ?? ""),
  };

  const parsed = applicationSchema.safeParse(fields);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Please check the form.", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  // Honeypot tripped — pretend success, store nothing.
  if (parsed.data.website) return NextResponse.json({ ok: true });

  const cv = form.get("cv");
  if (!(cv instanceof File)) {
    return NextResponse.json({ ok: false, error: "Please attach your CV." }, { status: 422 });
  }
  const fileCheck = validateCvFile({ type: cv.type, size: cv.size, name: cv.name });
  if (!fileCheck.ok) {
    return NextResponse.json({ ok: false, error: fileCheck.error }, { status: 422 });
  }

  const { name, phone, email, role, message } = parsed.data;
  const db = getDb();
  const ref = db.collection("leads").doc(); // pre-generate id for the CV path

  let cvPath: string | null = null;
  try {
    const buffer = Buffer.from(await cv.arrayBuffer());
    const uploaded = await uploadCv(ref.id, { buffer, filename: cv.name, contentType: cv.type });
    cvPath = uploaded.path;

    await ref.set({
      type: "staff_application",
      name,
      phone,
      email: email || null,
      role,
      message: message || null,
      cv: { path: uploaded.path, filename: cv.name, contentType: cv.type, size: cv.size },
      stage: "new",
      source: "website",
      notes: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, id: ref.id });
  } catch (err) {
    console.error("application intake failed", err);
    // Roll back the uploaded CV so we never leave an orphan file.
    if (cvPath) await deleteObject(cvPath).catch(() => {});
    return NextResponse.json({ ok: false, error: "Something went wrong. Please call us instead." }, { status: 500 });
  }
}
