import { expect, test } from '@playwright/test';

/**
 * Text-path VIN decode (no camera): sample VIN → NHTSA decode → built-as heading.
 */
test.describe('VIN decode', () => {
  test('decodes the sample VIN from the form', async ({ page }) => {
    await page.goto('/vin');
    await expect(page.getByRole('heading', { name: /VIN lookup/i })).toBeVisible();

    await page.getByRole('button', { name: /Sample VIN/i }).click();

    await expect(page.getByRole('heading', { name: /2003 HONDA Accord/i })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(/As built, by NHTSA/i)).toBeVisible();
  });
});
