# Admin Auth + Unified Leads Inbox — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a secure admin area where Al Fitrah staff manage two lead types — admission inquiries (students) and staff applications (with CV upload) — through a server-rendered inbox with stage pipelines and notes.

**Architecture:** Firebase session-cookie auth (Google sign-in via web SDK → server-verified httpOnly cookie, email allowlist). All lead data and CV files stay server-only via the Admin SDK; Firestore + Storage rules are deny-all. Careers form posts multipart to an API route that uploads the CV to Storage then writes the lead. Admin inbox + detail are server components; mutations are server actions that re-verify admin.

**Tech Stack:** Next.js 16 (App Router, SSR on Firebase App Hosting), TypeScript, Tailwind v4, firebase-admin (Firestore + Storage + Auth), firebase (web SDK, client sign-in only), zod, vitest (unit), Playwright (e2e).

## Global Constraints

- Next.js 16 App Router; this is NOT the Next.js in training data — check `node_modules/next/dist/docs/` before using unfamiliar APIs. `cookies()` and `headers()` from `next/headers` are **async** — always `await` them.
- `firebase-admin` is server-only; never import it from a Client Component. The `firebase` web SDK is client-only and used ONLY for the Google sign-in handshake.
- `firestore.rules` and `storage.rules` stay `allow read, write: if false` for everything. The Admin SDK bypasses rules.
- Session cookie: name `__session`, httpOnly, Secure, SameSite=Lax, 5-day expiry (`60 * 60 * 24 * 5 * 1000` ms).
- Email allowlist from `ADMIN_EMAILS` (comma-separated). Re-check the allowlist on EVERY admin request and inside EVERY mutating server action (defense in depth).
- CV files: accept only PDF/DOC/DOCX, max 5 MB (`5 * 1024 * 1024` bytes). Stored at `applications/{leadId}/{sanitizedFilename}`. Never public — admin downloads via 15-minute signed URLs.
- Lead pipelines (exact, per type):
  - `admission_inquiry`: `new → contacted → toured → enrolled → closed`
  - `staff_application`: `new → reviewing → interview → hired → rejected`
- Storage bucket name = `process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` (already set: `al-fitrah.firebasestorage.app`).
- UI copy: professional English. Match existing component styling (emerald/gold/cream tokens, `rounded-xl3`, `shadow-soft`, `Icon`, `Section`, `Container`).

---

## File Structure

**New library modules:**
- `src/lib/leads.ts` — lead/stage types, pipelines, `isValidStage`, stage label maps.
- `src/lib/applicationSchema.ts` — zod schema for staff fields + CV file constants + `validateCvFile`.
- `src/lib/rateLimit.ts` — shared in-memory rate limiter (extracted from inquiry route).
- `src/lib/adminAuth.ts` — allowlist parse, `isAllowed`, session cookie helpers, `requireAdmin`.
- `src/lib/firebaseClient.ts` — web SDK init + `signInWithGoogle`.

**Modified:**
- `src/lib/firebaseAdmin.ts` — also export `getAdminApp`, `getAuthAdmin`, `getBucket`.
- `src/app/api/inquiry/route.ts` — use shared `rateLimit`.
- `src/app/careers/page.tsx` — replace mailto buttons with the careers form.
- `apphosting.yaml` — add `ADMIN_EMAILS` secret.
- `firebase.json` — register `storage.rules`.

**New routes / components:**
- `src/app/api/application/route.ts` — multipart staff application intake.
- `src/app/api/auth/session/route.ts` — POST (login) / DELETE (logout).
- `src/components/pages/CareersForm.tsx` — client form with file input + honeypot.
- `src/app/admin/layout.tsx` — auth gate + shell.
- `src/app/admin/login/page.tsx` — client Google sign-in.
- `src/app/admin/page.tsx` — inbox (type tabs, stage filter, counts).
- `src/app/admin/leads/[id]/page.tsx` — detail view.
- `src/app/admin/leads/[id]/actions.ts` — `updateStage`, `addNote` server actions.
- `src/app/admin/leads/[id]/cv/route.ts` — CV signed-URL redirect.
- `storage.rules` — deny-all.

**Tests:**
- `tests/unit/leads.test.ts`, `tests/unit/applicationSchema.test.ts`, `tests/unit/adminAuth.test.ts`
- `tests/e2e/admin.spec.ts`, `tests/e2e/careers.spec.ts`
- `vitest.config.ts`

---

## Task 1: Test tooling + dependencies

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `tests/unit/smoke.test.ts`

**Interfaces:**
- Produces: `npm run test:unit` runs vitest over `tests/unit/**`.

- [ ] **Step 1: Install dependencies**

```bash
npm install firebase
npm install -D vitest
```

Expected: `firebase` added to dependencies, `vitest` to devDependencies.

- [ ] **Step 2: Add the unit-test script**

In `package.json`, add to `scripts` (keep existing scripts):

```json
    "test:unit": "vitest run",
    "test:unit:watch": "vitest"
```

- [ ] **Step 3: Create vitest config**

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

- [ ] **Step 4: Create a smoke test**

`tests/unit/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("unit test harness", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run it**

Run: `npm run test:unit`
Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts tests/unit/smoke.test.ts
git commit -m "chore: add vitest unit harness + firebase web SDK"
```

---

## Task 2: Lead domain module

**Files:**
- Create: `src/lib/leads.ts`
- Test: `tests/unit/leads.test.ts`

**Interfaces:**
- Produces:
  - `type LeadType = "admission_inquiry" | "staff_application"`
  - `type Stage = string`
  - `const PIPELINES: Record<LeadType, readonly string[]>`
  - `function isValidStage(type: LeadType, stage: string): boolean`
  - `const LEAD_TYPE_LABEL: Record<LeadType, string>`
  - `function stageLabel(stage: string): string`

- [ ] **Step 1: Write the failing test**

`tests/unit/leads.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { PIPELINES, isValidStage, stageLabel, LEAD_TYPE_LABEL } from "@/lib/leads";

describe("lead pipelines", () => {
  it("defines the student pipeline in order", () => {
    expect(PIPELINES.admission_inquiry).toEqual([
      "new", "contacted", "toured", "enrolled", "closed",
    ]);
  });

  it("defines the staff pipeline in order", () => {
    expect(PIPELINES.staff_application).toEqual([
      "new", "reviewing", "interview", "hired", "rejected",
    ]);
  });

  it("accepts a stage valid for the type", () => {
    expect(isValidStage("admission_inquiry", "toured")).toBe(true);
    expect(isValidStage("staff_application", "interview")).toBe(true);
  });

  it("rejects a stage from the wrong type", () => {
    expect(isValidStage("admission_inquiry", "interview")).toBe(false);
    expect(isValidStage("staff_application", "toured")).toBe(false);
  });

  it("rejects an unknown stage", () => {
    expect(isValidStage("admission_inquiry", "banana")).toBe(false);
  });

  it("humanizes stage and type labels", () => {
    expect(stageLabel("new")).toBe("New");
    expect(LEAD_TYPE_LABEL.staff_application).toBe("Staff application");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — cannot resolve `@/lib/leads`.

- [ ] **Step 3: Write the implementation**

`src/lib/leads.ts`:

```ts
export type LeadType = "admission_inquiry" | "staff_application";

export const PIPELINES: Record<LeadType, readonly string[]> = {
  admission_inquiry: ["new", "contacted", "toured", "enrolled", "closed"],
  staff_application: ["new", "reviewing", "interview", "hired", "rejected"],
};

export const LEAD_TYPE_LABEL: Record<LeadType, string> = {
  admission_inquiry: "Admission inquiry",
  staff_application: "Staff application",
};

export function isValidStage(type: LeadType, stage: string): boolean {
  return PIPELINES[type]?.includes(stage) ?? false;
}

export function stageLabel(stage: string): string {
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit`
Expected: PASS (smoke + leads).

- [ ] **Step 5: Commit**

```bash
git add src/lib/leads.ts tests/unit/leads.test.ts
git commit -m "feat: lead type + stage pipeline domain module"
```

---

## Task 3: Staff application schema + CV file validation

**Files:**
- Create: `src/lib/applicationSchema.ts`
- Test: `tests/unit/applicationSchema.test.ts`

**Interfaces:**
- Produces:
  - `const ACCEPTED_CV_TYPES: string[]` (pdf, doc, docx mime types)
  - `const MAX_CV_BYTES = 5 * 1024 * 1024`
  - `const applicationSchema` (zod): `{ name, phone, email?, role, message?, website? }`
  - `type ApplicationInput = z.infer<typeof applicationSchema>`
  - `function validateCvFile(file: { type: string; size: number; name: string }): { ok: true } | { ok: false; error: string }`
  - `function sanitizeFilename(name: string): string`

- [ ] **Step 1: Write the failing test**

`tests/unit/applicationSchema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  applicationSchema, validateCvFile, sanitizeFilename, MAX_CV_BYTES,
} from "@/lib/applicationSchema";

describe("applicationSchema", () => {
  it("accepts a valid application", () => {
    const r = applicationSchema.safeParse({
      name: "Fatima Noor", phone: "+91 99860 49413",
      email: "f@example.com", role: "Montessori Lead Teacher", message: "5 yrs exp",
    });
    expect(r.success).toBe(true);
  });

  it("requires a role", () => {
    const r = applicationSchema.safeParse({ name: "A B", phone: "9999999", role: "" });
    expect(r.success).toBe(false);
  });

  it("treats a filled honeypot as parseable (handled by caller)", () => {
    const r = applicationSchema.safeParse({
      name: "A B", phone: "9999999", role: "Assistant", website: "spam",
    });
    expect(r.success).toBe(false); // website must be empty
  });
});

describe("validateCvFile", () => {
  it("accepts a PDF under the size cap", () => {
    expect(validateCvFile({ type: "application/pdf", size: 1000, name: "cv.pdf" }))
      .toEqual({ ok: true });
  });

  it("rejects an oversized file", () => {
    const r = validateCvFile({ type: "application/pdf", size: MAX_CV_BYTES + 1, name: "cv.pdf" });
    expect(r.ok).toBe(false);
  });

  it("rejects an unsupported type", () => {
    const r = validateCvFile({ type: "image/png", size: 10, name: "cv.png" });
    expect(r.ok).toBe(false);
  });

  it("rejects an empty file", () => {
    const r = validateCvFile({ type: "application/pdf", size: 0, name: "cv.pdf" });
    expect(r.ok).toBe(false);
  });
});

describe("sanitizeFilename", () => {
  it("strips path separators and unsafe chars", () => {
    expect(sanitizeFilename("../../My CV (final).pdf")).toBe("My_CV_final.pdf");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — cannot resolve `@/lib/applicationSchema`.

- [ ] **Step 3: Write the implementation**

`src/lib/applicationSchema.ts`:

```ts
import { z } from "zod";

export const MAX_CV_BYTES = 5 * 1024 * 1024;

export const ACCEPTED_CV_TYPES = [
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
];

export const applicationSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  phone: z.string().trim().min(7, "Please enter a valid phone number").max(20)
    .regex(/^[0-9+\-\s()]+$/, "Phone may only contain digits and + - ( )"),
  email: z.string().trim().email("Please enter a valid email").max(120).optional().or(z.literal("")),
  role: z.string().trim().min(2, "Please select or enter a role").max(100),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  // Honeypot — must stay empty (bots fill it).
  website: z.string().max(0).optional(),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;

export function validateCvFile(
  file: { type: string; size: number; name: string },
): { ok: true } | { ok: false; error: string } {
  if (!file || file.size === 0) return { ok: false, error: "Please attach your CV." };
  if (!ACCEPTED_CV_TYPES.includes(file.type)) {
    return { ok: false, error: "CV must be a PDF, DOC, or DOCX file." };
  }
  if (file.size > MAX_CV_BYTES) {
    return { ok: false, error: "CV must be 5 MB or smaller." };
  }
  return { ok: true };
}

export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const dot = base.lastIndexOf(".");
  const stem = (dot > 0 ? base.slice(0, dot) : base).replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const ext = dot > 0 ? base.slice(dot + 1).replace(/[^a-zA-Z0-9]/g, "") : "";
  const safeStem = stem || "cv";
  return ext ? `${safeStem}.${ext}` : safeStem;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/applicationSchema.ts tests/unit/applicationSchema.test.ts
git commit -m "feat: staff application schema + CV file validation"
```

---

## Task 4: Extract shared rate limiter

**Files:**
- Create: `src/lib/rateLimit.ts`
- Modify: `src/app/api/inquiry/route.ts`
- Test: `tests/unit/rateLimit.test.ts`

**Interfaces:**
- Produces: `function rateLimited(key: string, opts?: { windowMs?: number; max?: number }): boolean`

- [ ] **Step 1: Write the failing test**

`tests/unit/rateLimit.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { rateLimited } from "@/lib/rateLimit";

describe("rateLimited", () => {
  it("allows up to max within the window, then blocks", () => {
    const key = "test-ip-" + Math.random();
    const opts = { windowMs: 60_000, max: 3 };
    expect(rateLimited(key, opts)).toBe(false);
    expect(rateLimited(key, opts)).toBe(false);
    expect(rateLimited(key, opts)).toBe(false);
    expect(rateLimited(key, opts)).toBe(true); // 4th call blocked
  });

  it("isolates different keys", () => {
    const opts = { windowMs: 60_000, max: 1 };
    const a = "a-" + Math.random();
    const b = "b-" + Math.random();
    expect(rateLimited(a, opts)).toBe(false);
    expect(rateLimited(b, opts)).toBe(false);
    expect(rateLimited(a, opts)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — cannot resolve `@/lib/rateLimit`.

- [ ] **Step 3: Write the implementation**

`src/lib/rateLimit.ts`:

```ts
// Lightweight in-memory rate limit (per instance). Good enough for a
// low-traffic marketing site; swap for Firestore/Redis if traffic grows.
const HITS = new Map<string, { count: number; ts: number }>();

export function rateLimited(
  key: string,
  opts: { windowMs?: number; max?: number } = {},
): boolean {
  const windowMs = opts.windowMs ?? 60_000;
  const max = opts.max ?? 5;
  const now = Date.now();
  const rec = HITS.get(key);
  if (!rec || now - rec.ts > windowMs) {
    HITS.set(key, { count: 1, ts: now });
    return false;
  }
  rec.count += 1;
  return rec.count > max;
}
```

- [ ] **Step 4: Refactor the inquiry route to use it**

In `src/app/api/inquiry/route.ts`, remove the local `HITS`, `WINDOW_MS`, `MAX_PER_WINDOW`, and `rateLimited` definitions. Add the import and update the call:

```ts
import { rateLimited } from "@/lib/rateLimit";
```

Replace the call site:

```ts
  if (rateLimited(ip)) {
```

(The default opts of 60s / 5 match the previous behavior.)

- [ ] **Step 5: Run tests + build**

Run: `npm run test:unit && npm run build`
Expected: unit PASS; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/lib/rateLimit.ts src/app/api/inquiry/route.ts tests/unit/rateLimit.test.ts
git commit -m "refactor: extract shared in-memory rate limiter"
```

---

## Task 5: Storage helpers

**Files:**
- Modify: `src/lib/firebaseAdmin.ts`
- Create: `src/lib/storage.ts`

**Interfaces:**
- Consumes: `getAdminApp` (newly exported from firebaseAdmin).
- Produces:
  - `getBucket()` → Admin SDK `Bucket` (from firebaseAdmin).
  - `uploadCv(leadId: string, file: { buffer: Buffer; filename: string; contentType: string }): Promise<{ path: string }>`
  - `getCvSignedUrl(path: string): Promise<string>` (15-minute expiry)
  - `deleteObject(path: string): Promise<void>`

- [ ] **Step 1: Export the app, auth, and bucket from firebaseAdmin**

In `src/lib/firebaseAdmin.ts`, add imports and exports. Change the top imports to:

```ts
import { getApps, initializeApp, cert, applicationDefault, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
```

Then export `getAdminApp` (remove the `function getAdminApp` privacy by adding `export`), and append:

```ts
export function getAuthAdmin(): Auth {
  return getAuth(getAdminApp());
}

export function getBucket() {
  const name = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  return getStorage(getAdminApp()).bucket(name);
}
```

- [ ] **Step 2: Create the storage helper module**

`src/lib/storage.ts`:

```ts
import { getBucket } from "@/lib/firebaseAdmin";
import { sanitizeFilename } from "@/lib/applicationSchema";

export async function uploadCv(
  leadId: string,
  file: { buffer: Buffer; filename: string; contentType: string },
): Promise<{ path: string }> {
  const safe = sanitizeFilename(file.filename);
  const path = `applications/${leadId}/${safe}`;
  const blob = getBucket().file(path);
  await blob.save(file.buffer, {
    contentType: file.contentType,
    resumable: false,
    metadata: { cacheControl: "private, max-age=0" },
  });
  return { path };
}

export async function getCvSignedUrl(path: string): Promise<string> {
  const [url] = await getBucket().file(path).getSignedUrl({
    action: "read",
    expires: Date.now() + 15 * 60 * 1000,
  });
  return url;
}

export async function deleteObject(path: string): Promise<void> {
  await getBucket().file(path).delete({ ignoreNotFound: true });
}
```

- [ ] **Step 3: Verify it type-checks**

Run: `npm run build`
Expected: build succeeds (no runtime call yet).

- [ ] **Step 4: Commit**

```bash
git add src/lib/firebaseAdmin.ts src/lib/storage.ts
git commit -m "feat: admin storage helpers (upload, signed URL, delete)"
```

> **Note:** runtime Storage behavior is covered by the manual test in Task 15 (needs the live bucket + credentials).

---

## Task 6: Staff application API route

**Files:**
- Create: `src/app/api/application/route.ts`

**Interfaces:**
- Consumes: `rateLimited`, `applicationSchema`, `validateCvFile`, `uploadCv`, `deleteObject`, `getDb`, `LeadType`.
- Produces: `POST /api/application` accepting `multipart/form-data` with fields (`name`, `phone`, `email`, `role`, `message`, `website`) + a `cv` file. Returns `{ ok: true, id }` or an error JSON.

- [ ] **Step 1: Write the route**

`src/app/api/application/route.ts`:

```ts
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { rateLimited } from "@/lib/rateLimit";
import { applicationSchema, validateCvFile } from "@/lib/applicationSchema";
import { uploadCv, deleteObject } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, error: "Too many requests. Please try again shortly." }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const fields = {
    name: String(form.get("name") ?? ""),
    phone: String(form.get("phone") ?? ""),
    email: String(form.get("email") ?? ""),
    role: String(form.get("role") ?? ""),
    message: String(form.get("message") ?? ""),
    website: String(form.get("website") ?? ""),
  };

  const parsed = applicationSchema.safeParse(fields);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Please check the form.", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  // Honeypot tripped — pretend success, store nothing.
  if (parsed.data.website) return NextResponse.json({ ok: true });

  const cv = form.get("cv");
  if (!(cv instanceof File)) {
    return NextResponse.json({ ok: false, error: "Please attach your CV." }, { status: 422 });
  }
  const fileCheck = validateCvFile({ type: cv.type, size: cv.size, name: cv.name });
  if (!fileCheck.ok) {
    return NextResponse.json({ ok: false, error: fileCheck.error }, { status: 422 });
  }

  const { name, phone, email, role, message } = parsed.data;
  const db = getDb();
  const ref = db.collection("leads").doc(); // pre-generate id for the CV path

  let cvPath: string | null = null;
  try {
    const buffer = Buffer.from(await cv.arrayBuffer());
    const uploaded = await uploadCv(ref.id, { buffer, filename: cv.name, contentType: cv.type });
    cvPath = uploaded.path;

    await ref.set({
      type: "staff_application",
      name,
      phone,
      email: email || null,
      role,
      message: message || null,
      cv: { path: uploaded.path, filename: cv.name, contentType: cv.type, size: cv.size },
      stage: "new",
      source: "website",
      notes: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, id: ref.id });
  } catch (err) {
    console.error("application intake failed", err);
    // Roll back the uploaded CV so we never leave an orphan file.
    if (cvPath) await deleteObject(cvPath).catch(() => {});
    return NextResponse.json({ ok: false, error: "Something went wrong. Please call us instead." }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: build succeeds; `/api/application` listed as a dynamic route.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/application/route.ts
git commit -m "feat: staff application intake API (CV upload + lead write)"
```

---

## Task 7: Careers application form + wire into the page

**Files:**
- Create: `src/components/pages/CareersForm.tsx`
- Modify: `src/app/careers/page.tsx`
- Test: `tests/e2e/careers.spec.ts`

**Interfaces:**
- Consumes: `MAX_CV_BYTES`, `ACCEPTED_CV_TYPES` (for the file input `accept` + client-side size hint), `POST /api/application`.
- Produces: a `CareersForm` client component rendered on `/careers`; preset `role` via a `roles` prop (string[]).

- [ ] **Step 1: Write the careers form component**

`src/components/pages/CareersForm.tsx`:

```tsx
"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { MAX_CV_BYTES, ACCEPTED_CV_TYPES } from "@/lib/applicationSchema";

const field =
  "w-full rounded-xl border border-emerald/15 bg-cream/40 px-4 py-3 text-ink outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/20 placeholder:text-ink/35";
const labelCls = "block text-sm font-semibold text-emerald-deep";

type Status = "idle" | "submitting" | "success" | "error";

export function CareersForm({ roles }: { roles: string[] }) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formEl = e.currentTarget;
    const fd = new FormData(formEl);
    const cv = fd.get("cv");
    if (!(cv instanceof File) || cv.size === 0) {
      setError("Please attach your CV (PDF, DOC, or DOCX).");
      setStatus("error");
      return;
    }
    if (cv.size > MAX_CV_BYTES) {
      setError("CV must be 5 MB or smaller.");
      setStatus("error");
      return;
    }
    setStatus("submitting");
    try {
      const res = await fetch("/api/application", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Please check the form and try again.");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setError("Network error. Please try again or email us.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div data-testid="careers-success" className="flex flex-col items-start gap-3 rounded-2xl border border-emerald/15 bg-emerald/5 p-6">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald text-cream">
          <Icon name="check" className="text-[26px]" />
        </span>
        <h3 className="text-xl text-emerald-deep">Thank you — we&apos;ve received your application</h3>
        <p className="text-ink/70">Our team will review it and be in touch if there&apos;s a fit, in shaa Allah.</p>
      </div>
    );
  }

  const busy = status === "submitting";
  return (
    <form data-testid="careers-form" className="space-y-5" onSubmit={onSubmit} noValidate>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label className={labelCls} htmlFor="name">Full name *</label>
          <input id="name" name="name" required placeholder="e.g. Fatima Noor" className={field} />
        </div>
        <div className="space-y-2">
          <label className={labelCls} htmlFor="phone">Phone number *</label>
          <input id="phone" name="phone" type="tel" required placeholder="+91  xxxxx xxxxx" className={field} />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label className={labelCls} htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" placeholder="you@example.com" className={field} />
        </div>
        <div className="space-y-2">
          <label className={labelCls} htmlFor="role">Role *</label>
          <select id="role" name="role" required defaultValue="" className={`${field} cursor-pointer`}>
            <option value="" disabled>Select a role</option>
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
            <option value="Other">Other / general application</option>
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <label className={labelCls} htmlFor="message">Cover note</label>
        <textarea id="message" name="message" rows={4} placeholder="Tell us about your experience" className={`${field} resize-none`} />
      </div>
      <div className="space-y-2">
        <label className={labelCls} htmlFor="cv">CV / Resume * <span className="font-normal text-ink/50">(PDF, DOC, DOCX — max 5 MB)</span></label>
        <input id="cv" name="cv" type="file" required accept={ACCEPTED_CV_TYPES.join(",")} className={`${field} cursor-pointer file:mr-3 file:rounded-full file:border-0 file:bg-emerald file:px-4 file:py-1.5 file:text-cream`} />
      </div>

      {status === "error" && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="group inline-flex items-center justify-center gap-2 rounded-full bg-emerald px-7 py-3 text-sm font-semibold text-cream transition hover:bg-emerald-deep focus-visible:outline disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Submitting…" : "Submit application"}
        {!busy && <Icon name="arrow_forward" className="text-base transition-transform group-hover:translate-x-1" />}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Wire the form into the careers page**

In `src/app/careers/page.tsx`:

1. Add the import: `import { CareersForm } from "@/components/pages/CareersForm";`
2. Add `import { Section } from "@/components/ui/Section";` (already imported) and ensure `Container`, `Reveal` are imported (they are).
3. Replace the `<a ... mailto ...>Apply</a>` link inside the roles list with a plain label (remove the mailto). Change the roles list item's right-hand side from the mailto anchor to nothing, OR keep the card but drop the link — the dedicated form below now handles applying. Simplest: replace the `<a>` with a static pill:

```tsx
                  <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-emerald/8 px-4 py-2 text-sm font-semibold text-emerald-deep">
                    Apply below <Icon name="south" className="text-[16px]" />
                  </span>
```

4. Replace the final `CTABand` ("Ready to apply?") with a real application section. Remove the `CTABand` import usage and add, before the closing fragment:

```tsx
      <Section id="apply" className="bg-cream-deep/60">
        <Container className="max-w-3xl">
          <Reveal>
            <div className="rounded-xl3 border border-emerald/10 bg-white/80 p-8 shadow-soft sm:p-10">
              <h2 className="text-2xl text-emerald-deep">Apply now</h2>
              <p className="mt-2 text-ink/70">Share your details and attach your CV. We review every application.</p>
              <div className="mt-8">
                <CareersForm roles={roles.map((r) => r.title)} />
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>
```

5. Remove the now-unused `CTABand` import if no longer referenced, and remove the `site` import only if it becomes unused (it is still used elsewhere? check — the mailto used `site.contact.email`; after removal `site` may be unused → remove its import to keep the build clean).

- [ ] **Step 3: Write the e2e test**

`tests/e2e/careers.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("careers form renders with required fields", async ({ page }) => {
  await page.goto("/careers");
  await expect(page.getByTestId("careers-form")).toBeVisible();
  await expect(page.locator("#cv")).toBeVisible();
  await expect(page.locator("#role")).toBeVisible();
});

test("careers form blocks submit with no CV", async ({ page }) => {
  await page.goto("/careers");
  await page.fill("#name", "Test Applicant");
  await page.fill("#phone", "9998887777");
  await page.selectOption("#role", { index: 1 });
  await page.getByRole("button", { name: /submit application/i }).click();
  await expect(page.getByRole("alert")).toContainText(/attach your CV/i);
});
```

- [ ] **Step 4: Build + run e2e**

Run: `npm run build && npm run test:e2e`
Expected: build succeeds; careers tests pass alongside existing suite.

- [ ] **Step 5: Commit**

```bash
git add src/components/pages/CareersForm.tsx src/app/careers/page.tsx tests/e2e/careers.spec.ts
git commit -m "feat: careers application form with CV upload"
```

---

## Task 8: Storage security rules

**Files:**
- Create: `storage.rules`
- Modify: `firebase.json`

**Interfaces:**
- Produces: deny-all `storage.rules` registered in `firebase.json`.

- [ ] **Step 1: Create the rules file**

`storage.rules`:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // All Storage access is server-only via the Admin SDK (which bypasses
    // these rules). No client may read or write objects directly.
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 2: Register it in firebase.json**

Read `firebase.json`. Add a `storage` entry alongside the existing `firestore` config:

```json
  "storage": {
    "rules": "storage.rules"
  }
```

(Keep all existing keys. If `firebase.json` already has a `storage` key, leave it.)

- [ ] **Step 3: Validate the build still works**

Run: `npm run build`
Expected: build succeeds (rules are not part of the Next build, but confirm nothing broke).

- [ ] **Step 4: Commit**

```bash
git add storage.rules firebase.json
git commit -m "feat: deny-all Storage security rules"
```

> **Note:** rules deploy with `firebase deploy --only storage` (manual, Task 15).

---

## Task 9: Admin auth module

**Files:**
- Modify: `src/lib/firebaseAdmin.ts` (already exports `getAuthAdmin` from Task 5 — no change if present)
- Create: `src/lib/adminAuth.ts`
- Test: `tests/unit/adminAuth.test.ts`

**Interfaces:**
- Consumes: `getAuthAdmin` (firebaseAdmin).
- Produces:
  - `getAllowlist(): string[]` — parse `process.env.ADMIN_EMAILS`, trimmed + lowercased, no empties.
  - `isAllowed(email: string | null | undefined): boolean`
  - `SESSION_COOKIE = "__session"`, `SESSION_MAX_AGE_MS = 60*60*24*5*1000`
  - `createSession(idToken: string): Promise<{ ok: true; cookie: string; email: string } | { ok: false; status: number; error: string }>`
  - `requireAdmin(): Promise<{ email: string }>` — reads the cookie via `next/headers`, verifies, checks allowlist; throws `Error("UNAUTHORIZED")` on failure.

- [ ] **Step 1: Write the failing test (pure parts only)**

`tests/unit/adminAuth.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getAllowlist, isAllowed } from "@/lib/adminAuth";

describe("admin allowlist", () => {
  const original = process.env.ADMIN_EMAILS;
  beforeEach(() => { process.env.ADMIN_EMAILS = "Admin@AlFitrah.com,  second@x.com ,"; });
  afterEach(() => { process.env.ADMIN_EMAILS = original; });

  it("parses, trims, lowercases, and drops empties", () => {
    expect(getAllowlist()).toEqual(["admin@alfitrah.com", "second@x.com"]);
  });

  it("matches case-insensitively", () => {
    expect(isAllowed("ADMIN@alfitrah.COM")).toBe(true);
    expect(isAllowed("second@x.com")).toBe(true);
  });

  it("rejects non-members and empty input", () => {
    expect(isAllowed("nobody@x.com")).toBe(false);
    expect(isAllowed("")).toBe(false);
    expect(isAllowed(null)).toBe(false);
    expect(isAllowed(undefined)).toBe(false);
  });

  it("returns an empty allowlist when env is unset", () => {
    delete process.env.ADMIN_EMAILS;
    expect(getAllowlist()).toEqual([]);
    expect(isAllowed("admin@alfitrah.com")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL — cannot resolve `@/lib/adminAuth`.

- [ ] **Step 3: Write the implementation**

`src/lib/adminAuth.ts`:

```ts
import "server-only";
import { cookies } from "next/headers";
import { getAuthAdmin } from "@/lib/firebaseAdmin";

export const SESSION_COOKIE = "__session";
export const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

export function getAllowlist(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAllowlist().includes(email.toLowerCase());
}

export async function createSession(
  idToken: string,
): Promise<{ ok: true; cookie: string; email: string } | { ok: false; status: number; error: string }> {
  const auth = getAuthAdmin();
  let decoded;
  try {
    decoded = await auth.verifyIdToken(idToken, true);
  } catch {
    return { ok: false, status: 401, error: "Invalid sign-in. Please try again." };
  }
  if (!isAllowed(decoded.email)) {
    return { ok: false, status: 403, error: "This account is not authorized for admin access." };
  }
  const cookie = await auth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
  return { ok: true, cookie, email: decoded.email! };
}

export async function requireAdmin(): Promise<{ email: string }> {
  const store = await cookies();
  const value = store.get(SESSION_COOKIE)?.value;
  if (!value) throw new Error("UNAUTHORIZED");
  let decoded;
  try {
    decoded = await getAuthAdmin().verifySessionCookie(value, true);
  } catch {
    throw new Error("UNAUTHORIZED");
  }
  if (!isAllowed(decoded.email)) throw new Error("UNAUTHORIZED");
  return { email: decoded.email! };
}
```

> **Note:** `import "server-only"` requires the `server-only` package, which ships with Next 16. If the build reports it missing, run `npm install server-only`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:unit`
Expected: PASS (allowlist + isAllowed tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/adminAuth.ts tests/unit/adminAuth.test.ts
git commit -m "feat: admin auth (allowlist, session cookie, requireAdmin)"
```

---

## Task 10: Firebase client SDK + session API route

**Files:**
- Create: `src/lib/firebaseClient.ts`
- Create: `src/app/api/auth/session/route.ts`

**Interfaces:**
- Consumes (client): `NEXT_PUBLIC_FIREBASE_*` env.
- Consumes (server): `createSession`, `SESSION_COOKIE`, `SESSION_MAX_AGE_MS`.
- Produces:
  - client: `signInWithGoogle(): Promise<string>` (returns an ID token).
  - server: `POST /api/auth/session` ({ idToken }) sets the cookie; `DELETE` clears it.

- [ ] **Step 1: Write the client SDK module**

`src/lib/firebaseClient.ts`:

```ts
"use client";
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

function clientApp(): FirebaseApp {
  if (getApps().length) return getApp();
  return initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
}

export async function signInWithGoogle(): Promise<string> {
  const auth = getAuth(clientApp());
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user.getIdToken();
}
```

- [ ] **Step 2: Write the session route**

`src/app/api/auth/session/route.ts`:

```ts
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
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds; `/api/auth/session` listed.

- [ ] **Step 4: Commit**

```bash
git add src/lib/firebaseClient.ts src/app/api/auth/session/route.ts
git commit -m "feat: firebase client sign-in + session cookie API"
```

---

## Task 11: Admin login page

**Files:**
- Create: `src/app/admin/login/page.tsx`

**Interfaces:**
- Consumes: `signInWithGoogle`, `POST /api/auth/session`.
- Produces: `/admin/login` route — Google sign-in button, redirects to `/admin` on success.

- [ ] **Step 1: Write the login page**

`src/app/admin/login/page.tsx`:

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle } from "@/lib/firebaseClient";
import { Icon } from "@/components/ui/Icon";

export default function AdminLoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSignIn() {
    setBusy(true);
    setError("");
    try {
      const idToken = await signInWithGoogle();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Sign-in failed. Please try again.");
        setBusy(false);
        return;
      }
      router.replace("/admin");
    } catch {
      setError("Sign-in was cancelled or failed. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-cream-deep/40 px-6">
      <div className="w-full max-w-sm rounded-xl3 border border-emerald/10 bg-white/90 p-8 text-center shadow-lift">
        <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald/8 text-emerald ring-1 ring-emerald/10">
          <Icon name="admin_panel_settings" className="text-[28px]" />
        </span>
        <h1 className="text-2xl text-emerald-deep">Admin access</h1>
        <p className="mt-2 text-sm text-ink/60">Sign in with an authorized Google account.</p>
        <button
          type="button"
          onClick={onSignIn}
          disabled={busy}
          data-testid="google-signin"
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald px-6 py-3 text-sm font-semibold text-cream transition hover:bg-emerald-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon name="login" className="text-[18px]" />
          {busy ? "Signing in…" : "Continue with Google"}
        </button>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds; `/admin/login` listed.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/login/page.tsx
git commit -m "feat: admin login page (Google sign-in)"
```

---

## Task 12: Admin layout (auth gate + shell)

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/components/admin/LogoutButton.tsx`
- Test: `tests/e2e/admin.spec.ts`

**Interfaces:**
- Consumes: `requireAdmin`, `DELETE /api/auth/session`.
- Produces: gated `/admin/*` shell. The login route must NOT be gated (it lives at `/admin/login` but the layout applies to it too — so the layout must allow the login path through). To avoid gating the login page, the gate reads the pathname is not available in a layout; instead, place the gate so the login page is OUTSIDE this layout by making `/admin/login` its own segment that opts out. Simplest robust approach: gate in the layout but treat an unauthorized state by rendering children only for non-login routes is not possible without the path. **Chosen approach:** keep `login` as a route that does its own thing and move the gate to a nested layout at `src/app/admin/(dash)/layout.tsx` with the dashboard pages under `(dash)`. See steps.

- [ ] **Step 1: Restructure admin routes under a route group**

Move the dashboard pages (created in later tasks) under a `(dash)` route group so the gate only wraps them, leaving `/admin/login` ungated.

Planned final structure:
```
src/app/admin/login/page.tsx          (ungated — from Task 11)
src/app/admin/(dash)/layout.tsx       (the gate + shell — this task)
src/app/admin/(dash)/page.tsx         (inbox — Task 13)
src/app/admin/(dash)/leads/[id]/...   (detail — Task 14)
```

> Route groups `(dash)` do not affect the URL: `(dash)/page.tsx` serves `/admin`.

- [ ] **Step 2: Write the logout button**

`src/components/admin/LogoutButton.tsx`:

```tsx
"use client";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

export function LogoutButton() {
  const router = useRouter();
  async function onLogout() {
    await fetch("/api/auth/session", { method: "DELETE" });
    router.replace("/admin/login");
  }
  return (
    <button
      type="button"
      onClick={onLogout}
      className="inline-flex items-center gap-2 rounded-full border border-cream/30 px-4 py-2 text-sm font-semibold text-cream/90 transition hover:bg-cream/10"
    >
      <Icon name="logout" className="text-[18px]" /> Sign out
    </button>
  );
}
```

- [ ] **Step 3: Write the gated layout**

`src/app/admin/(dash)/layout.tsx`:

```tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/adminAuth";
import { Container } from "@/components/ui/Container";
import { LogoutButton } from "@/components/admin/LogoutButton";

export const dynamic = "force-dynamic";

export default async function AdminDashLayout({ children }: { children: React.ReactNode }) {
  let admin: { email: string };
  try {
    admin = await requireAdmin();
  } catch {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-[100dvh] bg-cream-deep/30">
      <header className="bg-emerald text-cream">
        <Container className="flex items-center justify-between py-4">
          <Link href="/admin" className="font-display text-lg">Al Fitrah · Admin</Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-cream/70 sm:inline">{admin.email}</span>
            <LogoutButton />
          </div>
        </Container>
      </header>
      <main className="py-10">
        <Container>{children}</Container>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Write the redirect e2e test**

`tests/e2e/admin.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("/admin redirects to login when unauthenticated", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByTestId("google-signin")).toBeVisible();
});

test("/admin/leads/x redirects to login when unauthenticated", async ({ page }) => {
  await page.goto("/admin/leads/some-id");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("login page renders the Google button", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.getByTestId("google-signin")).toBeVisible();
});
```

- [ ] **Step 5: Build (placeholder inbox needed for the redirect test)**

The `(dash)/page.tsx` and detail page are created in Tasks 13–14. To make this task independently testable, create a minimal placeholder `src/app/admin/(dash)/page.tsx`:

```tsx
export default function AdminInboxPlaceholder() {
  return <p>Inbox</p>;
}
```

and a minimal `src/app/admin/(dash)/leads/[id]/page.tsx`:

```tsx
export default async function LeadDetailPlaceholder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <p>Lead {id}</p>;
}
```

Run: `npm run build`
Expected: build succeeds; `/admin` and `/admin/leads/[id]` listed as dynamic.

- [ ] **Step 6: Run e2e**

Run: `npm run test:e2e`
Expected: admin redirect tests pass (unauthenticated → `/admin/login`).

- [ ] **Step 7: Commit**

```bash
git add src/app/admin tests/e2e/admin.spec.ts src/components/admin/LogoutButton.tsx
git commit -m "feat: gated admin layout + logout + redirect tests"
```

---

## Task 13: Inbox page (list, type tabs, stage filter)

**Files:**
- Modify: `src/app/admin/(dash)/page.tsx` (replace the placeholder)
- Create: `src/lib/leadQueries.ts`

**Interfaces:**
- Consumes: `getDb`, `LeadType`, `PIPELINES`, `LEAD_TYPE_LABEL`, `stageLabel`.
- Produces:
  - `type LeadRow = { id: string; type: LeadType; name: string; phone: string; email: string | null; stage: string; role?: string; childAge?: string; createdAtMs: number | null }`
  - `listLeads(type: LeadType, stage?: string): Promise<LeadRow[]>`

- [ ] **Step 1: Write the query module**

`src/lib/leadQueries.ts`:

```ts
import "server-only";
import { getDb } from "@/lib/firebaseAdmin";
import type { LeadType } from "@/lib/leads";

export type LeadRow = {
  id: string;
  type: LeadType;
  name: string;
  phone: string;
  email: string | null;
  stage: string;
  role?: string;
  childAge?: string;
  createdAtMs: number | null;
};

export async function listLeads(type: LeadType, stage?: string): Promise<LeadRow[]> {
  let q = getDb().collection("leads").where("type", "==", type);
  if (stage) q = q.where("stage", "==", stage);
  const snap = await q.get();
  const rows: LeadRow[] = snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      type: x.type,
      name: x.name ?? x.parentName ?? "—",
      phone: x.phone ?? "—",
      email: x.email ?? null,
      stage: x.stage ?? "new",
      role: x.role,
      childAge: x.childAge,
      createdAtMs: x.createdAt?.toMillis?.() ?? null,
    };
  });
  // Sort newest first in memory (avoids needing a composite index for type+stage+createdAt).
  rows.sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
  return rows;
}
```

> **Note:** `name ?? parentName` bridges both lead shapes (student leads store `parentName`, staff store `name`).

- [ ] **Step 2: Write the inbox page**

`src/app/admin/(dash)/page.tsx`:

```tsx
import Link from "next/link";
import { listLeads } from "@/lib/leadQueries";
import { PIPELINES, LEAD_TYPE_LABEL, stageLabel, type LeadType } from "@/lib/leads";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

const TYPES: LeadType[] = ["admission_inquiry", "staff_application"];

function fmtDate(ms: number | null): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AdminInbox({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; stage?: string }>;
}) {
  const sp = await searchParams;
  const type: LeadType = TYPES.includes(sp.type as LeadType) ? (sp.type as LeadType) : "admission_inquiry";
  const stage = sp.stage && PIPELINES[type].includes(sp.stage) ? sp.stage : undefined;

  const leads = await listLeads(type, stage);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl text-emerald-deep">Leads</h1>
        <div className="flex gap-2">
          {TYPES.map((t) => (
            <Link
              key={t}
              href={`/admin?type=${t}`}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                t === type ? "bg-emerald text-cream" : "bg-white text-emerald-deep ring-1 ring-emerald/15 hover:bg-emerald/5"
              }`}
            >
              {LEAD_TYPE_LABEL[t]}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href={`/admin?type=${type}`}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            !stage ? "bg-gold text-ink" : "bg-white text-ink/70 ring-1 ring-emerald/10 hover:bg-emerald/5"
          }`}
        >
          All
        </Link>
        {PIPELINES[type].map((s) => (
          <Link
            key={s}
            href={`/admin?type=${type}&stage=${s}`}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              stage === s ? "bg-gold text-ink" : "bg-white text-ink/70 ring-1 ring-emerald/10 hover:bg-emerald/5"
            }`}
          >
            {stageLabel(s)}
          </Link>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl3 border border-emerald/10 bg-white/80 shadow-soft">
        {leads.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <Icon name="inbox" className="text-[36px] text-emerald/30" />
            <p className="text-ink/60">No leads here yet.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-emerald/10 text-xs uppercase tracking-wide text-ink/50">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">{type === "staff_application" ? "Role" : "Child age"}</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Stage</th>
                <th className="px-5 py-3">Received</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald/5">
              {leads.map((l) => (
                <tr key={l.id} className="hover:bg-emerald/5">
                  <td className="px-5 py-3 font-semibold text-emerald-deep">{l.name}</td>
                  <td className="px-5 py-3 text-ink/70">{type === "staff_application" ? l.role ?? "—" : l.childAge ?? "—"}</td>
                  <td className="px-5 py-3 text-ink/70">{l.phone}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-emerald/8 px-2.5 py-1 text-xs font-semibold text-emerald-deep">{stageLabel(l.stage)}</span>
                  </td>
                  <td className="px-5 py-3 text-ink/60">{fmtDate(l.createdAtMs)}</td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/admin/leads/${l.id}`} className="font-semibold text-emerald hover:text-emerald-deep">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds. (No new e2e — the page is gated; covered by manual test.)

- [ ] **Step 4: Run existing tests**

Run: `npm run test:unit && npm run test:e2e`
Expected: all pass (admin redirect tests still green — unauthenticated users never reach the table).

- [ ] **Step 5: Commit**

```bash
git add src/lib/leadQueries.ts "src/app/admin/(dash)/page.tsx"
git commit -m "feat: admin inbox with type tabs + stage filter"
```

---

## Task 14: Lead detail + stage/notes server actions + CV download

**Files:**
- Create: `src/app/admin/(dash)/leads/[id]/page.tsx` (replace the placeholder)
- Create: `src/app/admin/(dash)/leads/[id]/actions.ts`
- Create: `src/app/admin/(dash)/leads/[id]/cv/route.ts`
- Modify: `src/lib/leadQueries.ts` (add `getLead`)

**Interfaces:**
- Consumes: `requireAdmin`, `getDb`, `isValidStage`, `PIPELINES`, `stageLabel`, `getCvSignedUrl`, `LeadType`.
- Produces:
  - `getLead(id): Promise<LeadDetail | null>`
  - server actions `updateStage(formData)`, `addNote(formData)`.
  - `GET /admin/leads/[id]/cv` → redirect to a signed URL.

- [ ] **Step 1: Add getLead to leadQueries**

Append to `src/lib/leadQueries.ts`:

```ts
export type LeadNote = { text: string; author: string; atMs: number | null };

export type LeadDetail = {
  id: string;
  type: LeadType;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  stage: string;
  role?: string;
  childAge?: string;
  cv?: { filename: string } | null;
  notes: LeadNote[];
  createdAtMs: number | null;
};

export async function getLead(id: string): Promise<LeadDetail | null> {
  const doc = await getDb().collection("leads").doc(id).get();
  if (!doc.exists) return null;
  const x = doc.data()!;
  return {
    id: doc.id,
    type: x.type,
    name: x.name ?? x.parentName ?? "—",
    phone: x.phone ?? "—",
    email: x.email ?? null,
    message: x.message ?? null,
    stage: x.stage ?? "new",
    role: x.role,
    childAge: x.childAge,
    cv: x.cv ? { filename: x.cv.filename } : null,
    notes: (x.notes ?? []).map((n: { text: string; author: string; at?: { toMillis?: () => number } }) => ({
      text: n.text,
      author: n.author,
      atMs: n.at?.toMillis?.() ?? null,
    })),
    createdAtMs: x.createdAt?.toMillis?.() ?? null,
  };
}
```

- [ ] **Step 2: Write the server actions**

`src/app/admin/(dash)/leads/[id]/actions.ts`:

```ts
"use server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { isValidStage, type LeadType } from "@/lib/leads";

export async function updateStage(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const stage = String(formData.get("stage") ?? "");
  if (!id) throw new Error("Missing lead id");

  const ref = getDb().collection("leads").doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new Error("Lead not found");
  const type = doc.data()!.type as LeadType;
  if (!isValidStage(type, stage)) throw new Error("Invalid stage for this lead type");

  await ref.update({ stage, updatedAt: FieldValue.serverTimestamp() });
  console.log(`stage updated id=${id} stage=${stage} by=${admin.email}`);
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin");
}

export async function addNote(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  if (!id) throw new Error("Missing lead id");
  if (!text) return; // ignore empty notes

  const ref = getDb().collection("leads").doc(id);
  await ref.update({
    notes: FieldValue.arrayUnion({ text, author: admin.email, at: new Date() }),
    updatedAt: FieldValue.serverTimestamp(),
  });
  revalidatePath(`/admin/leads/${id}`);
}
```

> **Note:** `arrayUnion` with `new Date()` stores a real timestamp inside the array (server `FieldValue.serverTimestamp()` is not allowed inside array elements). `new Date()` is the server clock at write time — acceptable for a note timestamp.

- [ ] **Step 3: Write the CV download route**

`src/app/admin/(dash)/leads/[id]/cv/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { getCvSignedUrl } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.redirect(new URL("/admin/login", _req.url));
  }
  const { id } = await params;
  const doc = await getDb().collection("leads").doc(id).get();
  const cvPath = doc.exists ? doc.data()?.cv?.path : null;
  if (!cvPath) {
    return NextResponse.json({ ok: false, error: "No CV on file." }, { status: 404 });
  }
  const url = await getCvSignedUrl(cvPath);
  return NextResponse.redirect(url);
}
```

- [ ] **Step 4: Write the detail page**

`src/app/admin/(dash)/leads/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { getLead } from "@/lib/leadQueries";
import { PIPELINES, stageLabel, LEAD_TYPE_LABEL } from "@/lib/leads";
import { Icon } from "@/components/ui/Icon";
import { updateStage, addNote } from "./actions";

export const dynamic = "force-dynamic";

function fmt(ms: number | null): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/admin?type=${lead.type}`} className="inline-flex items-center gap-1 text-sm font-semibold text-emerald hover:text-emerald-deep">
        <Icon name="arrow_back" className="text-[18px]" /> Back to leads
      </Link>

      <div className="mt-4 rounded-xl3 border border-emerald/10 bg-white/80 p-8 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gold">{LEAD_TYPE_LABEL[lead.type]}</p>
            <h1 className="mt-1 text-2xl text-emerald-deep">{lead.name}</h1>
          </div>
          <span className="rounded-full bg-emerald/8 px-3 py-1.5 text-sm font-semibold text-emerald-deep">{stageLabel(lead.stage)}</span>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div><dt className="text-xs uppercase tracking-wide text-ink/50">Phone</dt><dd className="text-ink/80">{lead.phone}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-ink/50">Email</dt><dd className="text-ink/80">{lead.email ?? "—"}</dd></div>
          {lead.type === "staff_application"
            ? <div><dt className="text-xs uppercase tracking-wide text-ink/50">Role</dt><dd className="text-ink/80">{lead.role ?? "—"}</dd></div>
            : <div><dt className="text-xs uppercase tracking-wide text-ink/50">Child age</dt><dd className="text-ink/80">{lead.childAge ?? "—"}</dd></div>}
          <div><dt className="text-xs uppercase tracking-wide text-ink/50">Received</dt><dd className="text-ink/80">{fmt(lead.createdAtMs)}</dd></div>
        </dl>

        {lead.message && (
          <div className="mt-6">
            <p className="text-xs uppercase tracking-wide text-ink/50">Message</p>
            <p className="mt-1 whitespace-pre-wrap text-ink/80">{lead.message}</p>
          </div>
        )}

        {lead.type === "staff_application" && lead.cv && (
          <a href={`/admin/leads/${lead.id}/cv`} className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald/30 px-5 py-2.5 text-sm font-semibold text-emerald transition hover:bg-emerald/5">
            <Icon name="description" className="text-[18px]" /> Download CV ({lead.cv.filename})
          </a>
        )}
      </div>

      {/* Stage pipeline */}
      <div className="mt-6 rounded-xl3 border border-emerald/10 bg-white/80 p-8 shadow-soft">
        <h2 className="text-lg text-emerald-deep">Update stage</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {PIPELINES[lead.type].map((s) => (
            <form key={s} action={updateStage}>
              <input type="hidden" name="id" value={lead.id} />
              <input type="hidden" name="stage" value={s} />
              <button
                type="submit"
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  s === lead.stage ? "bg-emerald text-cream" : "bg-white text-emerald-deep ring-1 ring-emerald/15 hover:bg-emerald/5"
                }`}
              >
                {stageLabel(s)}
              </button>
            </form>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="mt-6 rounded-xl3 border border-emerald/10 bg-white/80 p-8 shadow-soft">
        <h2 className="text-lg text-emerald-deep">Internal notes</h2>
        <form action={addNote} className="mt-4 flex gap-3">
          <input type="hidden" name="id" value={lead.id} />
          <input name="text" placeholder="Add a note…" className="w-full rounded-xl border border-emerald/15 bg-cream/40 px-4 py-2.5 text-ink outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/20" />
          <button type="submit" className="shrink-0 rounded-full bg-emerald px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-emerald-deep">Add</button>
        </form>
        <ul className="mt-5 space-y-3">
          {lead.notes.length === 0 && <li className="text-sm text-ink/50">No notes yet.</li>}
          {lead.notes.map((n, i) => (
            <li key={i} className="rounded-xl bg-cream-deep/50 p-4">
              <p className="text-ink/80">{n.text}</p>
              <p className="mt-1 text-xs text-ink/50">{n.author} · {fmt(n.atMs)}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: build succeeds; `/admin/leads/[id]` and `/admin/leads/[id]/cv` listed.

- [ ] **Step 6: Run tests**

Run: `npm run test:unit && npm run test:e2e`
Expected: all pass (detail page is gated → unauthenticated still redirects).

- [ ] **Step 7: Commit**

```bash
git add "src/app/admin/(dash)/leads" src/lib/leadQueries.ts
git commit -m "feat: lead detail, stage pipeline, notes, CV download"
```

---

## Task 15: Env wiring + manual setup docs + final verification

**Files:**
- Modify: `apphosting.yaml`
- Modify: `.env.local` (NOT committed — local only)
- Create: `docs/admin-setup.md`

**Interfaces:**
- Produces: documented setup + the `ADMIN_EMAILS` secret wired for production.

- [ ] **Step 1: Add ADMIN_EMAILS to apphosting.yaml**

In `apphosting.yaml`, under `env`, add (as a secret — emails are not a public value):

```yaml
  - variable: ADMIN_EMAILS
    secret: ADMIN_EMAILS
    availability: [RUNTIME]
```

- [ ] **Step 2: Document local env (do not commit secrets)**

Tell Alman to add to `.env.local` (already gitignored):

```
ADMIN_EMAILS=alfitrah.sompura@gmail.com,almanmohd15@gmail.com
```

- [ ] **Step 3: Write the setup doc**

`docs/admin-setup.md`:

```markdown
# Admin / Leads — setup & manual test

## One-time Firebase console setup
1. **Auth → Sign-in method:** enable the **Google** provider.
2. **Auth → Settings → Authorized domains:** add
   `al-fitrah--al-fitrah.asia-east1.hosted.app` and `localhost`.
3. **Storage:** enable Cloud Storage (creates the default bucket
   `al-fitrah.firebasestorage.app`).

## Secrets
- Create the production allowlist secret:
  `firebase apphosting:secrets:set ADMIN_EMAILS`
  (value: comma-separated admin emails).
- Local: add `ADMIN_EMAILS=...` to `.env.local`.

## Deploy rules
- `firebase deploy --only firestore:rules,storage`

## Manual test (Google popup can't run in CI)
1. Visit `/admin` → redirected to `/admin/login`.
2. Sign in with an allowlisted Google account → reach the inbox.
3. Sign in with a NON-allowlisted account → blocked with a clear message.
4. Submit the Careers form with a PDF CV → appears under Staff applications.
5. Open the staff lead → change stage, add a note, download the CV.
6. Submit the site inquiry form → appears under Admission inquiries.
7. Sign out → `/admin` redirects to login again.
```

- [ ] **Step 4: Full verification**

Run: `npm run test:unit && npm run build && npm run test:e2e`
Expected: unit pass; build clean; e2e all green.

- [ ] **Step 5: Commit**

```bash
git add apphosting.yaml docs/admin-setup.md
git commit -m "chore: wire ADMIN_EMAILS + admin setup docs"
```

---

## Self-Review

**Spec coverage:**
- Auth (session cookies, allowlist, Google sign-in) → Tasks 9, 10, 11, 12. ✅
- Two lead types + pipelines → Task 2; used in 13, 14. ✅
- Careers form + server-side CV upload (upload-first, pre-generated ref, rollback) → Tasks 3, 5, 6, 7. ✅
- Inbox (type tabs, stage filter, counts/empty state) → Task 13. ✅
- Detail + stage + notes + CV signed-URL download → Task 14. ✅
- Deny-all Firestore (unchanged) + Storage rules → Task 8. ✅
- Security: allowlist re-check in `requireAdmin` (every page) + in each server action + in CV route. ✅
- Tests: unit (leads, application schema, allowlist, rate limit) + e2e (admin redirects, careers validation). ✅
- Env + manual setup → Task 15. ✅
- Deps flagged (firebase, vitest) → Task 1. ✅

**Placeholder scan:** No TBD/TODO; every code step has full code. The `(dash)/page.tsx` placeholder in Task 12 is intentional scaffolding, replaced in Task 13.

**Type consistency:** `LeadType`, `PIPELINES`, `isValidStage`, `stageLabel`, `LEAD_TYPE_LABEL` consistent across tasks. `LeadRow`/`LeadDetail` defined in `leadQueries.ts` before use. Lead field bridge (`name ?? parentName`) handles both shapes. Session cookie name/maxAge constants shared from `adminAuth.ts`.

**Known tradeoffs (acceptable for slice 1):**
- In-memory rate limit + sort-in-memory (no composite index) — fine at this traffic.
- Note timestamps use `new Date()` (server clock) because `serverTimestamp()` is disallowed inside array elements.
- Authed admin flows verified manually (Google popup is external to CI).
