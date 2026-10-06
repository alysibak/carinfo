import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { request, type FullConfig } from '@playwright/test';

/** Where the signed-in member's cookies are kept for the specs. */
export const MEMBER_STATE = 'e2e/.auth/member.json';
export const MEMBER = { email: 'e2e-member@example.com', password: 'e2e member password' };

/**
 * The tools need an account where accounts are set up (DATABASE_URL and
 * BETTER_AUTH_SECRET on the server, as CI runs it), so every spec runs as a
 * signed-in member; accounts.spec.ts checks the visitor's side. Without
 * accounts, the state is empty and nothing is gated.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0].use.baseURL!;
  const api = await request.newContext({ baseURL, extraHTTPHeaders: { origin: baseURL } });
  mkdirSync(dirname(MEMBER_STATE), { recursive: true });

  const status = await (await api.get('/api/me/status')).json();
  if (status.data?.authConfigured) {
    const signUp = await api.post('/api/auth/sign-up/email', {
      data: { ...MEMBER, name: 'E2E member' },
    });
    if (!signUp.ok()) {
      // Already made by an earlier run against the same database.
      const signIn = await api.post('/api/auth/sign-in/email', { data: MEMBER });
      if (!signIn.ok()) throw new Error(`could not sign in the e2e member: ${signIn.status()}`);
    }
    await api.storageState({ path: MEMBER_STATE });
  } else {
    writeFileSync(MEMBER_STATE, JSON.stringify({ cookies: [], origins: [] }));
  }
  await api.dispose();
}
