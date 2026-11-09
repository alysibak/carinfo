import { expect, test } from '@playwright/test';
import { gotoReady } from './load';

/**
 * A signed-in member builds a short garage, shares it, and a visitor opens the
 * link and sees the same cars — including how they differ.
 */
test.describe('Garage share', () => {
  test('member saves two cars, shares them, visitor sees both', async ({ page, browser }) => {
    const status = await (await page.request.get('/api/me/status')).json();
    test.skip(!status.data?.authConfigured, 'accounts are not configured on this server');

    const search = async (q: string) => {
      const res = await page.request.get(`/api/cars/search?q=${encodeURIComponent(q)}&limit=1`);
      return (await res.json()).data.results[0] as { id: string; year: number; make: string };
    };
    const a = await search('toyota prius');
    const b = await search('toyota tundra');
    expect(a.id).not.toEqual(b.id);

    async function clearGarage() {
      await gotoReady(page, '/garage');
      await expect(page.getByRole('heading', { name: 'Your garage' })).toBeVisible({
        timeout: 30_000,
      });
      const clear = page.getByRole('button', { name: 'Clear' });
      if (await clear.isVisible()) {
        await clear.click();
        await page.getByRole('button', { name: 'Clear all' }).click();
      }
      await expect(page.getByRole('heading', { name: 'Nothing saved yet' })).toBeVisible();
    }

    await clearGarage();

    for (const car of [a, b]) {
      await gotoReady(page, `/car/${car.id}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 });
      await page.getByRole('button', { name: 'Save to garage' }).first().click();
      await expect(page.getByText(/Added to garage|Already in garage/)).toBeVisible();
    }

    await gotoReady(page, '/garage');
    await expect(page.getByRole('heading', { name: 'Your garage' })).toBeVisible();
    await expect(page.getByText('2 cars saved')).toBeVisible();
    await expect(page.locator(`a[href="/car/${a.id}"]`).first()).toBeVisible();
    await expect(page.locator(`a[href="/car/${b.id}"]`).first()).toBeVisible();

    await page.getByRole('button', { name: 'Share garage' }).click();
    await expect(page.getByRole('heading', { name: 'Share your garage' })).toBeVisible();
    const shareText = await page.locator('.font-mono').innerText();
    expect(shareText).toMatch(/\/shared-garage\?cars=/);
    const sharePath = shareText.replace(/^https?:\/\/[^/]+/, '');
    expect(sharePath).toContain(a.id);
    expect(sharePath).toContain(b.id);

    const visitor = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const visitorPage = await visitor.newPage();
    try {
      await gotoReady(visitorPage, sharePath);
      await expect(visitorPage.getByRole('heading', { name: 'Cars shared with you' })).toBeVisible({
        timeout: 30_000,
      });
      await expect(visitorPage.getByText('2 cars from')).toBeVisible();
      await expect(visitorPage.locator(`a[href="/car/${a.id}"]`).first()).toBeVisible();
      await expect(visitorPage.locator(`a[href="/car/${b.id}"]`).first()).toBeVisible();
      await expect(visitorPage.getByText('How these cars differ')).toBeVisible();
    } finally {
      await visitor.close();
    }

    await clearGarage();
  });
});
