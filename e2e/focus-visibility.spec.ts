import { expect, test, type Page } from '@playwright/test';

/**
 * Every keyboard focus stop must look different from its unfocused self.
 *
 * Several inputs drop their outline (`focus:outline-none`) and rely on a frame
 * or border change instead. The landing page's search box and the VIN field
 * had neither, so a keyboard user could not see where they were; axe does not
 * check this. The element and its nearest ancestors are compared, since a
 * frame's `focus-within` border counts as an indicator.
 */
const STOPS_PER_PAGE = 30;

declare global {
  interface Window {
    __focusLook: (el: Element) => string;
    __focusTarget?: HTMLElement;
  }
}

/** Even a zero-length transition only lands once the page's clock ticks. */
const nextFrames = (page: Page) =>
  page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  );

async function unmarkedStops(page: Page, path: string): Promise<string[]> {
  await page.goto(path);
  await page.waitForLoadState('networkidle');

  const seen = new Set<string>();
  const unmarked: string[] = [];
  for (let i = 0; i < STOPS_PER_PAGE; i++) {
    await page.keyboard.press('Tab');
    await nextFrames(page);
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      window.__focusTarget = el;
      const name = (el.getAttribute('aria-label') || el.textContent || el.tagName)
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 60);
      return { name: `${el.tagName.toLowerCase()} "${name}"`, look: window.__focusLook(el) };
    });
    if (!focused || seen.has(focused.name)) continue;
    seen.add(focused.name);

    await page.evaluate(() => window.__focusTarget!.blur());
    await nextFrames(page);
    const blurred = await page.evaluate(() => window.__focusLook(window.__focusTarget!));
    await page.evaluate(() => window.__focusTarget!.focus());
    if (blurred === focused.look) unmarked.push(focused.name);
  }
  expect(seen.size, `${path} has keyboard focus stops`).toBeGreaterThan(3);
  return unmarked;
}

test.describe('keyboard focus visibility', () => {
  // Reduced motion zeroes the colour transitions, so styles settle at once.
  test.use({ reducedMotion: 'reduce' });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const invisible = (color: string) => /rgba\([^)]*,\s*0\)|transparent/.test(color);
      window.__focusLook = (el: Element) => {
        const parts: string[] = [];
        let node: Element | null = el;
        for (let depth = 0; depth < 4 && node && node !== document.body; depth++) {
          const cs = getComputedStyle(node);
          // Tailwind's outline-none is a transparent outline: not an indicator.
          const outline =
            cs.outlineStyle === 'none' ||
            parseFloat(cs.outlineWidth) === 0 ||
            invisible(cs.outlineColor)
              ? 'none'
              : `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`;
          const shadows = cs.boxShadow.split(/,(?![^(]*\))/);
          const shadow =
            cs.boxShadow === 'none' || shadows.every(invisible) ? 'none' : cs.boxShadow;
          parts.push(
            [
              outline,
              shadow,
              cs.borderColor,
              cs.backgroundColor,
              cs.color,
              cs.textDecorationLine,
            ].join('|'),
          );
          node = node.parentElement;
        }
        return parts.join(' / ');
      };
    });
  });

  test('every focus stop on core pages visibly changes', async ({ page }) => {
    const res = await page.request.get('/api/cars/search?q=civic&limit=1');
    const id = (await res.json()).data.results[0].id;

    for (const path of ['/', '/home?q=toyota', `/car/${id}`, '/vin']) {
      expect(await unmarkedStops(page, path), path).toEqual([]);
    }
  });
});
