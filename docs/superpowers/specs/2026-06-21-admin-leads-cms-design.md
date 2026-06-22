# Plan 3 (Slice 1): Admin Auth + Unified Leads Inbox — Design

**Date:** 2026-06-21
**Status:** Approved (design)
**Repo:** al-fitrah (Next.js 16 App Router + Firebase, App Hosting SSR)

## Goal

Give Al Fitrah staff a secure admin area to manage two kinds of leads:
**admission inquiries** (applied students, already captured by the live site
form) and **staff applications** (new — captured by a real Careers form with
CV upload). The inbox is a small CRM: list, filter, change pipeline stage,
add internal notes, and download CVs.

This is slice 1 of Plan 3. Content CMS (moving `src/content/*` into
Firestore), real-time listeners, and Resend email wiring are explicitly out
of scope.

## Why this approach

- **Firebase session cookies** for auth: httpOnly + Secure means the token
  never lives in client JS (XSS-safe). The session is verified server-side
  with the Admin SDK on every `/admin` request, and the email allowlist is
  re-checked every time — so removing an email locks that person out
  immediately, even with a still-valid cookie.
- **Server-side everything for leads**: leads are PII. The Firestore
  `leads` collection and the Storage CV files both stay **deny-all** to
  clients. Reads, writes, stage changes, notes, and CV signed-URLs all go
  through the Admin SDK in server code. The Firebase **web** SDK is used on
  the client for exactly one thing: the Google sign-in handshake that
  produces an ID token.
- **Server-side CV upload**: the public Careers form posts the file
  (multipart) to an API route that validates type + size and uploads via
  the Admin SDK. No unauthenticated client writes to Storage (abuse / cost
  risk).

## Architecture

### Collections & data model

Single `leads` collection. Discriminated by `type`.

Common fields (all leads):
- `type`: `"admission_inquiry" | "staff_application"`
- `parentName` / `name`: applicant or parent name (string)
- `phone`: string
- `email`: string | null
- `message`: string | null
- `stage`: string (see pipelines below)
- `source`: `"website"`
- `notes`: array of `{ text: string, author: string, at: Timestamp }` (default `[]`)
- `createdAt`: server timestamp
- `updatedAt`: server timestamp (set on every stage change / note add)

Type-specific:
- `admission_inquiry`: `childAge` (existing AGE_BANDS enum)
- `staff_application`: `role` (string), `cv: { path: string, filename: string, contentType: string, size: number } | null`

**Pipelines** (per type, defined in one shared module):
- `admission_inquiry`: `new → contacted → toured → enrolled → closed`
- `staff_application`: `new → reviewing → interview → hired → rejected`

A stage value is only valid for its type. Stage validation must check the
stage belongs to the lead's type.

### Storage layout

- CV files at `applications/{leadId}/{sanitizedFilename}` in the default
  Firebase Storage bucket.
- Accepted types: PDF, DOC, DOCX. Max size 5 MB.
- Files are never public. Admin downloads use a short-lived **signed URL**
  (15 min) minted on demand via `bucket.file(path).getSignedUrl(...)`.

### Routes & components

**Public:**
- `/careers` — existing page; replace the `mailto` Apply buttons with a
  Careers application form (client component) posting multipart to
  `/api/application`. Keeps existing page layout/sections.
- `POST /api/application` (Node runtime) — rate-limit, zod-validate fields,
  validate file (mime + size), upload CV to Storage **first**, then create
  the lead doc with the CV ref (see Error Handling for the ordering
  rationale).

**Auth:**
- `/admin/login` — client component. Firebase Web SDK Google sign-in
  (popup) → ID token → `POST /api/auth/session`. On success, redirect to
  `/admin`. Shows an error if the email is not allowlisted.
- `POST /api/auth/session` (Node) — verify ID token (Admin SDK), check
  email ∈ `ADMIN_EMAILS`, mint session cookie
  (`auth.createSessionCookie`, 5-day expiry), set httpOnly Secure
  SameSite=Lax cookie named `__session`.
- `DELETE /api/auth/session` — clear the cookie (logout).

**Admin (all server components, gated):**
- `/admin/layout.tsx` — calls `requireAdmin()`; redirects to `/admin/login`
  if not authed. Renders the admin shell (header with logout button).
- `/admin` (`page.tsx`) — fetch leads via Admin SDK. Type tabs (Students /
  Staff), stage filter, counts per stage, newest first. Each row links to
  detail.
- `/admin/leads/[id]` — detail view. Shows all fields, notes timeline, CV
  download link (staff). Two server actions:
  - `updateStage(id, stage)` — re-verify admin, validate stage for the
    lead's type, write `stage` + `updatedAt`, `revalidatePath`.
  - `addNote(id, text)` — re-verify admin, append to `notes[]` with author
    (admin email) + server time, set `updatedAt`, `revalidatePath`.
- CV download: route handler `GET /admin/leads/[id]/cv` that re-verifies
  admin, mints a signed URL, and redirects to it.

### Auth utility

`src/lib/adminAuth.ts`:
- `getAllowlist(): string[]` — parse `ADMIN_EMAILS` (comma-separated,
  trimmed, lowercased).
- `isAllowed(email): boolean`.
- `requireAdmin(): Promise<{ email: string }>` — read `__session` cookie,
  `auth.verifySessionCookie(cookie, true)`, check `isAllowed(email)`. On any
  failure throws / signals redirect. Used by the admin layout and re-used
  inside every server action and the CV route (defense in depth).

### Firebase client config

`src/lib/firebaseClient.ts` — initialize the Firebase **web** SDK from
`NEXT_PUBLIC_FIREBASE_*` env (apiKey, authDomain, projectId). Export the
Auth instance + a `signInWithGoogle()` helper. Client-only.

## Data flow

**Student inquiry (unchanged):** site form → `POST /api/inquiry` → Admin SDK
writes `leads` doc (`type: admission_inquiry`, `stage: new`).

**Staff application (new):** Careers form → multipart `POST /api/application`
→ validate → upload CV to Storage → write `leads` doc
(`type: staff_application`, `stage: new`, `cv` ref).

**Admin login:** Google popup → ID token → `/api/auth/session` verifies +
allowlist → session cookie set.

**Admin viewing/managing:** `/admin` server component verifies session →
Admin SDK query `leads` → render. Stage change / note add → server action
re-verifies → Admin SDK write → revalidate.

## Security

- `firestore.rules`: `leads` and all collections remain `allow read, write:
  if false`. (Admin SDK bypasses rules.)
- `storage.rules`: `allow read, write: if false` for everything. CVs served
  only via server-minted signed URLs.
- Session cookie: httpOnly, Secure, SameSite=Lax, 5-day expiry, name
  `__session` (App Hosting / Cloud Run forwards this; some platforms only
  forward `__session`).
- Allowlist re-checked on every admin request and inside every mutating
  server action.
- File upload: server-side mime + extension + size validation; filename
  sanitized; stored under a per-lead path.
- Rate limiting on `/api/application` (reuse the in-memory limiter from
  `/api/inquiry`; extract to a shared util).
- Honeypot field on the Careers form (same pattern as the inquiry form).
- CSRF: session endpoint takes the ID token in the POST body (not
  ambient-cookie auth), and Next server actions carry built-in origin
  checks. No additional CSRF token needed for slice 1.

## Error handling

- `/api/application`: validate before any write. Pre-generate the lead doc
  ref (`db.collection("leads").doc()`) to get the ID; upload the CV to
  `applications/{ref.id}/...` **first**; only on upload success do
  `ref.set(...)` with the CV ref. If the doc write fails after upload,
  delete the uploaded object. This avoids leads that promise a CV that does
  not exist, and avoids orphan files without a lead. Return clear 4xx for
  validation, 429 for rate limit, 500 with a "call us instead" fallback
  message.
- `requireAdmin` failure → redirect to `/admin/login` (pages) or throw
  (server actions / API → 401/403).
- CV signed-URL generation failure → show an inline error on the detail
  page, do not crash the page.
- Stage validation failure (stage not valid for type) → reject the server
  action with a clear message.

## Testing

**Unit:**
- Allowlist parsing (`ADMIN_EMAILS` → normalized list; empty / whitespace
  handling).
- `isAllowed` (case-insensitive match, non-member rejected).
- Stage validation (valid stage per type; cross-type stage rejected).
- File validation (accept PDF/DOC/DOCX ≤5 MB; reject wrong mime; reject
  oversized).

**E2E (Playwright):**
- `/admin` unauthenticated → redirects to `/admin/login`.
- `/admin/leads/<anyId>` unauthenticated → redirects to `/admin/login`.
- `/admin/login` renders (Google button visible).
- Careers form renders; submitting without required fields shows
  validation; oversized / wrong-type file rejected client-side.

**Manual (documented, external Google popup can't run in CI):**
- Allowlisted Google account → can sign in, see inbox, change stage, add
  note, download a CV.
- Non-allowlisted account → blocked with a clear message.

## New dependency

- `firebase` (web SDK) — client Google sign-in only. Official Firebase
  package, overlaps the existing Firebase stack. `firebase-admin` (already
  installed) covers Firestore + Storage server-side.

## Manual setup (Firebase console / config, done by Alman)

1. **Auth → Sign-in method:** enable **Google** provider.
2. **Auth → Settings → Authorized domains:** add the App Hosting domain
   (`al-fitrah--al-fitrah.asia-east1.hosted.app`) and `localhost`.
3. **Storage:** enable Cloud Storage (creates the default bucket).
4. **Env (`apphosting.yaml` + `.env.local`):**
   - `ADMIN_EMAILS` — comma-separated allowlist (runtime secret).
   - `FIREBASE_STORAGE_BUCKET` — default bucket name.
   - existing `NEXT_PUBLIC_FIREBASE_*` web config (apiKey, authDomain,
     projectId) for the client SDK.

## Out of scope (future plans)

- Content CMS: move `src/content/*` (home + pages) into Firestore with an
  editing UI.
- Real-time listeners on the inbox (would need an admin custom claim +
  relaxed read rule).
- Resend transactional email wiring (admin + applicant confirmations).
- Self-serve admin management (Firestore `admins` collection).
- CV virus scanning.
