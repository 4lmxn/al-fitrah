import "server-only";
import { getSettings } from "@/lib/settings";
import { render } from "./render";
import { ADAPTERS } from "./adapters";
import type { NotifyEvent, NotifyPayload, NotifyResult } from "./types";

export * from "./types";
export { render, tokensIn } from "./render";
export { DASHBOARD_COLLECTION } from "./adapters";

export async function notify(event: NotifyEvent, payload: NotifyPayload): Promise<NotifyResult> {
  const result: NotifyResult = { event, delivered: [], skipped: [], failed: [] };

  let template;
  try {
    const settings = await getSettings();
    template = settings.notifications.templates[event];
    const enabled = new Set(settings.notifications.events[event]);

    const message = {
      subject: render(template.subject, payload),
      body: render(template.body, payload),
    };

    await Promise.all(
      ADAPTERS.map(async (adapter) => {
        if (!enabled.has(adapter.channel)) return void result.skipped.push(adapter.channel);
        try {
          if (!(await adapter.isConfigured())) return void result.skipped.push(adapter.channel);
          await adapter.send(message, payload);
          result.delivered.push(adapter.channel);
        } catch (err) {
          result.failed.push({ channel: adapter.channel, error: err instanceof Error ? err.message : String(err) });
        }
      }),
    );
  } catch (err) {
    result.failed.push({ channel: "email", error: err instanceof Error ? err.message : String(err) });
  }

  if (result.failed.length) {
    console.error(`notify ${event}: ${result.failed.map((f) => `${f.channel}=${f.error}`).join(", ")}`);
  }
  return result;
}
