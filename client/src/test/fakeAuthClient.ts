import { useSyncExternalStore } from 'react';
import { vi } from 'vitest';

/**
 * Stands in for Better Auth's browser client in unit tests (setup.ts swaps
 * it in), so nothing calls a server. Tests pick the visitor's state with the
 * helpers below; by default accounts are unavailable, as on a deployment
 * without them, and nothing is gated.
 */
interface SessionState {
  data: { user: FakeUser; session: { id: string } } | null;
  isPending: boolean;
  error: { status: number } | null;
}

export interface FakeUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
}

const UNAVAILABLE: SessionState = { data: null, isPending: false, error: { status: 503 } };
let state = UNAVAILABLE;
const listeners = new Set<() => void>();

function set(next: SessionState) {
  state = next;
  listeners.forEach((listener) => listener());
}

export const fakeAuth = {
  unavailable: () => set(UNAVAILABLE),
  loading: () => set({ data: null, isPending: true, error: null }),
  signedOut: () => set({ data: null, isPending: false, error: null }),
  signedIn: (user: Partial<FakeUser> = {}) =>
    set({
      data: {
        user: {
          id: 'user-1',
          name: 'Sam',
          email: 'sam@example.com',
          emailVerified: true,
          ...user,
        },
        session: { id: 'session-1' },
      },
      isPending: false,
      error: null,
    }),
};

const ok = () => vi.fn(async (..._args: unknown[]) => ({ data: {}, error: null }) as never);

export const fakeAuthClient = {
  useSession: () => {
    const current = useSyncExternalStore(
      (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      () => state,
    );
    return { ...current, isRefetching: false, refetch: async () => {} };
  },
  signIn: { email: ok(), social: ok() },
  signUp: { email: ok() },
  signOut: ok(),
  requestPasswordReset: ok(),
  resetPassword: ok(),
  sendVerificationEmail: ok(),
  changePassword: ok(),
  revokeOtherSessions: ok(),
  deleteUser: ok(),
  listAccounts: vi.fn(async () => ({ data: [{ providerId: 'credential' }], error: null })),
};

export function resetFakeAuth(): void {
  set(UNAVAILABLE);
  for (const fn of [
    fakeAuthClient.signIn.email,
    fakeAuthClient.signIn.social,
    fakeAuthClient.signUp.email,
    fakeAuthClient.signOut,
    fakeAuthClient.requestPasswordReset,
    fakeAuthClient.resetPassword,
    fakeAuthClient.sendVerificationEmail,
    fakeAuthClient.changePassword,
    fakeAuthClient.revokeOtherSessions,
    fakeAuthClient.deleteUser,
  ]) {
    fn.mockReset();
    fn.mockImplementation(async () => ({ data: {}, error: null }) as never);
  }
}
