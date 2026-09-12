# Cloudflare edge proxy

Terminates `www.alfitrahsarjapura.in` at Cloudflare and forwards to Cloud Run in
Mumbai, rewriting the Host header and attaching the edge token.

## Why this exists rather than a DNS record

Cloud Run in `asia-south1` **cannot serve a custom domain**. Domain mappings are
not offered there:

```
$ gcloud beta run domain-mappings create --domain=www.alfitrahsarjapura.in \
    --region=asia-south1 ...
ERROR: Creating domain mappings is not allowed in asia-south1.  (501)
```

A plain proxied CNAME does not work either: Cloudflare forwards the original
`Host`, Cloud Run routes on `Host`, and an unrecognised one gets a 404.

The supported alternatives both cost something real:

| Option | Cost | Trade |
|---|---|---|
| Global External LB + serverless NEG | ~₹1,500–2,000/mo | Several times the hosting budget |
| Move Cloud Run to `asia-southeast1` | ₹0 | Firestore goes from ~2 ms to ~55 ms — undoes most of the move |
| **This Worker** | ₹0 | One more moving part; 100k req/day free tier |

## Deploy

```bash
cd cloudflare
npx wrangler deploy

# The token the app checks. Piped, never pasted, so it stays out of shell history.
gcloud secrets versions access latest --secret=EDGE_TOKEN --project=al-fitrah \
  | npx wrangler secret put EDGE_TOKEN
```

Deploying before DNS moves is safe — a route with no proxied DNS record behind
it never fires.

## Cutover

1. Nameservers moved to Cloudflare, records **grey cloud**
2. SSL/TLS mode **Full (strict)**
3. `wrangler deploy` + `wrangler secret put EDGE_TOKEN`
4. Point `www` and the apex at anything (the Worker intercepts before the
   origin is reached) and switch them to **orange cloud**
5. Verify, then lower TTLs and let it settle

## Verify

```bash
# Through the edge — should be served by Cloud Run, not App Hosting.
curl -sI https://www.alfitrahsarjapura.in/ | grep -i 'x-nextjs\|server'

# A forged token straight at the origin must NOT be trusted. Seven rapid posts
# with a rotating fake CF-Connecting-IP should still trip the rate limit,
# because all seven key off the real address.
for i in $(seq 1 7); do
  curl -s -o /dev/null -X POST \
    https://al-fitrah-360754505866.asia-south1.run.app/api/inquiry \
    -H 'content-type: application/json' \
    -H "cf-connecting-ip: 9.9.9.$i" -H 'x-edge-token: wrong' \
    -d '{"invalid":"payload"}' -w '%{http_code}\n'
done
# Expect: 422 422 422 422 422 429 429
```

That last check is the one that matters. If every response is 422, the forged
header is being trusted and rate limiting is effectively off.

## Caching

Cache policy lives in `src/index.js`, not in the Cloudflare dashboard, so it is
reviewable in git alongside the routes it protects.

| | |
|---|---|
| `/admin/*`, `/portal/*`, `/api/*` | never cached |
| RSC navigations | never cached — see below |
| `/_next/static/*` | 1 year (content-hashed, immutable) |
| everything else | 1 hour, matching the app's own revalidation |
| any response setting a cookie | never cached, whatever the path |

### Why it uses the Cache API and not `cacheEverything`

The obvious implementation — `fetch(req, { cf: { cacheEverything: true } })` —
was tried and **cached nothing**. Every response came back
`cf-cache-status: MISS`, static assets included. Two reasons:

1. Next's App Router sends `Vary: rsc, next-router-state-tree,
   next-router-prefetch, …` on every response. Cloudflare only understands
   `Vary: Accept-Encoding`; anything else makes a response uncacheable to it.
2. The origin is `run.app`, outside this zone, where the `cf` fetch options are
   not dependable.

The Cache API sidesteps both: the Worker picks the key and stores a copy with
`Vary` normalised.

⚠️ **That `Vary` is not noise.** The same URL genuinely returns a different body
for an RSC navigation than for a full page load. Stripping the header and
caching one body under a key the other also matches would serve React payloads
to browsers asking for HTML. So RSC requests — identified by the `RSC` or
`Next-Router-Prefetch` header — bypass the cache entirely rather than sharing a
key. They are client-side navigations, already fast, and a small share of
traffic.
