/** Shared account / freemium constants. */
export const FREE_GARAGE_LIMIT = 10;

export type UserPlan = 'free' | 'pro';

export interface AccountUser {
  id: string;
  email: string | null;
  plan: UserPlan;
  stripeCustomerId: string | null;
  createdAt: string;
}
