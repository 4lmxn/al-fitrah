import type { NotifyPayload } from "./types";

export function render(template: string, payload: NotifyPayload): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = payload[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

export function tokensIn(template: string): string[] {
  return [...new Set([...template.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map((m) => m[1]))];
}
