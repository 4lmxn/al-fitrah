import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createParentSession, PARENT_SESSION_COOKIE, PARENT_SESSION_MAX_AGE_MS } from "@/lib/parentAuth";
import { getAuthAdmin } from "@/lib/firebaseAdmin";
import { getClientIp } from "@/lib/clientIp";
import { rateLimited } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (ip !== "unknown" && await rateLimited(`parent-login:${ip}`, { max: 10, windowMs: 10 * 60_000 })) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const idToken =
    typeof body === "object" && body !== null ? (body as { idToken?: unknown }).idToken : undefined;
  if (typeof idToken !== "string" || !idToken) {
    return NextResponse.json({ ok: false, error: "Missing token." }, { status: 400 });
  }

  const result = await createParentSession(idToken);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  const store = await cookies();
  store.set(PARENT_SESSION_COOKIE, result.cookie, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: PARENT_SESSION_MAX_AGE_MS / 1000,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const store = await cookies();
  const value = store.get(PARENT_SESSION_COOKIE)?.value;
  if (value) {
    try {
      const decoded = await getAuthAdmin().verifySessionCookie(value);
      await getAuthAdmin().revokeRefreshTokens(decoded.sub);
    } catch {
      // Already invalid — nothing to revoke.
    }
  }
  store.delete(PARENT_SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
