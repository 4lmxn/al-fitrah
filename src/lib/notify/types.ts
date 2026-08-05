/**
 * Notification engine — types and the event catalogue.
 *
 * Callers emit domain events and never name a channel. That is the whole point:
 * today `lib/email.ts` is called directly from four routes, so adding WhatsApp
 * would mean editing every one of them and every future one. With a dispatcher,
 * a new channel is one adapter plus one configuration flag.
 */

export const NOTIFY_EVENTS = [
  "lead.created",
  "application.received",
  "followup.due",
] as const;
export type NotifyEvent = (typeof NOTIFY_EVENTS)[number];

export const NOTIFY_CHANNELS = ["email", "dashboard", "whatsapp", "sms"] as const;
export type NotifyChannel = (typeof NOTIFY_CHANNELS)[number];

/**
 * Values a template can interpolate. Flat and stringy on purpose — a template
 * is written by a school administrator, not a programmer, so `{{parentName}}`
 * has to be the whole mental model.
 */
export type NotifyPayload = Record<string, string | number | null | undefined>;

export type NotifyMessage = {
  subject: string;
  body: string;
};

/**
 * A delivery channel.
 *
 * `send` must resolve rather than throw for an expected failure — an unset API
 * key, a channel that is switched off. The dispatcher isolates throws anyway,
 * but an adapter that reports honestly gives a better audit trail than one that
 * relies on being caught.
 */
export type NotifyAdapter = {
  channel: NotifyChannel;
  /** False when the channel is not configured; the dispatcher skips it quietly. */
  isConfigured(): Promise<boolean> | boolean;
  send(message: NotifyMessage, payload: NotifyPayload): Promise<void>;
};

export type NotifyResult = {
  event: NotifyEvent;
  delivered: NotifyChannel[];
  skipped: NotifyChannel[];
  failed: { channel: NotifyChannel; error: string }[];
};
