import "server-only";
import { Resend } from "resend";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { getSettings } from "@/lib/settings";
import type { NotifyAdapter } from "./types";

/**
 * Channel adapters.
 *
 * Each one knows how to deliver a rendered message and nothing about which
 * events exist or when to fire. Adding a channel means adding a file like this
 * and listing it — no caller changes anywhere.
 */

/** Transactional email via Resend. Unconfigured when the API key is absent. */
export const emailAdapter: NotifyAdapter = {
  channel: "email",
  isConfigured() {
    return Boolean(process.env.RESEND_API_KEY && process.env.INQUIRY_FROM_EMAIL && process.env.INQUIRY_ADMIN_EMAIL);
  },
  async send(message) {
    const resend = new Resend(process.env.RESEND_API_KEY!);
    await resend.emails.send({
      from: process.env.INQUIRY_FROM_EMAIL!,
      to: process.env.INQUIRY_ADMIN_EMAIL!,
      // Newlines in a subject are a header-injection surface even when the
      // provider escapes them.
      subject: message.subject.replace(/[\r\n\x00-\x1f\x7f]/g, " ").trim(),
      text: message.body,
    });
  },
};

export const DASHBOARD_COLLECTION = "notifications";
const DASHBOARD_RETENTION_DAYS = 90;

/**
 * In-app notifications, for the admin console.
 *
 * Always available — it needs no third-party credentials, which makes it the
 * channel that still works when email is misconfigured. Entries expire via a
 * Firestore TTL rather than a cron.
 */
export const dashboardAdapter: NotifyAdapter = {
  channel: "dashboard",
  isConfigured: () => true,
  async send(message, payload) {
    await getDb().collection(DASHBOARD_COLLECTION).add({
      subject: message.subject,
      body: message.body,
      // Kept so the console can deep-link back to what the notice is about.
      entityType: typeof payload.entityType === "string" ? payload.entityType : null,
      entityId: typeof payload.entityId === "string" ? payload.entityId : null,
      read: false,
      at: FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + DASHBOARD_RETENTION_DAYS * 24 * 60 * 60 * 1000),
    });
  },
};

/**
 * WhatsApp and SMS are declared but not implemented.
 *
 * They report themselves unconfigured, so the dispatcher skips them and the
 * settings toggles are honest about doing nothing yet. Declaring them now is
 * the point of the exercise: wiring a real provider means replacing `send`
 * here, and no route, action or template changes.
 */
export const whatsappAdapter: NotifyAdapter = {
  channel: "whatsapp",
  async isConfigured() {
    // Gated on the feature flag AND on credentials that do not exist yet, so
    // enabling the toggle alone cannot silently drop messages.
    return (await getSettings()).features.whatsappNotifications && Boolean(process.env.WHATSAPP_TOKEN);
  },
  async send() {
    throw new Error("WhatsApp adapter is not implemented");
  },
};

export const smsAdapter: NotifyAdapter = {
  channel: "sms",
  async isConfigured() {
    return (await getSettings()).features.smsNotifications && Boolean(process.env.SMS_TOKEN);
  },
  async send() {
    throw new Error("SMS adapter is not implemented");
  },
};

export const ADAPTERS: NotifyAdapter[] = [emailAdapter, dashboardAdapter, whatsappAdapter, smsAdapter];
