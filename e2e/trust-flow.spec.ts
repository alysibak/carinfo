import { expect, test } from '@playwright/test';

/**
 * The core trust path: methodology → search → dossier → compare, checking
 * that provenance labels ("EPA", "Est.") survive every step.
 *
 * Rewritten for the current search UI. The previous version still targeted a
 * "Search" heading and submit button that a3a7e28 replaced with a type-ahead
 * box; it had been failing unnoticed because CI never got past `npm ci`.
 */
test.describe('Trust UI smoke path', () => {
  test('methodology, search, dossier, and compare show provenance affordances', async ({
    page,
  }) => {
    await page.goto('/methodology');
    await expect(page.getByRole('heading', { name: /methodology/i })).toBeVisible();
    await expect(page.getByText('EPA', { exact: true }).first()).toBeVisible();

    await page.goto('/home');
    const search = page.getByRole('combobox', { name: 'Search vehicles' });
    await search.fill('toyota');
    await search.press('Enter');

    const firstResult = page.locator('article').first();
    await expect(firstResult).toBeVisible({ timeout: 60_000 });
    await firstResult.getByRole('link').first().click();

    await expect(page).toHaveURL(/\/car\//);
    await expect(page.getByRole('heading', { level: 1, name: /toyota/i })).toBeVisible({
      timeout: 30_000,
    });
    // Stay on the dossier: a debounced search-param write used to replace this
    // URL and bounce the user back to the results.
    await expect(page).toHaveURL(/\/car\//);
    await expect(page.getByRole('button', { name: /data sources/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Cost to keep' })).toBeVisible();

    await page
      .getByRole('button', { name: /\+ compare/i })
      .first()
      .click();
    await expect(page.getByRole('button', { name: /in compare/i }).first()).toBeVisible();

    await page.getByRole('navigation').getByRole('link', { name: 'Compare' }).click();
    await expect(page.getByRole('heading', { name: 'Compare', exact: true })).toBeVisible();
    await expect(page.getByText('Loading comparison data')).toBeHidden({ timeout: 60_000 });
    // Measured and modeled numbers stay distinguishable side by side.
    await expect(page.getByText(/USD \(EPA\)$/).first()).toBeVisible();
    await expect(page.getByText(/CAD \(est\.\)$/).first()).toBeVisible();
  });
});
