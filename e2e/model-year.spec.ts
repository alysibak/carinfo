import { expect, test } from '@playwright/test';
import { gotoReady } from './load';

/**
 * A model year with several configurations: from the family page into the year
 * landing, then into one version's dossier.
 */
test.describe('Model year', () => {
  test('opens a multi-config year from the model page and reaches a version', async ({ page }) => {
    const res = await page.request.get('/api/cars/models/honda/civic');
    const body = await res.json();
    const yearRow = (body.data.years as { year: number; configurations: number }[]).find(
      (row) => row.configurations >= 2,
    );
    expect(yearRow, 'Honda Civic has a year with several configurations').toBeTruthy();
    const { year, configurations } = yearRow!;

    await gotoReady(page, '/models/honda/civic');
    await expect(page.getByRole('heading', { level: 1, name: /Honda Civic/i })).toBeVisible({
      timeout: 60_000,
    });

    // The year table row (not the hero shortcut to the newest year).
    await page.locator(`#year-${year}`).getByRole('link').click();
    await expect(page).toHaveURL(new RegExp(`/models/honda/civic/${year}$`));
    await expect(page.getByRole('heading', { level: 1, name: `${year} Honda Civic` })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(`${configurations} configurations on file`)).toBeVisible();
    await expect(page.getByText('How the versions differ')).toBeVisible();

    await page.locator('a[href^="/car/"]').first().click();
    await expect(page).toHaveURL(/\/car\//);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 });
  });
});
