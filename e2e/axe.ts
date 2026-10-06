import type { Page } from '@playwright/test';

/** axe-core's WCAG 2.2 A/AA checks, shared by the specs that audit pages. */
// Specs compile to CommonJS here, so require.resolve is available directly.
const AXE_PATH = require.resolve('axe-core/axe.min.js');

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

interface AxeViolation {
  id: string;
  impact: string;
  help: string;
  nodes: { target: string[] }[];
}

export async function audit(page: Page): Promise<AxeViolation[]> {
  await page.addScriptTag({ path: AXE_PATH });
  return page.evaluate(async (tags) => {
    // @ts-expect-error — injected global
    const result = await window.axe.run(document, { runOnly: { type: 'tag', values: tags } });
    return result.violations;
  }, WCAG_TAGS);
}

export function describeViolations(violations: AxeViolation[]): string {
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
