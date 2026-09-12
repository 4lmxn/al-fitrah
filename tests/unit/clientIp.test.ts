import { describe, it, expect, afterEach } from "vitest";
import { getClientIp, isFromEdge } from "@/lib/clientIp";

// The whole point of this module is that a spoofed CF-Connecting-IP must not
// become a rate-limit key, and that behind Cloudflare a real one must. Both
// halves are security-relevant: getting the first wrong removes rate limiting,
// getting the second wrong collapses every visitor onto one counter.

const TOKEN = "s3cret-edge-token";

function req(headers: Record<string, string>): Request {
  return new Request("https://example.test/api/inquiry", { headers });
}

afterEach(() => {
  delete process.env.EDGE_TOKEN;
});

describe("isFromEdge", () => {
  it("is false when no token is configured, however convincing the request", () => {
    expect(isFromEdge(req({ "x-edge-token": TOKEN, "cf-connecting-ip": "1.2.3.4" }))).toBe(false);
  });

  it("is false when the request carries no token", () => {
    process.env.EDGE_TOKEN = TOKEN;
    expect(isFromEdge(req({ "cf-connecting-ip": "1.2.3.4" }))).toBe(false);
  });

  it("is false when the token is wrong", () => {
    process.env.EDGE_TOKEN = TOKEN;
    expect(isFromEdge(req({ "x-edge-token": "wrong" }))).toBe(false);
  });

  it("is true only for the exact token", () => {
    process.env.EDGE_TOKEN = TOKEN;
    expect(isFromEdge(req({ "x-edge-token": TOKEN }))).toBe(true);
  });
});

describe("getClientIp", () => {
  it("ignores a spoofed CF-Connecting-IP from a direct request", () => {
    // The attack this exists to stop: hit the origin directly, set the header,
    // rotate it per request, walk past every limit.
    expect(
      getClientIp(req({ "cf-connecting-ip": "9.9.9.9", "x-forwarded-for": "10.0.0.1, 203.0.113.7" })),
    ).toBe("203.0.113.7");
  });

  it("ignores CF-Connecting-IP when the token is wrong", () => {
    process.env.EDGE_TOKEN = TOKEN;
    expect(
      getClientIp(req({ "x-edge-token": "wrong", "cf-connecting-ip": "9.9.9.9", "x-forwarded-for": "203.0.113.7" })),
    ).toBe("203.0.113.7");
  });

  it("uses CF-Connecting-IP when the request came through the edge", () => {
    // Without this, every visitor behind Cloudflare shares the edge address and
    // one person tripping a limit locks out the school.
    process.env.EDGE_TOKEN = TOKEN;
    expect(
      getClientIp(req({ "x-edge-token": TOKEN, "cf-connecting-ip": "9.9.9.9", "x-forwarded-for": "172.16.0.1" })),
    ).toBe("9.9.9.9");
  });

  it("takes the LAST x-forwarded-for entry, never the client-supplied first", () => {
    expect(getClientIp(req({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("reports unknown rather than guessing when there is no forwarding header", () => {
    // Callers skip limiting on "unknown" rather than bucketing every anonymous
    // request onto one shared counter — see the API routes.
    expect(getClientIp(req({}))).toBe("unknown");
  });

  it("falls back to x-forwarded-for when the edge sent no CF-Connecting-IP", () => {
    process.env.EDGE_TOKEN = TOKEN;
    expect(getClientIp(req({ "x-edge-token": TOKEN, "x-forwarded-for": "203.0.113.7" }))).toBe("203.0.113.7");
  });
});
