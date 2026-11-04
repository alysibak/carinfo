import type { Page } from '@playwright/test';

/**
 * Navigate to a path and recover when Vite's error overlay or the app's
 * error boundary is covering the page after a hot reload (common while other
 * work is editing the client).
 */
export async function gotoReady(page: Page, path: string): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.goto(path, attempt === 0 ? undefined : { waitUntil: 'load' });
    await page.waitForLoadState('networkidle');

    if ((await page.locator('vite-error-overlay').count()) > 0) {
      await page.waitForTimeout(750);
      continue;
    }

    const crashed = page.getByRole('heading', { name: 'Something went wrong' });
    if (await crashed.isVisible().catch(() => false)) {
      const retry = page.getByRole('button', { name: 'Try again' });
      if (await retry.isVisible().catch(() => false)) {
        await retry.click();
        await page.waitForLoadState('networkidle');
        if (!(await crashed.isVisible().catch(() => false))) return;
      }
      await page.waitForTimeout(750);
      continue;
    }

    return;
  }
}
