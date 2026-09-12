import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { leadSchema } from "@/lib/leadSchema";
import { getPrograms, pickFrom } from "@/lib/taxonomy";
import { notify } from "@/lib/notify";
import { findDuplicate, leadDefaults } from "@/lib/leadOps";
import { SITE_URL } from "@/lib/seo";
import { rateLimited } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/clientIp";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  // Fail open when the client IP is unknown: never funnel every visitor into a
  // single shared "unknown" bucket, which would rate-limit real families en masse.
  if (ip !== "unknown" && await rateLimited(ip)) {
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

  // Checked before the write so the new lead can carry the link. A suspected
  // duplicate is still created — a second enquiry from one number is often a
  // sibling, and dropping it to tidy the list loses a real family.
  const verdict = await findDuplicate(phone);

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
      programInterest: pickFrom(await getPrograms(), programInterest) ?? null,
      message: message || null,
      stage: "new",
      source,
      ...(Object.keys(utm).length ? { utm } : {}),
      ...(referredBy ? { referredBy } : {}),
      ...leadDefaults(phone, verdict),
    });
    // The lead is already stored. notify() never throws, so a dead channel
    // cannot lose the enquiry it was meant to announce.
    await notify("lead.created", {
      parentName, childName: childName || "—", phone, email: email || "—",
      childAge, programInterest: programInterest || "—", message: message || "—",
      entityType: "lead", entityId: ref.id, link: `${SITE_URL}/admin/leads/${ref.id}`,
    });
    return NextResponse.json({ ok: true, id: ref.id });
  } catch (err) {
    console.error("inquiry write failed", err);
    return NextResponse.json({ ok: false, error: "Something went wrong. Please call us instead." }, { status: 500 });
  }
}
