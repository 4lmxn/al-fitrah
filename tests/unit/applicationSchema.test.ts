import { describe, it, expect } from "vitest";
import {
  applicationSchema, validateCvFile, sanitizeFilename, MAX_CV_BYTES,
} from "@/lib/applicationSchema";

describe("applicationSchema", () => {
  it("accepts a valid application", () => {
    const r = applicationSchema.safeParse({
      name: "Fatima Noor", phone: "+91 99860 49413",
      email: "f@example.com", role: "Montessori Lead Teacher", message: "5 yrs exp",
    });
    expect(r.success).toBe(true);
  });

  it("requires a role", () => {
    const r = applicationSchema.safeParse({ name: "A B", phone: "9999999", role: "" });
    expect(r.success).toBe(false);
  });

  it("parses a filled honeypot so the route can fake success without leaking the trap", () => {
    const r = applicationSchema.safeParse({
      name: "A B", phone: "9999999", role: "Assistant", website: "spam",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.website).toBe("spam");
  });
});

describe("validateCvFile", () => {
  it("accepts a PDF under the size cap", () => {
    expect(validateCvFile({ type: "application/pdf", size: 1000, name: "cv.pdf" }))
      .toEqual({ ok: true });
  });

  it("rejects an oversized file", () => {
    const r = validateCvFile({ type: "application/pdf", size: MAX_CV_BYTES + 1, name: "cv.pdf" });
    expect(r.ok).toBe(false);
  });

  it("rejects an unsupported type", () => {
    const r = validateCvFile({ type: "image/png", size: 10, name: "cv.png" });
    expect(r.ok).toBe(false);
  });

  it("rejects an empty file", () => {
    const r = validateCvFile({ type: "application/pdf", size: 0, name: "cv.pdf" });
    expect(r.ok).toBe(false);
  });
});

describe("sanitizeFilename", () => {
  it("strips path separators and unsafe chars", () => {
    expect(sanitizeFilename("../../My CV (final).pdf")).toBe("My_CV_final.pdf");
  });
});
