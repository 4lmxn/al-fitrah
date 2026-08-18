import { test, expect } from "@playwright/test";

/**
 * Phone-layout guards.
 *
 * Every layout on this site is authored on a wide screen, and the failures that
 * causes are invisible there by definition. Two have already shipped:
 *
 *  - card grids that simply stacked, turning the home page into thirteen
 *    screens of scrolling against desktop's seven;
 *  - a swipe rail whose cards were narrower than the prose inside them, so the
 *    reading column collapsed to ~170px — about twenty characters a line — and
 *    one card grew taller than the phone itself.
 *
 * Both looked perfect at 1280px. So these run at 390px and assert the things a
 * desktop eye cannot see.
 */

const PAGES = [
  "/",
  "/programs",
  "/syllabus",
  "/campus-life",
  "/careers",
  "/parent-resources",
  "/about",
  "/admissions",
  "/faq",
  "/contact",
];

const PHONE = { width: 390, height: 844 };

test.use({ viewport: PHONE });

for (const path of PAGES) {
  test(`${path} fits a phone`, async ({ page }) => {
    await page.goto(path);

    // Nothing may push the page sideways. A single overflowing card makes the
    // whole document draggable and every section feel broken.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow, `${path} scrolls horizontally`).toBe(false);

    const problems = await page.evaluate((vh) => {
      const found: string[] = [];

      for (const rail of document.querySelectorAll<HTMLElement>('[role="group"]')) {
        const label = rail.getAttribute("aria-label") ?? "unlabelled rail";

        // A rail must actually be swipeable on a phone, or it is just a grid
        // that silently stacked and we have gained nothing.
        if (rail.scrollWidth <= rail.clientWidth + 4) {
          found.push(`rail "${label}" does not scroll at ${window.innerWidth}px`);
        }

        for (const card of Array.from(rail.children) as HTMLElement[]) {
          const h = card.getBoundingClientRect().height;
          // Taller than the screen is worse than the stack it replaced: the
          // card's edges leave the viewport and vertical scrolling inside a
          // horizontal snap container is disorienting.
          if (h > vh * 0.9) {
            found.push(`card in "${label}" is ${Math.round(h)}px, taller than the ${vh}px viewport`);
          }

          // Prose needs a measure. Short labels and numbers do not, so only
          // real sentences are checked.
          for (const el of card.querySelectorAll<HTMLElement>("p, dd, li")) {
            const text = (el.textContent ?? "").trim();
            if (text.length < 90) continue;
            const w = el.getBoundingClientRect().width;
            if (w > 0 && w < 250) {
              found.push(`text in "${label}" is only ${Math.round(w)}px wide for ${text.length} chars`);
            }
          }
        }
      }
      return found;
    }, PHONE.height);

    expect(problems, `${path} phone layout`).toEqual([]);
  });
}

test("tap targets in the floating lead widget are big enough", async ({ page }) => {
  await page.goto("/");
  // WCAG 2.2 asks for 24px minimum; a one-handed thumb on a call button wants
  // considerably more, and this is the highest-intent control on the site.
  for (const name of ["Call the school", "Enquire on WhatsApp"]) {
    const box = await page.getByRole("link", { name }).boundingBox();
    expect(box, `${name} missing`).not.toBeNull();
    expect(box!.width, `${name} too narrow`).toBeGreaterThanOrEqual(44);
    expect(box!.height, `${name} too short`).toBeGreaterThanOrEqual(44);
  }
});
