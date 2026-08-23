import { useAuth, useClerk, useUser } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { setAccountAuthTokenGetter } from '../services/accountApi';
import { useGarageStore } from '../stores/garageStore';

/** Wires Clerk session tokens into account API calls and syncs garage on sign-in. */
export function AccountSyncBridge() {
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (!isSignedIn) {
      setAccountAuthTokenGetter(null);
      useGarageStore.getState().detachCloud();
      return;
    }

    setAccountAuthTokenGetter(async () => {
      try {
        return (await getToken()) ?? null;
      } catch {
        return null;
      }
    });

    void useGarageStore.getState().syncFromCloud();
  }, [isSignedIn, getToken, user?.id]);

  return null;
}

export function AuthHeaderControls({ onNavigate }: { onNavigate?: () => void }) {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { openSignIn, openSignUp, signOut } = useClerk();
  const plan = useGarageStore((s) => s.plan);
  const syncMode = useGarageStore((s) => s.syncMode);

  if (!isLoaded) {
    return <span className="text-[10px] uppercase tracking-widest text-zinc-600">…</span>;
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            void openSignIn({});
          }}
          className="text-[10px] uppercase tracking-widest text-zinc-400 hover:text-white transition-colors px-2 py-1"
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            void openSignUp({});
          }}
          className="text-[10px] uppercase tracking-widest bg-white text-black px-2.5 py-1.5 hover:bg-zinc-200 transition-colors"
        >
          Sign up
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        to="/account"
        onClick={onNavigate}
        className="hidden sm:inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-zinc-400 hover:text-white transition-colors px-2 py-1"
        title={user?.primaryEmailAddress?.emailAddress ?? 'Account'}
      >
        {plan === 'pro' ? (
          <span className="border border-zinc-500 text-zinc-200 px-1.5 py-0.5">Pro</span>
        ) : (
          <span className="text-zinc-500">Free</span>
        )}
        <span className="max-w-[7rem] truncate">
          {user?.firstName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'Account'}
        </span>
        {syncMode === 'cloud' && <span className="text-zinc-600">· synced</span>}
      </Link>
      <Link
        to="/account"
        onClick={onNavigate}
        className="sm:hidden text-[10px] uppercase tracking-widest text-zinc-400 hover:text-white px-2 py-1"
      >
        Account
      </Link>
      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          void signOut();
        }}
        className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-white transition-colors px-2 py-1"
      >
        Sign out
      </button>
    </div>
  );
}

/** Soft CTA when Clerk is not configured / user is anonymous. */
export function SignInPromptBanner() {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) return null;

  const { isSignedIn, isLoaded } = useAuth();
  const { openSignIn } = useClerk();
  const syncMode = useGarageStore((s) => s.syncMode);

  if (!isLoaded || isSignedIn || syncMode === 'cloud') return null;

  return (
    <div className="border border-zinc-800 bg-zinc-950 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <p className="text-sm text-zinc-400">
        Saved on this device only.{' '}
        <span className="text-zinc-200">Sign in to keep your garage across devices.</span>
      </p>
      <button
        type="button"
        onClick={() => void openSignIn({})}
        className="shrink-0 text-xs uppercase tracking-widest bg-white text-black px-4 py-2 hover:bg-zinc-200"
      >
        Sign in
      </button>
    </div>
  );
}
