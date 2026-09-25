import { expect, test, type Page } from '@playwright/test';

/**
 * Cumulative Layout Shift on the pages that load data after first paint.
 *
 * Google counts CLS above 0.1 against a page. The dossier measured 0.20 and
 * compare 0.13 on a phone: the footer sat on screen while data loaded, then
 * jumped. Search measured 0.17 from a status line mounting inside the sticky
 * header. All are ~0 now; this keeps them under the threshold.
 */
const GOOD_CLS = 0.1;

async function measureCls(page: Page, path: string): Promise<number> {
  await page.addInitScript(() => {
    (window as unknown as { __cls: number }).__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as Array<{
        value: number;
        hadRecentInput: boolean;
      }>) {
        if (!entry.hadRecentInput) (window as unknown as { __cls: number }).__cls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  // Late-arriving content (suggestions, similar cars) shifts after idle, too.
  await page.waitForTimeout(1000);
  return page.evaluate(() => (window as unknown as { __cls: number }).__cls);
}

test.describe('layout stability (phone)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('data-driven pages stay under the CLS threshold', async ({ page }) => {
    const res = await page.request.get('/api/cars/search?q=civic&limit=1');
    const id = (await res.json()).data.results[0].id;

    for (const path of [`/car/${id}`, `/compare?cars=${id}`, '/home?q=toyota']) {
      const cls = await measureCls(page, path);
      expect(cls, `CLS on ${path}`).toBeLessThan(GOOD_CLS);
    }
  });
});
