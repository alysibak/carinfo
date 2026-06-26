import { test, expect } from '@playwright/test';

test.describe('Trust UI smoke path', () => {
  test('methodology, search, dossier, and compare show provenance affordances', async ({ page }) => {
    await page.goto('/methodology');
    await expect(page.getByRole('heading', { name: /methodology/i })).toBeVisible();
    await expect(page.getByText('EPA', { exact: true }).first()).toBeVisible();

    await page.goto('/home');
    await expect(page.getByRole('heading', { name: 'Search', exact: true })).toBeVisible();

    const searchInput = page.getByPlaceholder(/search make, model, or year/i);
    await searchInput.fill('toyota');
    await page.getByRole('button', { name: 'Search' }).click();

    const firstResult = page.locator('article').first();
    await expect(firstResult).toBeVisible({ timeout: 60_000 });
    await firstResult.click();

    await expect(page.getByText('Data sources')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Specifications')).toBeVisible();

    const compareBtn = page.getByRole('button', { name: /add to compare|\+ compare/i }).first();
    await compareBtn.click();
    await expect(page.getByRole('button', { name: /in compare/i }).first()).toBeVisible();

    await page.locator('a[href="/compare"]').first().click();
    await expect(page.getByRole('heading', { name: 'Compare', exact: true })).toBeVisible();
    await expect(page.getByText('Loading comparison data')).toBeHidden({ timeout: 60_000 });
    await expect(page.getByText('EPA', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Est.', { exact: true }).first()).toBeVisible();
  });
});
