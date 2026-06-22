import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE_MS } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { idToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  if (!body.idToken) {
    return NextResponse.json({ ok: false, error: "Missing token." }, { status: 400 });
  }

  const result = await createSession(body.idToken);
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
  store.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
