import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { rateLimited } from "@/lib/rateLimit";
import { applicationSchema, validateCvFile, hasValidCvSignature } from "@/lib/applicationSchema";
import { uploadCv, deleteObject } from "@/lib/storage";
import { notify } from "@/lib/notify";
import { findDuplicate, leadDefaults } from "@/lib/leadOps";
import { SITE_URL } from "@/lib/seo";
import { getClientIp } from "@/lib/clientIp";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  // Fail open when the client IP is unknown: never funnel every visitor into a
  // single shared "unknown" bucket, which would rate-limit real families en masse.
  if (ip !== "unknown" && rateLimited(ip)) {
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
    // The browser-declared MIME type was allowlist-checked above, but it is
    // client-controlled — verify the actual file signature before storing.
    if (!hasValidCvSignature(buffer)) {
      return NextResponse.json({ ok: false, error: "CV must be a PDF, DOC, or DOCX file." }, { status: 422 });
    }
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
      ...leadDefaults(phone, await findDuplicate(phone)),
    });

    await notify("application.received", {
      name, phone, email: email || "—", role,
      entityType: "lead", entityId: ref.id, link: `${SITE_URL}/admin/leads/${ref.id}`,
    });

    return NextResponse.json({ ok: true, id: ref.id });
  } catch (err) {
    console.error("application intake failed", err);
    // Roll back the uploaded CV so we never leave an orphan file.
    if (cvPath) await deleteObject(cvPath).catch((rollbackErr) => console.error("cv rollback failed", rollbackErr));
    return NextResponse.json({ ok: false, error: "Something went wrong. Please call us instead." }, { status: 500 });
  }
}
