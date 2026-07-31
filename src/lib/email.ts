import { Resend } from "resend";

type InquiryEmail = {
  id: string;
  parentName: string;
  phone: string;
  email?: string;
  childAge: string;
  message?: string;
};

type ApplicationEmail = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
};

const AGE_LABEL: Record<string, string> = {
  below: "Below 2y 10m",
  eligible: "2y 10m – 3y 10m (Pre-KG eligible)",
  above: "Above 3y 10m",
};

// User input interpolated into a subject line must never carry newlines or
// control characters (header-injection surface, even if the provider escapes).
function subjectSafe(value: string): string {
  return value.replace(/[\r\n\x00-\x1f\x7f]/g, " ").trim();
}

/**
 * Best-effort notification on a new inquiry. No-ops if RESEND_API_KEY is unset
 * (e.g. local dev without a key), so the lead is still stored.
 */
export async function sendInquiryEmails(lead: InquiryEmail): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.INQUIRY_FROM_EMAIL;
  const adminTo = process.env.INQUIRY_ADMIN_EMAIL;
  if (!key || !from || !adminTo) return;

  const resend = new Resend(key);
  const age = AGE_LABEL[lead.childAge] ?? lead.childAge;

  // Admin notification
  await resend.emails.send({
    from,
    to: adminTo,
    replyTo: lead.email || undefined,
    subject: `New admission inquiry — ${subjectSafe(lead.parentName)}`,
    text: [
      `New inquiry from the Al Fitrah website.`,
      ``,
      `Parent:  ${lead.parentName}`,
      `Phone:   ${lead.phone}`,
      `Email:   ${lead.email || "—"}`,
      `Child:   ${age}`,
      `Message: ${lead.message || "—"}`,
      ``,
      `Lead ID: ${lead.id}`,
    ].join("\n"),
  });

  // Parent confirmation (only if they shared an email)
  if (lead.email) {
    await resend.emails.send({
      from,
      to: lead.email,
      subject: "We received your inquiry — Al Fitrah Pre School",
      text: [
        `Assalamu alaikum ${lead.parentName},`,
        ``,
        `Thank you for your interest in Al Fitrah Pre School. We have received`,
        `your inquiry and our admissions team will contact you shortly.`,
        ``,
        `Your reference number is ${lead.id}.`,
        ``,
        `Warm regards,`,
        `Al Fitrah Admissions`,
      ].join("\n"),
    });
  }
}

/**
 * Best-effort admin notification on a new staff application. Same env gating
 * as inquiries: no-ops when the Resend vars are unset so the lead still lands.
 */
export async function sendApplicationEmails(app: ApplicationEmail): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.INQUIRY_FROM_EMAIL;
  const adminTo = process.env.INQUIRY_ADMIN_EMAIL;
  if (!key || !from || !adminTo) return;

  const resend = new Resend(key);
  await resend.emails.send({
    from,
    to: adminTo,
    replyTo: app.email || undefined,
    subject: `New staff application — ${subjectSafe(app.name)} (${subjectSafe(app.role)})`,
    text: [
      `New staff application from the Al Fitrah website.`,
      ``,
      `Name:  ${app.name}`,
      `Phone: ${app.phone}`,
      `Email: ${app.email || "—"}`,
      `Role:  ${app.role}`,
      ``,
      `CV and details: review lead ${app.id} in the admin console.`,
    ].join("\n"),
  });
}
