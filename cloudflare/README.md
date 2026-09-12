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

Cache rules live in `src/index.js`, not in the Cloudflare dashboard, so the
policy is reviewable in git alongside the routes it protects.

`/admin/*`, `/portal/*` and `/api/*` are never cached — authenticated and
per-user. A cached admin page would serve one member of staff's view to the next
visitor. Everything else is prerendered marketing content and is cached for an
hour at the edge; error responses are cached briefly or not at all, so a bad
deploy cannot pin a 500 at the edge.
