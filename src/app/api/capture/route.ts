import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { captureSchema } from "@/lib/leadSchema";
import { sendInquiryEmails } from "@/lib/email";
import { rateLimited } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/clientIp";

export const runtime = "nodejs";

// Low-friction lead capture shared by the waitlist and prospectus magnet. Lands
// the same `leads` collection with type "admission_inquiry" so these show up in
// the CRM alongside form enquiries, tagged by `source`.
export async function POST(req: Request) {
  const ip = getClientIp(req);
  // Fail open when the client IP is unknown: never funnel every visitor into a
  // single shared "unknown" bucket, which would rate-limit real families en masse.
  if (ip !== "unknown" && rateLimited(ip)) {
    return NextResponse.json({ ok: false, error: "Too many requests. Please try again shortly." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const parsed = captureSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Please check the form.", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  // Honeypot tripped — pretend success, store nothing.
  if (parsed.data.website) return NextResponse.json({ ok: true });

  const { parentName, phone, whatsapp, email, childAge, source, utmSource, utmMedium, utmCampaign, referredBy } = parsed.data;

  const utm = Object.fromEntries(
    Object.entries({ source: utmSource, medium: utmMedium, campaign: utmCampaign }).filter(([, v]) => v),
  );

  try {
    const db = getDb();
    const ref = await db.collection("leads").add({
      type: "admission_inquiry",
      parentName,
      childName: null,
      phone,
      whatsapp: whatsapp ?? false,
      email: email || null,
      childAge: childAge || null,
      programInterest: null,
      message: null,
      stage: "new",
      source,
      ...(Object.keys(utm).length ? { utm } : {}),
      ...(referredBy ? { referredBy } : {}),
      followUpDate: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    // Best-effort admin notification; a delivery failure must not lose the lead.
    await sendInquiryEmails({ id: ref.id, parentName, phone, email, childAge: childAge || "—" }).catch((err) =>
      console.error(`${source} capture email failed`, err),
    );
    return NextResponse.json({ ok: true, id: ref.id });
  } catch (err) {
    console.error("capture write failed", err);
    return NextResponse.json({ ok: false, error: "Something went wrong. Please call us instead." }, { status: 500 });
  }
}
