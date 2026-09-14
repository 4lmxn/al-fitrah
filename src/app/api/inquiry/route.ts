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

  if (parsed.data.website) return NextResponse.json({ ok: true });

  const {
    parentName, childName, phone, whatsapp, email, childAge, childDob,
    programInterest, message, utmSource, utmMedium, utmCampaign, referredBy,
  } = parsed.data;

  const utm = Object.fromEntries(
    Object.entries({ source: utmSource, medium: utmMedium, campaign: utmCampaign })
      .filter(([, v]) => v),
  );

  const source = "website";

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
