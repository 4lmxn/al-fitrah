import { describe, expect, it } from "vitest";
import { mergeSettings } from "@/lib/settings/merge";
import { DEFAULT_SETTINGS } from "@/lib/settings/schema";

/**
 * The fee payment link is the one setting that sends a parent somewhere else.
 *
 * Whatever is stored here is rendered as a link on every child's fee page, so
 * the validation matters more than it looks: a stored `javascript:` or `http://`
 * value would be handed to families as the school's official way to pay money.
 * The schema only accepts https, and an invalid stored value must not silently
 * become a live link.
 *
 * It ships empty on purpose. Nobody can invent the school's SBI Collect URL, and
 * the portal keeps telling parents to contact the office until an owner sets it.
 */

describe("fee payment link", () => {
  it("ships empty, because only the school knows its own SBI Collect page", () => {
    expect(DEFAULT_SETTINGS.fees.payUrl).toBe("");
  });

  it("accepts an https link", () => {
    const url = "https://www.onlinesbi.sbi/sbicollect/icollecthome.htm?corpID=123456";
    expect(mergeSettings({ fees: { payUrl: url } }).fees.payUrl).toBe(url);
  });

  it("accepts being cleared back to empty", () => {
    expect(mergeSettings({ fees: { payUrl: "" } }).fees.payUrl).toBe("");
  });

  for (const bad of [
    "http://www.onlinesbi.sbi/sbicollect",
    "javascript:alert(1)",
    "//evil.example.com",
    "www.onlinesbi.sbi/sbicollect",
    "data:text/html,<script>alert(1)</script>",
  ]) {
    it(`refuses ${bad.slice(0, 32)}`, () => {
      // A document that fails validation falls back to defaults wholesale, so
      // the bad value never reaches a parent either way.
      expect(mergeSettings({ fees: { payUrl: bad } }).fees.payUrl).toBe("");
    });
  }

  it("leaves the link alone when an unrelated setting changes", () => {
    const url = "https://www.onlinesbi.sbi/sbicollect/icollecthome.htm";
    const merged = mergeSettings({
      fees: { payUrl: url },
      school: { name: "Al Fitrah Pre School" },
    });
    expect(merged.fees.payUrl).toBe(url);
    expect(merged.school.name).toBe("Al Fitrah Pre School");
  });

  it("defaults the link for a settings document written before it existed", () => {
    const merged = mergeSettings({ school: { name: "Al Fitrah Pre School" } });
    expect(merged.fees.payUrl).toBe("");
  });
});
