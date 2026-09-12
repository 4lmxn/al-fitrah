# Cloud Run (Mumbai) + Cloudflare — deployment runbook

Status: **planned, not started.** The app still runs on Firebase App Hosting in
`asia-east1` (Taiwan).

Supersedes the earlier AWS/Lightsail version of this document. Why that plan was
dropped is in §2 — read it before re-proposing AWS, because the reasoning that
put it there was circular.

---

## 1. The measured problem

Live measurements against `al-fitrah--al-fitrah.asia-east1.hosted.app`:

| Request | Cold | Warm |
|---|---|---|
| `/` (prerendered) | 802 ms TTFB | 151–167 ms |
| `/admin/login` (server-rendered) | **2,748 ms TTFB** | 177 ms |

Two separate causes, often confused:

1. **Scale-to-zero.** `minInstances` was unset, so the first visitor of the
   morning paid a full server boot.
2. **Region split.** Compute is in `asia-east1` (Taiwan); Firestore is in
   `asia-south1` (Mumbai). Every server-side read crosses ~5,000 km — roughly
   100–120 ms RTT, paid on every wave of queries, warm or cold.

Cause 2 is the one that matters, and it is invisible in the "warm" column above
because that row is a prerendered page that reads nothing. The admin console —
attendance, fees, the leads pipeline, the actual product — pays it all day.

The pages are already parallelised (`Promise.all` throughout; `feeStatus.ts`
makes no Firestore calls at all), so there is no waterfall left to optimise.
The remaining latency is distance. The fix is to move the compute, not the code.

---

## 2. Why Cloud Run and not AWS

The earlier revision of this document chose AWS Lightsail in Mumbai. Its stated
reason for not simply fixing the region on Google was:

> App Hosting region is fixed at backend creation, so correcting it means
> recreating the backend, which is throwaway work **if the destination is AWS
> Mumbai anyway**.

That assumes its own conclusion. Nobody ever established why AWS.

Two facts settle it, both verified against this project on 2026-09-12:

**Firebase App Hosting does not support Mumbai.** From
`GET firebaseapphosting.googleapis.com/v1/projects/al-fitrah/locations`, the
complete list is six regions:

| Region | Location |
|---|---|
| `asia-east1` | Taiwan ← current |
| `asia-southeast1` | Singapore |
| `europe-west4` | Netherlands |
| `us-central1` | Iowa |
| `us-east4` | N. Virginia |
| `us-east5` | Columbus |

**Cloud Run does.** `gcloud run regions list` includes `asia-south1` and
`asia-south2`. Firestore is confirmed `asia-south1`.

App Hosting *is* Cloud Run underneath, so deploying the existing container
straight to Cloud Run in Mumbai is the same runtime in the right region.

### What AWS would have cost beyond money

- **A long-lived private key.** Off Google, `FIREBASE_SERVICE_ACCOUNT_KEY` must
  be injected at runtime and rotated by hand. On Cloud Run, Application Default
  Credentials work natively and **that key never has to exist**. This system
  holds children's medical records; introducing a permanent credential nobody
  will remember to rotate is a real downgrade, not a footnote.
- **Sysadmin duty.** A Lightsail VM is yours to patch, monitor, back up and
  resize. Cloud Run has none of that, plus revision rollback.
- **Incoherence.** Moving compute to AWS while Firestore stays on GCP buys the
  complexity of multi-cloud and none of the independence — Google still holds
  all the data. If leaving Google is the goal, the database has to move too, and
  that is a separate, much larger project (≈6 days, and gated on TRAI DLT
  registration for parent phone OTP, which is calendar time no effort shortens).

Pick one lane. This document is the Google lane, chosen for speed and cost.

---

## 3. Already done in the repo

| Change | File | Still needed on Cloud Run? |
|---|---|---|
| Standalone output | `next.config.ts` | **Yes** — emits the server bundle the image runs |
| Container image | `Dockerfile`, `.dockerignore` | **Yes** — deployed as-is |
| Rate limits in Firestore | `src/lib/rateLimit.ts` | **Yes** — counters must be shared once more than one instance can exist |
| Cloudflare-aware client IP | `src/lib/clientIp.ts` | **Yes** — see §6 |
| Env contract | `.env.example` | **Yes** |
| Warm instance | `apphosting.yaml` | No — `apphosting.yaml` stops being read once off App Hosting |

Verified 2026-09-12: `tsc --noEmit` clean, **304** unit tests pass across 35
files, production build clean and emitting `.next/standalone/server.js`. Every
public route builds as `○` static or `●` SSG on a 1h revalidate — only
`/admin/*`, `/portal/*` and `/api/*` are `ƒ` dynamic, which is correct.

⚠️ Still unverified: `docker build` has not been run against this Dockerfile.
Do that before provisioning anything.

---

## 4. The shape

```
Cloudflare (free)  →  Cloud Run asia-south1  →  Firestore asia-south1
   edge cache             your container            same region
   public pages           admin + portal + api       ~2 ms
```

Plus a Cloud Scheduler ping that keeps the instance warm during school hours
only — see §7. That is what buys zero cold start at zero cost.

---

## 5. Deploy to Cloud Run

`NEXT_PUBLIC_*` are inlined into the browser bundle **at build time**. Secrets
are runtime-only and must never reach a build layer. The Dockerfile already
separates the two; keep it that way.

**1. Build and push.**

⚠️ **`--platform linux/amd64` is not optional on an Apple Silicon Mac.** The
default build produces `linux/arm64`, which pushes and deploys without
complaint and then fails to start on Cloud Run. Verify before pushing:

```bash
docker image inspect <tag> --format '{{.Os}}/{{.Architecture}}'
```

```bash
gcloud auth configure-docker asia-south1-docker.pkg.dev
gcloud artifacts repositories create al-fitrah \
  --repository-format=docker --location=asia-south1 --project=al-fitrah

docker build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_SITE_URL=https://www.alfitrahsarjapura.in \
  --build-arg NEXT_PUBLIC_COMING_SOON=0 \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID=al-fitrah \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY=... \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=... \
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=... \
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=... \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID=... \
  -t asia-south1-docker.pkg.dev/al-fitrah/al-fitrah/web:v1 .

docker push asia-south1-docker.pkg.dev/al-fitrah/al-fitrah/web:v1
```

**2. Service account — the point of staying on Google.**

A dedicated identity with only what the app needs. No key is created, ever.

⚠️ This project's IAM policy contains conditional bindings, so every
`add-iam-policy-binding` needs an explicit `--condition=None` or it fails in
non-interactive mode.

```bash
SA=al-fitrah-run@al-fitrah.iam.gserviceaccount.com

gcloud iam service-accounts create al-fitrah-run \
  --display-name="Al Fitrah Cloud Run runtime" --project=al-fitrah

# Project-wide: Firestore documents and Auth only.
for ROLE in roles/datastore.user roles/firebaseauth.admin; do
  gcloud projects add-iam-policy-binding al-fitrah \
    --member="serviceAccount:$SA" --role="$ROLE" --condition=None
done

# Storage is granted on the ONE bucket, not project-wide.
gcloud storage buckets add-iam-policy-binding gs://al-fitrah-files \
  --member="serviceAccount:$SA" --role=roles/storage.objectAdmin
```

`roles/datastore.user` is read/write on Firestore documents but **not** schema,
indexes or deletion of the database. Do not substitute `roles/datastore.owner`.
Storage is deliberately bucket-scoped rather than `roles/storage.objectAdmin` at
project level — the runtime has no reason to reach any other bucket.

**3. Secrets in Secret Manager**, not env literals.

`ADMIN_EMAILS`, `RESEND_API_KEY` and `CRON_SECRET` already exist in Secret
Manager from the App Hosting setup — they only need the new identity granted
access, not recreating:

```bash
for S in ADMIN_EMAILS RESEND_API_KEY CRON_SECRET; do
  gcloud secrets add-iam-policy-binding "$S" \
    --member="serviceAccount:$SA" \
    --role=roles/secretmanager.secretAccessor --project=al-fitrah
done
```

`INQUIRY_FROM_EMAIL` and `INQUIRY_ADMIN_EMAIL` are plain values, not secrets,
and stay as `--set-env-vars`.

⚠️ **`ADMIN_OWNERS` does not exist yet** — it is still commented out in
`apphosting.yaml`. Until it is set, `roleFor()` returns `owner` for every
allowed address, so the owner/staff split does nothing and any signed-in
account can delete. That default is deliberate (it stops the deploy that
introduced roles from locking the school out), but it was meant to be
temporary. Create it and wire it in as a separate, deliberate change.

⚠️ **`INQUIRY_FROM_EMAIL` is `onboarding@resend.dev`** — Resend's shared
sandbox sender. Enquiry mail is going out from a domain the school does not
own, which hurts deliverability and may restrict delivery to verified
addresses. Verify the school's own domain in Resend before launch.

**4. Deploy.**

```bash
gcloud run deploy al-fitrah \
  --image=asia-south1-docker.pkg.dev/al-fitrah/al-fitrah/web:v1 \
  --region=asia-south1 \
  --service-account=al-fitrah-run@al-fitrah.iam.gserviceaccount.com \
  --min-instances=0 \
  --max-instances=2 \
  --memory=1Gi \
  --cpu=1 \
  --port=3000 \
  --allow-unauthenticated \
  --set-env-vars=NEXT_PUBLIC_SITE_URL=https://www.alfitrahsarjapura.in,FIREBASE_PROJECT_ID=al-fitrah,INQUIRY_FROM_EMAIL=onboarding@resend.dev,INQUIRY_ADMIN_EMAIL=alfitrah.sompura@gmail.com \
  --set-secrets=ADMIN_EMAILS=ADMIN_EMAILS:latest,ADMIN_OWNERS=ADMIN_OWNERS:latest,RESEND_API_KEY=RESEND_API_KEY:latest,CRON_SECRET=CRON_SECRET:latest,EDGE_TOKEN=EDGE_TOKEN:latest \
  --project=al-fitrah
```

`EDGE_TOKEN` can be wired in from the first deploy. It is inert until Cloudflare
actually sends the header — see §6.

`--min-instances=0` is deliberate and is what keeps the bill at zero — §7
handles warmth instead. `--max-instances=2` is safe because rate-limit counters
live in Firestore; **do not raise it if that ever changes.**

No `FIREBASE_SERVICE_ACCOUNT_KEY`. `getAdminApp()` falls through to Application
Default Credentials, which resolve to the service account above.

---

## 6. Cloudflare

### 6.0 The origin lock, and why it is a token

An earlier revision of this document said: lock the origin so it cannot be
reached except through Cloudflare, then trust `CF-Connecting-IP`. That advice
was written without pricing it.

On Cloud Run, a network-level origin lock means a **Global External Load
Balancer with Cloud Armor** allowing only Cloudflare's published ranges. That is
roughly **₹1,500–2,000/month** — several times this project's entire hosting
budget, and more than the App Hosting bill the move was meant to avoid. Cloud
Run's own `ingress` settings do not help: they understand `internal` and
`internal-and-cloud-load-balancing`, and Cloudflare is neither.

So trust is **proved per request** instead of assumed per deployment.
Cloudflare attaches a shared secret to everything it forwards; a request
carrying it demonstrably came through our zone. One arriving straight at the
`run.app` hostname cannot produce it, so its `CF-Connecting-IP` is ignored.

This closes both failure modes of the old boolean at once, and — the part that
matters operationally — **there is no window during cutover where some setting
is temporarily wrong.** Before Cloudflare exists, `EDGE_TOKEN` is unset and
nothing trusts the header. After, only edge traffic does.

⚠️ Be clear about what this is not. It is an application-layer check: the
request still reaches the app and costs an invocation before being judged. That
is fine at this scale. It is **not** a network-level lock, and if the origin
ever needs to be genuinely unreachable, that is the load balancer and it costs
money. Logic and tests: `src/lib/clientIp.ts`, `tests/unit/clientIp.test.ts`.

### 6.1 Setup

1. **DNS.** Add `alfitrahsarjapura.in` to Cloudflare, move nameservers from
   GoDaddy. Leave records **DNS-only (grey cloud)** for now.

2. **Deploy the edge Worker.** ⚠️ Cloud Run in `asia-south1` **cannot serve a
   custom domain** — domain mappings are not offered in that region:

   ```
   ERROR: Creating domain mappings is not allowed in asia-south1.  (501)
   ```

   Nor does a plain proxied CNAME work: Cloudflare forwards the original `Host`,
   Cloud Run routes on `Host`, and an unrecognised one 404s. The paid way out is
   a Global External Load Balancer (~₹1,500–2,000/month); the free way is a
   Worker that rewrites the Host and carries the token.

   ```bash
   cd cloudflare && npx wrangler deploy
   gcloud secrets versions access latest --secret=EDGE_TOKEN --project=al-fitrah \
     | npx wrangler secret put EDGE_TOKEN
   ```

   Safe to deploy before DNS moves: a route with no proxied record behind it
   never fires. Source and cache policy: `cloudflare/`.

3. **SSL/TLS mode: Full (strict).** Anything less lets Cloudflare reach the
   origin unencrypted or without verifying its certificate.

4. **Turn the proxy on (orange cloud)** for `www` and the apex. The Worker
   intercepts before any origin is reached, so the records' targets barely
   matter — but keep them pointing somewhere real so a Worker failure degrades
   to an error rather than a DNS hole.

5. **Cache policy lives in the Worker**, not in dashboard rules, so it is
   reviewable in git next to the routes it protects. `/admin/*`, `/portal/*` and
   `/api/*` are never cached — a cached admin page would serve one member of
   staff's session-rendered view to the next visitor. Everything else is
   prerendered marketing content, cached an hour at the edge, with error
   responses cached briefly or not at all so a bad deploy cannot pin a 500.

6. **Verify both directions** before trusting anything:

   ```bash
   # Through the edge: should now be served by Cloud Run, not App Hosting.
   curl -sI https://www.alfitrahsarjapura.in/ | grep -i 'x-nextjs\|server'

   # Straight at the origin with a forged token and a rotating fake address:
   # every request must still key off the REAL address, so the limit trips.
   for i in $(seq 1 7); do
     curl -s -o /dev/null -X POST \
       https://al-fitrah-360754505866.asia-south1.run.app/api/inquiry \
       -H 'content-type: application/json' \
       -H "cf-connecting-ip: 9.9.9.$i" -H 'x-edge-token: wrong' \
       -d '{"invalid":"payload"}' -w '%{http_code}\n'
   done
   # Expect: 422 422 422 422 422 429 429
   ```

   That second check is the one that matters, and it has already been run
   against the live service — see the note below. If every response is 422, the
   forged header is being trusted and rate limiting is effectively off.

   > **Verified 2026-09-12** on revision `al-fitrah-00003-84t`: seven POSTs, each
   > with a different forged `cf-connecting-ip` and a wrong token, returned
   > `422 422 422 422 422 429 429`. The forged addresses were ignored and all
   > seven keyed off the real one. This is precisely the attack the old
   > `TRUST_CLOUDFLARE_IP=1` would have allowed.

   ⚠️ `/api/cron/followups` is covered by that bypass and must also **not** be
   rate-limited on client IP. The caller is a scheduler, not a visitor, and every
   invocation arrives from the same handful of addresses. It authenticates by
   shared secret (`x-cron-secret`, constant-time compared) instead.

   > **Correction, 2026-09-12.** Earlier revisions described a *payment webhook*
   > under `/api/*` with signature auth and gave cutover steps for re-registering
   > its URL. **No such route exists.** `src/app/api/` contains exactly six
   > routes — `application`, `auth/session`, `auth/parent-session`, `capture`,
   > `cron/followups`, `inquiry` — and there is no Razorpay, PhonePe or any
   > gateway anywhere in `src/`. Fees are recorded by hand by staff
   > (`recordedBy`, `method` = cash / UPI reference / cheque number).

6. **WAF.** Managed ruleset on. Edge rate-limiting rules are a useful second
   layer but do not replace the application limits — the edge cannot see which
   account a request is attacking.

Free plan covers all of the above.

---

## 7. Scheduler — the cron, and the warm-up

Two jobs. Cloud Scheduler's free tier is three.

**The existing daily digest**, moved off whatever triggers it today:

```bash
gcloud scheduler jobs create http followups \
  --location=asia-south1 --schedule="30 3 * * *" --time-zone="Asia/Kolkata" \
  --uri="https://www.alfitrahsarjapura.in/api/cron/followups" \
  --http-method=GET \
  --update-headers="x-cron-secret=<CRON_SECRET>" \
  --project=al-fitrah
```

**The warm-up.** This is what makes `--min-instances=0` acceptable: a request
every five minutes during school hours keeps the instance alive, so staff never
meet a cold start. Outside those hours it scales to zero and costs nothing.

```bash
gcloud scheduler jobs create http warmup \
  --location=asia-south1 --schedule="*/5 1-11 * * 1-6" --time-zone="UTC" \
  --uri="https://www.alfitrahsarjapura.in/admin/login" \
  --http-method=GET \
  --project=al-fitrah
```

`1-11 UTC` is 06:30–16:30 IST, Monday–Saturday. `/admin/login` is prerendered
and reads nothing, so a ping costs no Firestore reads — it only keeps the
container resident. ~2,600 requests/month against a 2M free allowance.

⚠️ Point the warm-up at the origin, not through Cloudflare, or the edge will
serve it from cache and the origin will go to sleep anyway.

---

## 8. Cutover and rollback

1. Deploy to Cloud Run, reachable on its own `run.app` hostname.
2. Verify against the real thing: admin sign-in; one attendance mark; one staff
   check-in **from the campus** (the geofence needs HTTPS — `getCurrentPosition`
   is refused on an insecure origin); one fee payment recorded with the right
   receipt number; a CV download; a parent portal sign-in; and the cron endpoint
   returning 200 with the right header and 401 without it.
3. Confirm the scheduler jobs fire against the new hostname. This is the only
   external caller the app has.
4. Move DNS in Cloudflare with proxy on, TTL low. The domain mapping and the
   `x-edge-token` Transform Rule must already be in place — §6.1. Unlike the old
   boolean, nothing here is dangerous if done out of order: an unset or unsent
   token just means `CF-Connecting-IP` is ignored, which is the safe direction.
5. Watch for one week with the App Hosting backend still deployed and paid for.
6. Only then delete it.

Rollback is a DNS change back to the App Hosting origin, which is why step 5
keeps it alive rather than tearing it down on cutover day. Cloud Run revisions
also roll back individually:
`gcloud run services update-traffic al-fitrah --to-revisions=<previous>=100`.

---

## 9. Outstanding

**Firestore TTL policies — done 2026-09-13.** Three collections write an
`expiresAt` and, without a policy, none of them were ever being cleaned up:
`rateLimits` (one document per limited request), `auditLog` (`RETENTION_DAYS`
= 730 in `src/lib/audit.ts`) and `notifications` (90 days in
`src/lib/notify/adapters.ts`). All three now carry an ACTIVE policy:

```bash
for C in rateLimits auditLog notifications; do
  gcloud firestore fields ttls update expiresAt \
    --collection-group="$C" --enable-ttl --project=al-fitrah
done

gcloud firestore fields ttls list --project=al-fitrah   # three rows, ACTIVE
```

Worth knowing for a future move: this is enforced by the database, so nothing
can silently stop. Postgres has no equivalent and would need `pg_cron` plus an
alert on the job — a cron that dies is invisible until the table is enormous.

**Post images have no CDN.** `uploadPostImage` returns a raw
`firebasestorage.googleapis.com/...?alt=media` URL, rendered by plain `<img>` on
the public news pages. No caching, no resizing — a parent on 4G pulls the full
upload, up to 4 MB. Moving that prefix to R2 behind Cloudflare is about half a
day and the only real storage weakness. `uploadCv` and `streamObject` should
**not** move: they are streamed through an authenticated route, the CDN never
sees them, and signed URLs are deliberately avoided (see the comment in
`src/lib/storage.ts`).

⚠️ If that move happens, change `img-src` in `next.config.ts` **in the same
commit**, or every post image fails CSP silently.

### ⚠️ The Storage bucket is in the USA

Verified 2026-09-12:

```
$ gcloud storage buckets describe gs://al-fitrah.firebasestorage.app \
    --format="value(name,location,locationType)"
al-fitrah.firebasestorage.app   US-EAST1   region
```

So the system is currently spread across three continents:

| Component | Region | |
|---|---|---|
| Compute | `asia-east1` | Taiwan |
| Firestore | `asia-south1` | Mumbai |
| **Storage** | **`us-east1`** | **South Carolina, USA** |

This is a bigger split than the Firestore one this document exists to fix.
Mumbai↔US-East is roughly 200–250 ms RTT, and it is paid on **every** CV upload
from the public careers form, every CV download in the admin console, and every
file in the planned parent-portal documents feature. Moving compute to Mumbai
does not improve it — it slightly worsens it, since Taiwan is marginally closer
to US-East than Mumbai is.

**It is also a data-residency question.** The bucket already holds job
applicants' CVs, and the portal plan puts children's documents in it. For an
Indian school holding minors' records under the DPDP Act, "where does this file
physically live" is a question with a wrong answer, and `us-east1` is it.

**Buckets cannot be moved.** The fix is a new bucket and a copy:

```bash
gcloud storage buckets create gs://al-fitrah-files \
  --location=asia-south1 --uniform-bucket-level-access --project=al-fitrah

gcloud storage rsync -r \
  gs://al-fitrah.firebasestorage.app gs://al-fitrah-files
```

Then point `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` at the new bucket. `getBucket()`
in `src/lib/firebaseAdmin.ts` reads that env var, and no client code touches
Storage (`firebaseClient.ts` is auth-only), so this is an env change plus a data
copy — no code change. Keep the old bucket read-only for a month, then delete.

⚠️ Do this **before** building the portal documents feature. Copying a handful
of CVs is trivial; copying every family's documents later is not.

### Post images: nothing to migrate yet

The bucket currently contains one prefix — `applications/` (CVs). **No post
images exist**, because no news/events with images have been published. So the
"raw GCS URL with no CDN" weakness above is real but not yet load-bearing.

Defer the R2 move. When the school starts publishing news with images, revisit —
by then the bucket will already be in Mumbai, which removes most of the sting.

---

## 10. What this costs

The project is on the **Blaze (pay-as-you-go)** plan. That is required — Cloud
Run, Secret Manager, Artifact Registry and Cloud Scheduler are all unavailable
on Spark — and the free allowances below still apply on Blaze. What Blaze
removes is the *hard stop*: on Spark a runaway loop fails, on Blaze it bills.
So §10.1 is not optional.

Note: a **Google One AI Pro** subscription on the account grants no GCP credits
and does not reduce any line below. It is a consumer AI subscription (Gemini,
NotebookLM, Drive storage), unrelated to Cloud billing.

Everything below sits inside a free tier at this scale — 3 staff, ~30 families,
and a marketing site served from Cloudflare's edge.

| Service | Free allowance | Expected usage | Cost |
|---|---|---|---|
| **Cloud Run** | 2M requests, 180K vCPU-s, 360K GiB-s / month | ~13K requests incl. warm-up | **₹0** |
| **Firestore** | 50K reads, 20K writes, 1 GB / **day** | Public pages are ISR → 0 reads. Admin ≈ 33/page load | **₹0** |
| **Firebase Auth** | 50K monthly active users | ~33 | **₹0** |
| **Firebase Storage** | 5 GB stored, 1 GB/day egress | CVs + a few images | **₹0** |
| **Cloud Scheduler** | 3 jobs | 2 | **₹0** |
| **Secret Manager** | 6 active versions, 10K accesses/month | 6 secrets | **₹0** |
| **Cloudflare** | DNS, CDN, SSL, managed WAF | all of it | **₹0** |
| **Resend** | 3,000 emails/month | ~100 | **₹0** |
| **Artifact Registry** | 0.5 GB | ~1 image, prune old tags | **₹0** |
| Cloud Run egress | — | ~1–2 GB/month to Cloudflare | **~₹15** |
| **Parent phone OTP (SMS)** | **none — billed per message** | see below | **₹0–150** |

**Realistic total: ₹0–200/month.** Well inside a ₹500 budget, with the whole
budget still free for `--min-instances=1` later (~₹1,200–1,700/month, so it does
*not* fit — that is a budget increase, not a tweak).

### The only variable line, and the only one that can spike

**SMS.** Firebase bills every phone-verification message with no free
allowance, and India is not a cheap band. This is why `src/lib/parentAuth.ts`
makes **email-link the default** and phone the fallback — email sign-in falls
under the 50K MAU tier and costs nothing.

At ~30 families signing in occasionally, and most on email, expect tens of
rupees. The risk is not normal use: it is a public form that sends SMS. The
invisible reCAPTCHA on `sendParentOtp` plus the Firestore-backed limits in
`src/lib/rateLimit.ts` are what stand between that form and an unbounded bill.
**Do not weaken either**, and set a billing alert.

### 10.1 Budget alert — do this today, before anything else here

On Blaze there is no ceiling. Free tiers protect against normal growth, not
against a loop, a scraped form, or an abused endpoint.

```bash
gcloud billing budgets create \
  --billing-account=$(gcloud billing projects describe al-fitrah \
      --format="value(billingAccountName)" | cut -d/ -f2) \
  --display-name="Al Fitrah monthly" \
  --budget-amount=500INR \
  --threshold-rule=percent=0.5 \
  --threshold-rule=percent=0.9 \
  --threshold-rule=percent=1.0
```

A budget alert notifies; it does not cap. For a real cap you need a Pub/Sub
topic on the budget wired to a function that disables billing — worth doing
once the school is dependent on this, overkill today.

### Watch items

- **Firestore reads** are the first thing that would leave the free tier if
  admin usage grows — the inbox costs ~33 reads per load. Still flat in
  collection size, so it scales with staff activity, not with student count.
- **Storage egress** is currently transatlantic (§9). Cross-region egress is
  billed at a higher rate than same-region, so moving the bucket to Mumbai cuts
  a cost line as well as a latency one.
