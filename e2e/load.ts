import type { Page } from '@playwright/test';

/**
 * Navigate to a path and recover when Vite's error overlay is covering the
 * page after a hot reload (common while other work is editing the client).
 */
export async function gotoReady(page: Page, path: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto(path, attempt === 0 ? undefined : { waitUntil: 'load' });
    await page.waitForLoadState('networkidle');
    if ((await page.locator('vite-error-overlay').count()) === 0) return;
    await page.waitForTimeout(750);
  }
}
