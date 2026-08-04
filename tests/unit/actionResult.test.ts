import { describe, expect, it, vi, afterEach } from "vitest";
import { attempt, fail, ok } from "@/lib/actionResult";

afterEach(() => vi.restoreAllMocks());

function withDigest(digest: string): Error {
  return Object.assign(new Error("control flow"), { digest });
}

describe("attempt", () => {
  it("passes a returned result straight through", async () => {
    await expect(attempt("x", async () => fail("nope"))).resolves.toEqual({ ok: false, error: "nope" });
    await expect(attempt("x", async () => ok)).resolves.toEqual({ ok: true });
  });

  it("treats a body that returns nothing as success", async () => {
    // Most actions just do their work and fall off the end.
    await expect(attempt("x", async () => {})).resolves.toEqual({ ok: true });
  });

  it("turns an unexpected throw into a generic message rather than a blank page", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await attempt("x", async () => {
      throw new Error("Firestore is on fire");
    });
    expect(result).toEqual({ ok: false, error: "Something went wrong. Please try again." });
  });

  it("logs the real error even though the user sees a generic one", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await attempt("updateStage", async () => {
      throw new Error("boom");
    });
    expect(spy).toHaveBeenCalledWith("updateStage failed", expect.any(Error));
  });

  it("re-throws redirect, which Next implements by throwing", async () => {
    // Swallowing this would leave the user on the old page with no error and
    // no navigation — the action would look like it silently did nothing.
    await expect(
      attempt("createOpening", async () => {
        throw withDigest("NEXT_REDIRECT;replace;/admin/openings;307;");
      }),
    ).rejects.toThrow("control flow");
  });

  it("re-throws notFound for the same reason", async () => {
    await expect(
      attempt("x", async () => {
        throw withDigest("NEXT_NOT_FOUND");
      }),
    ).rejects.toThrow("control flow");
  });

  it("does not mistake an ordinary error carrying a digest-like field", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await attempt("x", async () => {
      throw Object.assign(new Error("nope"), { digest: 12345 });
    });
    expect(result).toEqual({ ok: false, error: "Something went wrong. Please try again." });
  });
});
