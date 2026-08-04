/**
 * Return type for server actions.
 *
 * Server actions used to signal failure by throwing. In development that shows
 * the message; in production Next replaces it with an opaque digest and the
 * error boundary takes over — so an admin mid-triage clicks a stage dropdown,
 * the page blanks, and nothing on screen says why or what to do. Worse, the
 * failures being thrown were mostly ordinary and expected ("that lead is gone",
 * "that date doesn't parse"), not exceptions.
 *
 * Returning a result makes the expected failures renderable next to the control
 * that caused them. Genuine bugs still throw and still reach the error boundary,
 * which is where they belong.
 */
export type ActionResult = { ok: true } | { ok: false; error: string };

export const ok: ActionResult = { ok: true };

export function fail(error: string): ActionResult {
  return { ok: false, error };
}

/**
 * Wrap an action body so an unexpected throw becomes a message the UI can show.
 *
 * `redirect()` and `notFound()` work by throwing a control-flow signal that Next
 * catches upstream; swallowing those would break navigation in a way that looks
 * like the action silently did nothing. They are re-thrown untouched — hence
 * the digest check rather than a blanket catch.
 */
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
