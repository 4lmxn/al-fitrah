export type ActionResult = { ok: true } | { ok: false; error: string };

export const ok: ActionResult = { ok: true };

export function fail(error: string): ActionResult {
  return { ok: false, error };
}

export async function attempt(
  label: string,
  body: () => Promise<ActionResult | void>,
): Promise<ActionResult> {
  try {
    return (await body()) ?? ok;
  } catch (err) {
    if (isControlFlow(err)) throw err;
    console.error(`${label} failed`, err);
    return fail("Something went wrong. Please try again.");
  }
}

function isControlFlow(err: unknown): boolean {
  const digest = (err as { digest?: unknown })?.digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND");
}
