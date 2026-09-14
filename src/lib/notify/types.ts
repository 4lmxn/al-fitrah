export const NOTIFY_EVENTS = [
  "lead.created",
  "application.received",
  "followup.due",
  "lead.assigned",
] as const;
export type NotifyEvent = (typeof NOTIFY_EVENTS)[number];

export const NOTIFY_CHANNELS = ["email", "dashboard", "whatsapp", "sms"] as const;
export type NotifyChannel = (typeof NOTIFY_CHANNELS)[number];

export type NotifyPayload = Record<string, string | number | null | undefined>;

export type NotifyMessage = {
  subject: string;
  body: string;
};

export type NotifyAdapter = {
  channel: NotifyChannel;
  isConfigured(): Promise<boolean> | boolean;
  send(message: NotifyMessage, payload: NotifyPayload): Promise<void>;
};

export type NotifyResult = {
  event: NotifyEvent;
  delivered: NotifyChannel[];
  skipped: NotifyChannel[];
  failed: { channel: NotifyChannel; error: string }[];
};
