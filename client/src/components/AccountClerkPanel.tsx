import { useAuth, useClerk } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as accountApi from '../services/accountApi';
import { useGarageStore, FREE_GARAGE_LIMIT } from '../stores/garageStore';

/** Clerk-aware account UI — only mounted when VITE_CLERK_PUBLISHABLE_KEY is set. */
export default function AccountClerkPanel() {
  const { isSignedIn, isLoaded } = useAuth();
  const { openSignIn, openSignUp } = useClerk();
  const [params] = useSearchParams();
  const plan = useGarageStore((s) => s.plan);
  const garageCount = useGarageStore((s) => s.cars.length);
  const garageLimit = useGarageStore((s) => s.garageLimit);
  const syncMode = useGarageStore((s) => s.syncMode);
  const lastSyncError = useGarageStore((s) => s.lastSyncError);
  const syncFromCloud = useGarageStore((s) => s.syncFromCloud);

  const [billingConfigured, setBillingConfigured] = useState(false);
  const [busy, setBusy] = useState<'checkout' | 'portal' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const checkoutFlash = params.get('checkout');

  useEffect(() => {
    accountApi
      .getAccountStatus()
      .then((s) => setBillingConfigured(s.billingConfigured))
      .catch(() => setBillingConfigured(false));
  }, []);

  useEffect(() => {
    if (isSignedIn && checkoutFlash === 'success') {
      void syncFromCloud();
    }
  }, [isSignedIn, checkoutFlash, syncFromCloud]);

  const startCheckout = async () => {
    setError(null);
    setBusy('checkout');
    try {
      const { url } = await accountApi.createCheckoutSession();
      if (url) window.location.href = url;
      else setError('Checkout URL missing');
    } catch {
      setError('Could not start checkout. Check Stripe configuration.');
    } finally {
      setBusy(null);
    }
  };

  const openPortal = async () => {
    setError(null);
    setBusy('portal');
    try {
      const { url } = await accountApi.createPortalSession();
      if (url) window.location.href = url;
      else setError('Portal URL missing');
    } catch {
      setError('Could not open billing portal.');
    } finally {
      setBusy(null);
    }
  };

  const limitLabel =
    plan === 'pro' ? 'Unlimited' : `${garageLimit ?? FREE_GARAGE_LIMIT} vehicles`;

  return (
    <div className="page-wrap py-10 max-w-2xl">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">Account</h1>
        <p className="text-sm text-zinc-400 mb-8">
          Cloud garage sync and Pro unlocks. Verified EPA and NHTSA specs stay free for everyone.
        </p>

        {checkoutFlash === 'success' && (
          <div className="mb-6 border border-zinc-600 bg-zinc-950 px-4 py-3 text-sm text-zinc-200">
            Checkout complete. If Pro is not showing yet, refresh in a few seconds while Stripe confirms.
          </div>
        )}
        {checkoutFlash === 'cancel' && (
          <div className="mb-6 border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-400">
            Checkout canceled. You are still on the Free plan.
          </div>
        )}

        {!isLoaded ? (
          <p className="text-xs uppercase tracking-widest text-zinc-500">Loading…</p>
        ) : !isSignedIn ? (
          <div className="border border-zinc-800 bg-zinc-950 p-6 space-y-4">
            <p className="text-sm text-zinc-300">
              Sign in to sync your Dream Garage across devices and manage your plan.
            </p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => void openSignIn({})} className="btn-primary text-xs">
                Sign in
              </button>
              <button type="button" onClick={() => void openSignUp({})} className="btn-secondary text-xs">
                Create account
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <section className="border border-zinc-800 bg-zinc-950 p-5 space-y-3">
              <h2 className="text-xs uppercase tracking-widest text-zinc-500">Garage</h2>
              <p className="text-lg font-semibold">
                {garageCount} saved · limit {limitLabel}
              </p>
              <p className="text-sm text-zinc-400">
                {syncMode === 'cloud'
                  ? 'Signed in · synced to your account'
                  : 'Using this device only until sync succeeds'}
              </p>
              {lastSyncError && <p className="text-sm text-amber-200/90">{lastSyncError}</p>}
              <div className="flex flex-wrap gap-3 pt-2">
                <Link to="/garage" className="btn-secondary text-xs">
                  Open garage
                </Link>
                <button
                  type="button"
                  onClick={() => void syncFromCloud()}
                  className="text-xs uppercase tracking-widest text-zinc-400 hover:text-white"
                >
                  Sync now
                </button>
              </div>
            </section>

            <section className="border border-zinc-800 bg-zinc-950 p-5 space-y-4">
              <h2 className="text-xs uppercase tracking-widest text-zinc-500">Plan</h2>
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-2xl font-bold tracking-tight">{plan === 'pro' ? 'Pro' : 'Free'}</p>
                {plan === 'free' && (
                  <p className="text-sm text-zinc-400">
                    Cap: {garageLimit ?? FREE_GARAGE_LIMIT} garage vehicles
                  </p>
                )}
              </div>

              <ul className="text-sm text-zinc-400 space-y-2 list-disc list-inside">
                <li>Free: browse, dossiers, Value Matrix, garage up to {FREE_GARAGE_LIMIT}</li>
                <li>Pro: unlimited cloud garage + billing portal to manage subscription</li>
              </ul>

              {error && <p className="text-sm text-red-300">{error}</p>}

              {plan === 'free' ? (
                <button
                  type="button"
                  disabled={!billingConfigured || busy !== null}
                  onClick={() => void startCheckout()}
                  className={`btn-primary text-xs ${!billingConfigured ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {busy === 'checkout' ? 'Redirecting…' : 'Upgrade to Pro'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!billingConfigured || busy !== null}
                  onClick={() => void openPortal()}
                  className="btn-secondary text-xs"
                >
                  {busy === 'portal' ? 'Opening…' : 'Manage billing'}
                </button>
              )}

              {!billingConfigured && (
                <p className="text-xs text-zinc-500">
                  Billing is not configured on this deployment yet (Stripe env vars missing).
                </p>
              )}
            </section>
          </div>
        )}
      </div>
  );
}
