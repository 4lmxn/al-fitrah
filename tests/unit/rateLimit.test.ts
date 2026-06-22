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
