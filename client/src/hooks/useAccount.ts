import { authClient, type AuthSession } from '../services/authClient';

export type AccountState =
  | { kind: 'loading' }
  /** Accounts are not set up here, or the server could not be asked: nothing is gated. */
  | { kind: 'unavailable' }
  | { kind: 'signed-out' }
  | { kind: 'signed-in'; session: AuthSession; refetch: () => Promise<void> };

/** The visitor's sign-in, from the session every component shares. */
export function useAccount(): AccountState {
  const { data, isPending, error, refetch } = authClient.useSession();
  if (isPending) return { kind: 'loading' };
  // 503 when the server has no accounts configured; any other failure also
  // leaves the site open rather than locking people out of the tools.
  if (error) return { kind: 'unavailable' };
  if (!data) return { kind: 'signed-out' };
  return { kind: 'signed-in', session: data, refetch: async () => void (await refetch()) };
}

/** Sign out here, and forget the account's garage on this device. */
export async function signOut(): Promise<void> {
  await authClient.signOut();
  // Imported here, not at the top: the store is in the entry chunk and this
  // module is not.
  const { useGarageStore } = await import('../stores/garageStore');
  useGarageStore.getState().forgetAccountGarage();
}

/** `?next=` for a sign-in link from here, unless here is itself a sign-in page. */
export function nextParam(pathname: string, search: string): string {
  if (/^\/(sign-in|sign-up|forgot-password|reset-password)\b/.test(pathname)) return '';
  return `?next=${encodeURIComponent(pathname + search)}`;
}
