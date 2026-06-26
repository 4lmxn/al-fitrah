// Runs once when a server instance starts (Next.js `register` hook). Used here to
// validate environment configuration at boot so misconfiguration surfaces in the
// logs immediately instead of as silent failures at request time.
export async function register() {
  // Only run on the Node.js server runtime — the Edge runtime doesn't carry the
  // server-only secrets, and `server-only` imports would throw there.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { checkEnv } = await import("./lib/envCheck");
    checkEnv();
  }
}
