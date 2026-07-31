import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { leadSchema } from "@/lib/leadSchema";
import { sendInquiryEmails } from "@/lib/email";
import { rateLimited } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/clientIp";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = getClientIp(req);
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

  const {
    parentName, childName, phone, whatsapp, email, childAge, childDob,
    programInterest, message, utmSource, utmMedium, utmCampaign, referredBy,
  } = parsed.data;

  // Only persist attribution that was actually present, so leads aren't padded
  // with empty utm keys.
  const utm = Object.fromEntries(
    Object.entries({ source: utmSource, medium: utmMedium, campaign: utmCampaign })
      .filter(([, v]) => v),
  );

  // Explicit source lets waitlist/prospectus surfaces reuse this route later;
  // the plain form is always "website".
  const source = "website";

  try {
    const db = getDb();
    const ref = await db.collection("leads").add({
      type: "admission_inquiry",
      parentName,
      childName: childName || null,
      phone,
      whatsapp: whatsapp ?? false,
      email: email || null,
      childAge,
      childDob: childDob || null,
      programInterest: programInterest || null,
      message: message || null,
      stage: "new",
      source,
      ...(Object.keys(utm).length ? { utm } : {}),
      ...(referredBy ? { referredBy } : {}),
      followUpDate: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    // Email is best-effort: a delivery failure must not lose the stored lead.
    await sendInquiryEmails({ id: ref.id, parentName, childName, phone, email, childAge, programInterest, message }).catch((err) =>
      console.error("inquiry email failed", err),
    );
    return NextResponse.json({ ok: true, id: ref.id });
  } catch (err) {
    console.error("inquiry write failed", err);
    return NextResponse.json({ ok: false, error: "Something went wrong. Please call us instead." }, { status: 500 });
  }
}
