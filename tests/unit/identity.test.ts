import { describe, it, expect } from "vitest";
import { mergeSettings, addressLine, brandName } from "@/lib/settings";

describe("school identity is configuration", () => {
  const other = mergeSettings({
    school: {
      name: "Green Valley School", branch: "Whitefield", tagline: "Learning that lasts.",
      phone: "+91 80 4000 1234", email: "office@greenvalley.example",
      address: { street: "12 Main Road", locality: "EPIP Zone", city: "Bengaluru", region: "Karnataka", postalCode: "560066", country: "IN" },
    },
  });

  it("derives the brand from configured name and branch", () => {
    expect(brandName(other.school)).toBe("Green Valley School, Whitefield");
  });

  it("omits the separator when a school has no branch", () => {
    // A single-campus school should not be titled "Name, ".
    const single = mergeSettings({ school: { name: "One Campus", branch: "" } });
    expect(brandName(single.school)).toBe("One Campus");
  });

  it("builds a display line from the structured address", () => {
    expect(addressLine(other.school.address)).toBe("12 Main Road, EPIP Zone, Bengaluru, Karnataka 560066");
  });

  it("keeps the address structured so JSON-LD can emit a PostalAddress", () => {
    // A single string could not produce addressLocality/addressRegion/postalCode.
    expect(other.school.address).toMatchObject({ city: "Bengaluru", region: "Karnataka", postalCode: "560066" });
  });

  it("tolerates a partially filled address without producing stray commas", () => {
    const sparse = mergeSettings({ school: { address: { street: "", locality: "", city: "Pune", region: "MH", postalCode: "411001", country: "IN" } } });
    expect(addressLine(sparse.school.address)).toBe("Pune, MH 411001");
  });
});
