# AWS + Cloudflare — migration prep

Status: **preparation done, migration not started.** The app still runs on
Firebase App Hosting. Everything below is either already in the repo, or the
ordered list of what remains.

---

## 1. Why this exists — the measured problem

Live measurements against `al-fitrah--al-fitrah.asia-east1.hosted.app`:

| Request | Cold | Warm |
|---|---|---|
| `/` (prerendered) | 802 ms TTFB | 151–167 ms |
| `/admin/login` (server-rendered) | **2,748 ms TTFB** | 177 ms |

Warm performance is fine. The complaint was cold starts — the instance scales to
zero, and the first visitor of the morning pays a full server boot.

Two contributing causes:

1. **Scale-to-zero.** `minInstances` was unset. Fixed in `apphosting.yaml`.
2. **Region split.** The App Hosting backend is in `asia-east1` (Taiwan);
   Firestore is in `asia-south1` (Mumbai). Every server-side read crosses ~5,000
   km. **Not fixed** — App Hosting region is fixed at backend creation, so
   correcting it means recreating the backend, which is throwaway work if the
   destination is AWS Mumbai anyway.

**The cost trade, stated plainly:** Firebase's ₹0/month depends on scale-to-zero.
`minInstances: 1` ends it — an always-on instance bills around the clock, roughly
₹900–1,500/month. That is the same order as Lightsail 2 GB in Mumbai (₹1,056),
which has no cold start *and* no region split. So the honest comparison is not
"free vs paid" but:

| Setup | Cost | Cold start | Region |
|---|---|---|---|
| Firebase, scale-to-zero | ₹0 | 2.7 s | Taiwan |
| Firebase, `minInstances: 1` | ~₹1,000/mo | none | Taiwan |
| Lightsail 2 GB, Mumbai | ₹1,056/mo | none | Mumbai |

---

## 2. Already done in the repo

| Change | File | Why it matters off Firebase |
|---|---|---|
| Warm instance | `apphosting.yaml` | Removes the 2.7 s cold start today |
| Rate limits moved to Firestore | `src/lib/rateLimit.ts` | Counters were per-process; any multi-instance or multi-process deployment made every limit N times looser, silently |
| `maxInstances` raised to 2 | `apphosting.yaml` | Only safe because of the line above |
| Cloudflare-aware client IP | `src/lib/clientIp.ts` | Behind a CDN the last `x-forwarded-for` entry is the edge, not the visitor |
| Standalone output | `next.config.ts` | Emits `.next/standalone` — the container-runnable server bundle |
| Container image | `Dockerfile`, `.dockerignore` | Runs on Lightsail / ECS / anything |
| Env contract | `.env.example` | Config was only recorded in `apphosting.yaml`, which does not travel |

Verified: `tsc --noEmit` clean, 276 unit tests pass, production build emits
`.next/standalone/server.js`.

---

## 3. Outstanding — do before or during cutover

### 3.1 Firestore TTL policy (do this now, independent of migration)

`rateLimits/{key}` documents carry `expiresAt`. Without a TTL policy nothing
breaks, the collection simply grows forever.

```bash
gcloud firestore fields ttls update expiresAt \
  --collection-group=rateLimits \
  --enable-ttl \
  --project=al-fitrah
```

### 3.2 Storage is still Firebase-specific

`src/lib/storage.ts` writes through the Firebase Storage bucket, and
`uploadPostImage` returns a hardcoded `firebasestorage.googleapis.com` URL. Two
consequences on AWS:

- Moving object storage to S3 means a new implementation behind the same four
  exported functions — `uploadCv`, `streamObject`, `deleteObject`,
  `uploadPostImage`. The call sites do not change.
- `img-src` in `next.config.ts` is pinned to `firebasestorage.googleapis.com`.
  It needs the S3/CloudFront host added, or images silently fail CSP.

Deliberately **not** abstracted ahead of time. One implementation behind an
interface that has one implementation is cost with no benefit; write the S3
version on the day the bucket exists.

### 3.3 Credentials

`getAdminApp()` falls back to Application Default Credentials, which exist
automatically on App Hosting and **not** on AWS. On AWS,
`FIREBASE_SERVICE_ACCOUNT_KEY` must be injected at runtime from Secrets Manager
or SSM Parameter Store — never baked into an image layer, never a file in the
repo.

---

## 4. Cloudflare

Order matters here, and step 3 is a security gate, not a formality.

1. **DNS.** Add `alfitrahsarjapura.in` to Cloudflare, move nameservers from
   GoDaddy. Proxy (orange cloud) on for `www` and the apex.
2. **SSL/TLS mode: Full (strict).** Anything less lets Cloudflare talk to the
   origin unencrypted or without verifying it.
3. **Lock the origin to Cloudflare.** Either Authenticated Origin Pulls, or a
   firewall rule allowing only Cloudflare's published IP ranges. Until this is
   done the origin is directly reachable.
4. **Only then** set `TRUST_CLOUDFLARE_IP=1`.

   ⚠️ Setting that flag while the origin is still directly reachable **removes
   rate limiting entirely**: `CF-Connecting-IP` becomes attacker-settable, and
   rotating it per request walks past every limit on sign-in, enquiry,
   application and capture. The flag defaults to `"0"` for exactly this reason.
   See the comment block in `src/lib/clientIp.ts`.
5. **Cache rules.** Bypass cache for `/admin/*`, `/portal/*` and `/api/*` — those
   are authenticated and per-user. Cache the prerendered marketing pages, which
   already ship a one-year `Cache-Control`.

   ⚠️ The payment webhook lives under `/api/*` and so is covered by that bypass,
   but it has a second requirement: it must **not** be rate-limited on client IP.
   The caller is the payment gateway, not a visitor, and every notification
   arrives from the same handful of addresses — an IP limit would start dropping
   payment confirmations under exactly the load where they matter. The route
   authenticates by signature instead.
6. **WAF.** Managed ruleset on. Rate-limiting rules at the edge are a useful
   second layer but do not replace the application limits — the edge cannot see
   which account a request is attacking.

Free plan covers all of the above. Pro (~₹1,760/mo) adds image optimisation and
custom WAF rules; not needed at 30 students.

---

## 5. AWS

Target: Lightsail 2 GB in `ap-south-1` (Mumbai), container from the `Dockerfile`.

1. Build with the public config as build args — `NEXT_PUBLIC_*` are inlined at
   build time and cannot be supplied later:

   ```bash
   docker build \
     --build-arg NEXT_PUBLIC_SITE_URL=https://www.alfitrahsarjapura.in \
     --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID=al-fitrah \
     ... \
     -t al-fitrah .
   ```

2. Runtime secrets (`ADMIN_EMAILS`, `RESEND_API_KEY`, `CRON_SECRET`,
   `FIREBASE_SERVICE_ACCOUNT_KEY`) from the secret store into the container
   environment.
3. Daily snapshots on. This is the backup — Firestore's point-in-time recovery
   covers the database, nothing covers the instance.
4. Replace the Cloud Scheduler job that hits `/api/cron/followups` with an
   EventBridge rule sending the same `x-cron-secret` header.
5. Health check on `/` before switching DNS.

**Firestore stays** in `asia-south1` and is then in the same region as the
compute — which is the latency fix, achieved as a side effect. Moving off
Firestore entirely is a separate project and is not in scope here.

---

## 6. Cutover and rollback

1. Deploy to AWS, reachable on its own hostname.
2. Verify against the real thing: admin sign-in, one attendance mark, one staff
   check-in **from the campus** (the geofence needs HTTPS — `getCurrentPosition`
   is refused on an insecure origin, so this cannot be tested over plain HTTP on
   the new hostname), one fee payment recorded, a CV download, a parent portal
   sign-in, and the cron endpoint returning 200 with the right header and 401
   without it.
3. Re-register the payment webhook URL in the gateway dashboard **before** DNS
   moves. It points at a hostname; if that changes and nobody updates it, online
   payments stop crediting silently — the parent pays, the gateway retries into
   a dead URL, and the ledger never hears about it.
4. Move DNS in Cloudflare with proxy on, TTL low.
5. Watch for one week with App Hosting still deployed and paid for.
6. Only then delete the App Hosting backend.

Rollback is a DNS change back to the App Hosting origin, which is why step 4
keeps the old backend alive rather than tearing it down on cutover day.
