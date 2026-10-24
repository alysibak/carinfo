import { expect, test, type Page } from '@playwright/test';

/**
 * A mouse can tell what does something. Everything clickable shows the hand
 * (Tailwind's reset gave every button the plain arrow, so buttons read as
 * text), and nothing that does nothing looks as if it would: no hand over
 * plain text, no small bordered box (the EPA and NHTSA labels were) that
 * reads as a button, and nothing that lights up under the mouse (a model
 * page's year rows did) without doing anything.
 */
const INTERACTIVE =
  'a[href], button, [role="button"], summary, select, input[type="checkbox"], input[type="radio"]';

async function problems(page: Page, path: string): Promise<string[]> {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
  return page.evaluate((selector) => {
    const shown = (el: Element) => {
      const box = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return (
        box.width > 0 &&
        box.height > 0 &&
        style.visibility !== 'hidden' &&
        !el.closest('[aria-hidden="true"], .sr-only')
      );
    };
    const label = (el: Element) =>
      (el.getAttribute('aria-label') || el.textContent || el.tagName)
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 40);
    const found: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      if (!shown(el) || (el as HTMLButtonElement).disabled) continue;
      const cursor = getComputedStyle(el).cursor;
      // A photo that opens larger says so with the magnifier.
      if (cursor !== 'pointer' && cursor !== 'zoom-in') found.push(`no hand: ${label(el)}`);
    }
    // A table row that opens its year is marked data-row-link.
    const clickable = (el: Element) =>
      el.closest(`${selector}, input, textarea, label, [data-row-link]`) !== null ||
      el.querySelector(`${selector}, input`) !== null;
    for (const el of document.querySelectorAll<HTMLElement>('body *')) {
      if (!shown(el) || clickable(el)) continue;
      const style = getComputedStyle(el);
      if (style.cursor === 'pointer') found.push(`hand over plain text: ${label(el)}`);
      const box = el.getBoundingClientRect();
      const text = (el.textContent || '').trim();
      const boxed = (['Top', 'Right', 'Bottom', 'Left'] as const).every(
        (side) =>
          parseFloat(style[`border${side}Width`]) >= 1 &&
          !/rgba\(0, 0, 0, 0\)|transparent/.test(style[`border${side}Color`]),
      );
      if (boxed && box.height <= 44 && box.width <= 240 && text.length > 0 && text.length < 30) {
        found.push(`boxed like a button: ${label(el)}`);
      }
    }
    // Lights up under the mouse but does nothing: a hover style of its own on
    // something that is neither clickable nor holds a link stretched over it.
    // A link somewhere inside does not make the whole of it clickable.
    for (const el of document.querySelectorAll<HTMLElement>('[class*="hover:"]')) {
      if (!shown(el) || el.closest(`${selector}, label, [data-row-link]`)) continue;
      const own = String(el.className)
        .split(/\s+/)
        .filter((name) => name.startsWith('hover:'));
      if (own.length && !el.querySelector('a[class*="after:absolute"]')) {
        found.push(`lights up, does nothing: ${label(el)}`);
      }
    }
    return [...new Set(found)];
  }, INTERACTIVE);
}

test.describe('what is clickable looks it', () => {
  test.use({ viewport: { width: 1366, height: 900 } });

  test('every page shows the hand only over what does something', async ({ page }) => {
    const res = await page.request.get('/api/cars/search?q=civic&limit=1');
    const id = (await res.json()).data.results[0].id;
    const failures: string[] = [];
    for (const path of [
      '/',
      '/home?q=toyota',
      `/car/${id}`,
      '/models/honda/civic',
      '/compare',
      '/browse',
      '/vin',
      '/garage',
      '/methodology',
      '/no-such-page',
      '/models/toyota/hovercraft',
    ]) {
      const found = await problems(page, path);
      if (found.length) failures.push(`${path}\n  ${found.join('\n  ')}`);
    }
    expect(failures, failures.join('\n\n')).toEqual([]);
  });
});
