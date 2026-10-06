import request, { type Response } from 'supertest';
import type { Express } from 'express';

/** The origin the tests' browser requests come from (a dev origin Better Auth trusts). */
export const SITE = 'http://localhost:3000';

/** A test secret; Better Auth wants at least 32 characters. */
export const TEST_AUTH_SECRET = 'test-secret-test-secret-test-secret-0123';

export interface TestUser {
  id: string;
  email: string;
  /** The Cookie header a browser would send after this sign-in. */
  cookie: string;
}

/** The cookies a response sets, as the next request's Cookie header. */
export function cookiesOf(res: Response): string {
  const set = res.headers['set-cookie'] as unknown as string[] | undefined;
  return (set ?? []).map((c) => c.split(';')[0]).join('; ');
}

export async function signUp(
  app: Express,
  email: string,
  password = 'correct horse battery',
): Promise<TestUser> {
  const res = await request(app)
    .post('/api/auth/sign-up/email')
    .set('origin', SITE)
    .send({ email, password, name: email.split('@')[0] });
  if (res.status !== 200) {
    throw new Error(`sign-up failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { id: res.body.user.id, email, cookie: cookiesOf(res) };
}
