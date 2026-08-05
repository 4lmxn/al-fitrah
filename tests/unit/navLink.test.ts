import { describe, expect, it } from "vitest";
import { isActive } from "@/components/admin/NavLink";

// "/admin" is a prefix of every other admin route, so a naive startsWith lights
// every item at once — which is the inverse of the bug this replaced, where the
// active state was hardcoded onto Leads and never moved.
describe("sidebar active state", () => {
  it("marks Leads on the console index", () => {
    expect(isActive("/admin", "/admin")).toBe(true);
  });

  it("keeps Leads active on a lead detail page", () => {
    expect(isActive("/admin/leads/abc123", "/admin")).toBe(true);
    expect(isActive("/admin/leads/new", "/admin")).toBe(true);
  });

  it("does NOT keep Leads active on every other section", () => {
    for (const path of ["/admin/students", "/admin/fees", "/admin/attendance", "/admin/insights", "/admin/openings"]) {
      expect(isActive(path, "/admin")).toBe(false);
    }
  });

  it("marks the section you are actually in", () => {
    expect(isActive("/admin/fees", "/admin/fees")).toBe(true);
    expect(isActive("/admin/attendance", "/admin/attendance")).toBe(true);
  });

  it("stays active on a section's detail pages", () => {
    expect(isActive("/admin/students/xyz", "/admin/students")).toBe(true);
    expect(isActive("/admin/openings/123", "/admin/openings")).toBe(true);
  });

  it("lights exactly one section at a time", () => {
    const hrefs = ["/admin", "/admin/students", "/admin/attendance", "/admin/fees", "/admin/insights", "/admin/openings"];
    for (const path of [...hrefs, "/admin/students/abc", "/admin/leads/abc"]) {
      expect(hrefs.filter((h) => isActive(path, h))).toHaveLength(1);
    }
  });

  it("does not match a sibling that merely shares a prefix", () => {
    // /admin/students must not light for a hypothetical /admin/students-archive
    expect(isActive("/admin/students-archive", "/admin/students")).toBe(false);
  });
});
