import type { NextConfig } from "next";

// Content-Security-Policy.
//
// `script-src` carries 'unsafe-inline' deliberately, and it is worth being
// honest about why. The strict alternative is a per-request nonce, which in
// Next requires generating it in the proxy — and a proxy-set nonce forces every
// page to render dynamically. That would turn a dozen prerendered marketing
// pages into per-visitor server renders, which is precisely the cost pattern
// the rest of this work removed. Hash-based CSP doesn't fit either: the JSON-LD
// block differs per page, so the hash set changes with every content edit.
//
// What remains is still worth having. An attacker who achieves injection cannot
// load a script from a host that isn't listed, exfiltrate to one via fetch or
// WebSocket, embed a plugin, rewrite <base> to hijack every relative URL, or
// post a form to their own endpoint. That is the bulk of what injection is
// used FOR, even though injection itself stays possible.
//
// ponytail: revisit if these pages ever become dynamic for another reason —
// the nonce is then free.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://www.googletagmanager.com https://*.google-analytics.com",
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
  // The map embed is the only third party allowed to frame content in.
  "frame-src https://www.google.com https://maps.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  // The admin console mutates via plain form posts — never allow framing.
  // X-Frame-Options is redundant next to frame-ancestors but costs nothing and
  // covers browsers that honour only the older header.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Camera and microphone stay fully denied. Geolocation is allowed for our own
  // origin only (`self`), because staff check-in captures a position at the
  // moment of marking — no third-party frame can ask on our behalf, and
  // `geolocation=()` would have denied it to us as well.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()" },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Emit .next/standalone: a self-contained server bundle with only the
  // node_modules it actually imports. Firebase App Hosting does not need this,
  // but it is what makes the app runnable in a container on Lightsail, ECS or
  // anywhere else, and it costs nothing to emit while still on App Hosting.
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
