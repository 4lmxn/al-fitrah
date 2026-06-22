import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { leadSchema } from "@/lib/leadSchema";
import { sendInquiryEmails } from "@/lib/email";
import { rateLimited } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, error: "Too many requests. Please try again shortly." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Please check the form.", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  // Honeypot tripped — pretend success, store nothing.
  if (parsed.data.website) return NextResponse.json({ ok: true });

  const { parentName, phone, email, childAge, message } = parsed.data;
  try {
    const db = getDb();
    const ref = await db.collection("leads").add({
      type: "admission_inquiry",
      parentName, phone, email: email || null, childAge, message: message || null,
      stage: "new",
      source: "website",
      createdAt: FieldValue.serverTimestamp(),
    });
    // Email is best-effort: a delivery failure must not lose the stored lead.
    await sendInquiryEmails({ id: ref.id, parentName, phone, email, childAge, message }).catch(() => {});
    return NextResponse.json({ ok: true, id: ref.id });
  } catch (err) {
    console.error("inquiry write failed", err);
    return NextResponse.json({ ok: false, error: "Something went wrong. Please call us instead." }, { status: 500 });
  }
}
