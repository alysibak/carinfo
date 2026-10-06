import { expect, test, type Page } from '@playwright/test';
import { audit, describeViolations } from './axe';

/**
 * Automated WCAG 2.2 A/AA checks with axe-core, at desktop and phone widths
 * (2.2 adds the 24px minimum touch-target size, which matters on phones).
 *
 * Every page passes today. Before this suite existed, an audit found 210+
 * violations: body-text contrast below 4.5:1 site-wide (the "est." labels were
 * the least legible text on the page), no main landmark or skip link on the
 * landing page, a heading level skipped on Compare, and back links with no
 * accessible name on phones. This keeps it that way.
 *
 * axe catches roughly a third of WCAG issues — the mechanical ones. It is a
 * floor, not a substitute for keyboard and screen-reader testing.
 *
 * These pages are seen signed in (where the server has accounts); the
 * sign-in pages and the visitor's view of the tools are in accounts.spec.ts.
 */
async function firstCarId(page: Page, query: string): Promise<string> {
  const res = await page.request.get(`/api/cars/search?q=${query}&limit=1`);
  const body = await res.json();
  return body.data.results[0].id;
}

const VIEWPORTS = [
  { name: 'desktop', viewport: { width: 1280, height: 900 } },
  { name: 'phone', viewport: { width: 375, height: 812 } },
];

for (const { name, viewport } of VIEWPORTS) {
  test.describe(`accessibility (${name})`, () => {
    test.use({ viewport });

    test('core pages have no WCAG A/AA violations', async ({ page }) => {
      const a = await firstCarId(page, 'camry');
      const b = await firstCarId(page, 'accord');
      const pages = [
        '/',
        '/home',
        // Results with the filter bar; on a phone, the filter sheet open.
        '/home?q=suv&sort=relevance&nhtsaMin=5',
        '/home?filters=open',
        '/browse',
        `/car/${a}`,
        `/compare?cars=${a},${b}`,
        '/collection/goldilocks',
        '/smart-search',
        '/vin',
        '/garage',
        '/account',
        '/methodology',
        '/no-such-page',
      ];

      const failures: string[] = [];
      for (const path of pages) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        const violations = await audit(page);
        if (violations.length) failures.push(`${path}\n${describeViolations(violations)}`);
      }
      expect(failures, failures.join('\n\n')).toEqual([]);
    });
  });
}
