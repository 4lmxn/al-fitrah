import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE_MS } from "@/lib/adminAuth";
import { getAuthAdmin } from "@/lib/firebaseAdmin";
import { getClientIp } from "@/lib/clientIp";
import { rateLimited } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (await rateLimited(`login:${ip}`, { max: 10 })) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Please try again shortly." }, { status: 429 });
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

  const result = await createSession(idToken);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, result.cookie, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const store = await cookies();
  const value = store.get(SESSION_COOKIE)?.value;
  if (value) {
    try {
      const decoded = await getAuthAdmin().verifySessionCookie(value);
      await getAuthAdmin().revokeRefreshTokens(decoded.sub);
    } catch {
      // Cookie already invalid/expired — nothing to revoke.
    }
  }
  store.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
