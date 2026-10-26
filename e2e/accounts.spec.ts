import { expect, test } from '@playwright/test';
import { audit, describeViolations } from './axe';
import { MEMBER } from './global-setup';

/**
 * Visitors browse, compare and decode VINs freely; the garage and the Value
 * chart ask them to sign in. These run as a visitor (no stored
 * sign-in), and only where the server has accounts.
 */
test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async ({ request }) => {
  const status = await (await request.get('/api/me/status')).json();
  test.skip(!status.data?.authConfigured, 'accounts are not configured on this server');
});

test('a visitor browses, compares and decodes freely but signs in for the rest', async ({
  page,
}) => {
  await page.goto('/home');
  await expect(page.getByRole('combobox', { name: 'Search cars' })).toBeVisible();

  await page.goto('/vin');
  await expect(page.getByLabel('Vehicle identification number (VIN)')).toBeVisible();
  await page.goto('/compare');
  await expect(page.getByRole('heading', { name: 'Compare', exact: true })).toBeVisible();

  // Battle Mode's old address opens Compare, which asks no one to sign in.
  await page.goto('/battle');
  await expect(page.getByRole('heading', { name: 'Compare', exact: true })).toBeVisible();

  for (const [path, tool] of [
    ['/garage', 'your garage'],
    ['/value-matrix', 'the Value chart'],
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: `Sign in to use ${tool}` })).toBeVisible();
  }
});

test('signing up opens the tool that asked, and signing out closes it', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  await page.goto('/garage');
  await page.getByRole('link', { name: 'Create free account' }).click();
  await expect(page).toHaveURL(/\/sign-up\?next=%2Fgarage/);

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('a long enough password');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/\/garage$/);
  await expect(page.getByRole('heading', { name: 'Your garage' })).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).first().click();
  await expect(page.getByRole('heading', { name: 'Sign in to use your garage' })).toBeVisible();
});

test('signing in with a wrong password says so, the right one gets in', async ({ page }) => {
  await page.goto('/sign-in?next=%2Fcompare');
  await page.getByLabel('Email').fill(MEMBER.email);
  await page.getByLabel('Password').fill('not the password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toHaveText('Wrong email or password.');

  await page.getByLabel('Password').fill(MEMBER.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/compare$/);
  await expect(page.getByRole('heading', { name: /Sign in to use/ })).toHaveCount(0);

  await page.goto('/account');
  await expect(page.getByRole('heading', { name: 'Account', exact: true })).toBeVisible();
  await expect(page.getByText(MEMBER.email, { exact: true })).toBeVisible();
});

for (const viewport of [
  { width: 1280, height: 900 },
  { width: 375, height: 812 },
]) {
  test(`sign-in pages have no WCAG A/AA violations at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const failures: string[] = [];
    for (const path of [
      '/sign-in',
      '/sign-up',
      '/forgot-password',
      '/reset-password?token=t',
      '/reset-password?error=INVALID_TOKEN',
      '/compare',
    ]) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const violations = await audit(page);
      if (violations.length) failures.push(`${path}\n${describeViolations(violations)}`);
    }
    // The sign-in code's two steps, where the server can email one.
    const status = await (await page.request.get('/api/me/status')).json();
    if (status.data.emailConfigured) {
      await page.goto('/sign-in');
      await page.getByRole('button', { name: 'No password? Email me a code' }).click();
      let violations = await audit(page);
      if (violations.length) failures.push(`code: email\n${describeViolations(violations)}`);
      await page.route('**/api/auth/email-otp/send-verification-otp', (route) =>
        route.fulfill({ json: { success: true } }),
      );
      await page.getByLabel(/^Email/).fill('sam@example.com');
      await page.getByRole('button', { name: 'Email me a code' }).click();
      await page.getByLabel('Code').waitFor();
      violations = await audit(page);
      if (violations.length) failures.push(`code: enter\n${describeViolations(violations)}`);
    }
    expect(failures, failures.join('\n\n')).toEqual([]);
  });
}
