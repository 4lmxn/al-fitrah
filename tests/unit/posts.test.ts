import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/posts";
import { detectImageType, validateImage, MAX_IMAGE_BYTES } from "@/lib/storage";

describe("slugify", () => {
  it("makes a URL-safe slug", () => {
    expect(slugify("Annual Day 2026")).toBe("annual-day-2026");
  });

  it("collapses punctuation and spacing rather than emitting it", () => {
    expect(slugify("Eid Mubarak!  Holiday — 21st & 22nd")).toBe("eid-mubarak-holiday-21st-22nd");
  });

  it("strips accents instead of dropping the word", () => {
    expect(slugify("Crèche visit")).toBe("creche-visit");
  });

  it("never starts or ends with a separator", () => {
    expect(slugify("  ...Hello...  ")).toBe("hello");
  });

  it("falls back rather than producing an empty path segment", () => {
    // A title of only emoji or script we can't transliterate would otherwise
    // yield "", and /news/ would resolve to the listing page.
    expect(slugify("🎉🎉🎉")).toBe("post");
    expect(slugify("")).toBe("post");
  });

  it("bounds length so a pasted paragraph can't become the URL", () => {
    expect(slugify("word ".repeat(200)).length).toBeLessThanOrEqual(80);
  });
});

describe("image validation", () => {
  it("accepts the three supported types", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(validateImage({ type, size: 1000 })).toEqual({ ok: true });
    }
  });

  it("rejects anything else, including things that sound like images", () => {
    expect(validateImage({ type: "image/svg+xml", size: 1000 }).ok).toBe(false);
    expect(validateImage({ type: "application/pdf", size: 1000 }).ok).toBe(false);
  });

  it("rejects an empty or oversized file", () => {
    expect(validateImage({ type: "image/png", size: 0 }).ok).toBe(false);
    expect(validateImage({ type: "image/png", size: MAX_IMAGE_BYTES + 1 }).ok).toBe(false);
  });
});

describe("detectImageType", () => {
  const bytes = (...b: number[]) => new Uint8Array([...b, ...Array(16).fill(0)]);

  it("identifies real headers", () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff))).toBe("image/jpeg");
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47))).toBe("image/png");
  });

  it("requires the WEBP tag, not just a RIFF container", () => {
    // RIFF also fronts .wav and .avi. Accepting the header alone would let a
    // non-image through to a path we serve publicly from our own origin.
    const riff = new Uint8Array(16);
    riff.set([0x52, 0x49, 0x46, 0x46], 0);
    riff.set([...("WAVE" as unknown as string)].map((c) => c.charCodeAt(0)), 8);
    expect(detectImageType(riff)).toBeNull();

    const webp = new Uint8Array(16);
    webp.set([0x52, 0x49, 0x46, 0x46], 0);
    webp.set([...("WEBP" as unknown as string)].map((c) => c.charCodeAt(0)), 8);
    expect(detectImageType(webp)).toBe("image/webp");
  });

  it("rejects a file whose declared type is a lie", () => {
    // An HTML document renamed to .png. The declared MIME type is
    // attacker-controlled; the bytes are what decide.
    const html = new Uint8Array([...("<!DOCTYPE html>" as unknown as string)].map((c) => c.charCodeAt(0)));
    expect(detectImageType(html)).toBeNull();
  });
});
