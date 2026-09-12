# Container image for running this app outside Firebase App Hosting —
# AWS Lightsail, ECS, or any host that takes a container.
#
# Relies on `output: "standalone"` in next.config.ts, which emits a server
# bundle carrying only the node_modules it actually imports. The final image is
# a fraction of a full `npm ci` tree and contains no build toolchain.
#
# ⚠️ NEXT_PUBLIC_* values are inlined into the client bundle AT BUILD TIME, not
# read at runtime. They must be passed as --build-arg; setting them only in the
# task/container environment leaves the browser bundle holding empty strings.
# Secrets (ADMIN_EMAILS, RESEND_API_KEY, CRON_SECRET, credentials) are the
# opposite — runtime only, never build args, or they end up in image layers.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_COMING_SOON="0"
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_GA_ID
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0

# Run as a non-root user: a process that never needs to write to its own image
# should not be able to.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
