import { describe, expect, it } from "vitest";
import { render, tokensIn } from "@/lib/notify/render";
import { NOTIFY_CHANNELS, NOTIFY_EVENTS } from "@/lib/notify/types";
import { DEFAULT_SETTINGS } from "@/lib/settings/schema";

describe("template rendering", () => {
  it("fills tokens from the payload", () => {
    expect(render("Hello {{name}}", { name: "Ayesha" })).toBe("Hello Ayesha");
  });

  it("tolerates spacing inside the braces", () => {
    expect(render("Hi {{ name }}", { name: "Yusuf" })).toBe("Hi Yusuf");
  });

  it("renders a missing token as empty, never as literal braces", () => {
    // A parent must never receive "{{childName}}" in an email; a typo in a
    // template should degrade quietly rather than look like a system error.
    expect(render("Child: {{childName}}.", {})).toBe("Child: .");
    expect(render("X {{nope}}", { other: 1 })).toBe("X ");
  });

  it("treats null and undefined as empty rather than printing them", () => {
    expect(render("[{{a}}][{{b}}]", { a: null, b: undefined })).toBe("[][]");
  });

  it("renders numbers", () => {
    expect(render("{{count}} due", { count: 3 })).toBe("3 due");
  });

  it("does not interpret anything beyond a token", () => {
    // Templates are edited by administrators; no loops, no expressions, so a
    // settings field can never become a place to execute logic.
    expect(render("{{#if x}}y{{/if}}", { x: "1" })).toBe("{{#if x}}y{{/if}}");
  });

  it("lists the tokens a template uses, without duplicates", () => {
    expect(tokensIn("{{a}} {{b}} {{a}}")).toEqual(["a", "b"]);
  });
});

describe("shipped notification defaults", () => {
  it("defines a template for every event", () => {
    for (const e of NOTIFY_EVENTS) {
      const t = DEFAULT_SETTINGS.notifications.templates[e];
      expect(t.subject.length).toBeGreaterThan(0);
      expect(t.body.length).toBeGreaterThan(0);
    }
  });

  it("only enables channels that are actually wired", () => {
    // whatsapp and sms are declared but unimplemented; shipping them enabled
    // would mean silently failing deliveries on day one.
    for (const e of NOTIFY_EVENTS) {
      for (const c of DEFAULT_SETTINGS.notifications.events[e]) {
        expect(["email", "dashboard"]).toContain(c);
      }
    }
  });

  it("declares every channel the schema allows", () => {
    expect([...NOTIFY_CHANNELS]).toEqual(["email", "dashboard", "whatsapp", "sms"]);
  });

  it("keeps the lead template's tokens matched to what the route sends", () => {
    const t = DEFAULT_SETTINGS.notifications.templates["lead.created"];
    const used = new Set([...tokensIn(t.subject), ...tokensIn(t.body)]);
    // These are the keys api/inquiry passes; a template referencing anything
    // else would render blank in a real email.
    const sent = ["parentName", "childName", "phone", "email", "childAge", "programInterest", "message", "link"];
    for (const token of used) expect(sent).toContain(token);
  });
});
