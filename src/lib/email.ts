import { Resend } from "resend";

type InquiryEmail = {
  id: string;
  parentName: string;
  phone: string;
  email?: string;
  childAge: string;
  message?: string;
};

const AGE_LABEL: Record<string, string> = {
  "2-3": "2–3 years (Playgroup)",
  "3-4": "3–4 years (Nursery)",
  "4-5": "4–5 years (LKG)",
  "5-6": "5–6 years (UKG)",
};

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
    subject: `New admission inquiry — ${lead.parentName}`,
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
      subject: "We received your inquiry — Al Fitrah Islamic Pre-School",
      text: [
        `Assalamu alaikum ${lead.parentName},`,
        ``,
        `Thank you for your interest in Al Fitrah Islamic Pre-School. We have received`,
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
