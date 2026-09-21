/** Shared account / freemium constants. */
export const FREE_GARAGE_LIMIT = 10;

/**
 * Pro is sold as "unlimited", but a write path still needs a ceiling — without
 * one a single PUT can hold a pool connection while it writes an unbounded
 * number of rows. Set high enough that no real user reaches it.
 */
export const PRO_GARAGE_LIMIT = 1000;

export type UserPlan = 'free' | 'pro';

export interface AccountUser {
  id: string;
  email: string | null;
  plan: UserPlan;
  stripeCustomerId: string | null;
  createdAt: string;
}
