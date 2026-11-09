import { expect, test } from '@playwright/test';

/**
 * Text-path VIN decode (no camera): sample VIN → NHTSA decode → built-as
 * heading, then the car here it is → that car's own page.
 */
test.describe('VIN decode', () => {
  test('decodes the sample VIN from the form and opens its car’s page', async ({ page }) => {
    await page.goto('/vin');
    await expect(page.getByRole('heading', { name: /VIN lookup/i })).toBeVisible();

    await page.getByRole('button', { name: /Sample VIN/i }).click();

    // NHTSA's make in capitals: the car card under it says "Honda".
    await expect(page.getByRole('heading', { name: '2003 HONDA Accord', exact: true })).toBeVisible(
      { timeout: 60_000 },
    );
    await expect(page.getByText(/As built, by NHTSA/i)).toBeVisible();

    // The car here the VIN is, first on the result, a click from its page:
    // the one version, or the first of those the VIN fits.
    const match = page.locator('section[aria-labelledby="vin-catalog"]');
    await expect(match).toBeVisible();
    const open = page.getByRole('link', { name: 'Open this car’s page' });
    await ((await open.count()) > 0 ? open : match.locator('a[href^="/car/"]').first()).click();
    await expect(page).toHaveURL(/\/car\/honda-accord-2003-/);
    await expect(page.getByRole('heading', { level: 1, name: /2003 Honda Accord/i })).toBeVisible();
  });
});
