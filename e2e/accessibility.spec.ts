import { expect, test, type Page } from '@playwright/test';

/**
 * Automated WCAG 2.1 A/AA checks with axe-core, at desktop and phone widths.
 *
 * Every page passes today. Before this suite existed, an audit found 210+
 * violations: body-text contrast below 4.5:1 site-wide (the "est." labels were
 * the least legible text on the page), no main landmark or skip link on the
 * landing page, a heading level skipped on Compare, and back links with no
 * accessible name on phones. This keeps it that way.
 *
 * axe catches roughly a third of WCAG issues — the mechanical ones. It is a
 * floor, not a substitute for keyboard and screen-reader testing.
 */
// Specs compile to CommonJS here, so require.resolve is available directly.
const AXE_PATH = require.resolve('axe-core/axe.min.js');

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

interface AxeViolation {
  id: string;
  impact: string;
  help: string;
  nodes: { target: string[] }[];
}

async function audit(page: Page): Promise<AxeViolation[]> {
  await page.addScriptTag({ path: AXE_PATH });
  return page.evaluate(async (tags) => {
    // @ts-expect-error — injected global
    const result = await window.axe.run(document, { runOnly: { type: 'tag', values: tags } });
    return result.violations;
  }, WCAG_TAGS);
}

function describeViolations(violations: AxeViolation[]): string {
  return violations
    .map(
      (v) =>
        `${v.impact} ${v.id}: ${v.help} — ${v.nodes
          .map((n) => n.target.join(' '))
          .slice(0, 3)
          .join(' | ')}`,
    )
    .join('\n');
}

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
        '/browse',
        `/car/${a}`,
        `/compare?cars=${a},${b}`,
        '/collection/goldilocks',
        '/smart-search',
        '/vin',
        '/garage',
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
