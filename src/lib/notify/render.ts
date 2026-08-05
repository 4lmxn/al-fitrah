import type { NotifyPayload } from "./types";

/**
 * Fill `{{token}}` placeholders from a payload.
 *
 * Deliberately not a template engine. Templates are edited by a school
 * administrator in a textarea; loops, conditionals and expressions would turn a
 * settings field into a place where someone can execute logic, and a broken
 * template into a broken page rather than a slightly odd email.
 *
 * An unknown token renders as an empty string rather than the literal
 * `{{whatever}}` — a parent should never receive braces, and a typo in a
 * template should degrade quietly rather than look like a system error.
 */
export function render(template: string, payload: NotifyPayload): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = payload[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

/** Tokens a template references, for showing an admin what is available. */
export function tokensIn(template: string): string[] {
  return [...new Set([...template.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)].map((m) => m[1]))];
}
