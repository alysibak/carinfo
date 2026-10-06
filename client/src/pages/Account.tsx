import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AccountsUnavailable,
  AuthFormBody,
  Field,
  FormMessage,
  SubmitButton,
} from '../components/AuthForm';
import { LoadingScreen } from '../components/ui';
import { signOut, useAccount } from '../hooks/useAccount';
import { useAccountStatus } from '../hooks/useAccountStatus';
import * as accountApi from '../services/accountApi';
import { authClient, authErrorMessage, type AuthSession } from '../services/authClient';
import { FREE_GARAGE_LIMIT, useGarageStore } from '../stores/garageStore';
import { useNoIndex, usePageMeta } from '../utils/pageMeta';

export default function AccountPage() {
  usePageMeta('Account', 'Your CarInfo account, garage and plan.');
  useNoIndex();
  const account = useAccount();
  const { search } = useLocation();

  if (account.kind === 'loading') return <LoadingScreen label="Loading account" />;
  if (account.kind === 'unavailable') return <AccountsUnavailable />;
  if (account.kind === 'signed-out') {
    return <Navigate to={`/sign-in?next=${encodeURIComponent(`/account${search}`)}`} replace />;
  }
  return <AccountPanel session={account.session} />;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border border-zinc-800 bg-zinc-950 p-5 flex flex-col gap-3">
      <h2 className="text-xs text-zinc-500">{title}</h2>
      {children}
    </section>
  );
}

function AccountPanel({ session }: { session: AuthSession }) {
  const { user } = session;
  const status = useAccountStatus();
  const hasPassword = useHasPassword();
  const [params] = useSearchParams();
  const checkoutFlash = params.get('checkout');
  const syncFromCloud = useGarageStore((s) => s.syncFromCloud);

  // Pro arrives by Stripe's webhook, a moment after checkout returns here.
  useEffect(() => {
    if (checkoutFlash === 'success') void syncFromCloud();
  }, [checkoutFlash, syncFromCloud]);

  return (
    <div className="page-wrap py-10 max-w-2xl">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">Account</h1>
      <p className="text-sm text-zinc-400 mb-8">
        Signed in as <span className="text-zinc-200">{user.email}</span>
      </p>

      {checkoutFlash === 'success' && (
        <div className="mb-6 border border-zinc-600 bg-zinc-950 px-4 py-3 text-sm text-zinc-200">
          Checkout complete. If Pro is not showing yet, refresh in a few seconds while Stripe
          confirms.
        </div>
      )}
      {checkoutFlash === 'cancel' && (
        <div className="mb-6 border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-400">
          Checkout canceled. Nothing was charged.
        </div>
      )}

      <div className="flex flex-col gap-6">
        {status?.emailConfigured && !user.emailVerified && <ConfirmEmail email={user.email} />}
        <GarageSection />
        <PlanSection billingConfigured={Boolean(status?.billingConfigured)} />
        <SignInSection email={user.email} hasPassword={hasPassword} />
        <DeleteSection email={user.email} hasPassword={hasPassword} />
      </div>
    </div>
  );
}

function ConfirmEmail({ email }: { email: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | string>('idle');
  const resend = async () => {
    setState('busy');
    const { error } = await authClient.sendVerificationEmail({ email, callbackURL: '/account' });
    setState(error ? authErrorMessage(error) : 'sent');
  };
  return (
    <Section title="Confirm your email">
      <p className="text-sm text-zinc-300">
        We sent a link to {email}. Confirming it lets you reset a forgotten password, and brings
        over a garage or plan from an account you made here before.
      </p>
      {state === 'sent' ? (
        <FormMessage tone="ok">Sent. Check your inbox.</FormMessage>
      ) : (
        <div>
          <button
            type="button"
            disabled={state === 'busy'}
            onClick={() => void resend()}
            className="btn-secondary text-xs"
          >
            {state === 'busy' ? 'Sending…' : 'Send the link again'}
          </button>
          {state !== 'idle' && state !== 'busy' && (
            <p className="mt-2 text-sm text-red-300">{state}</p>
          )}
        </div>
      )}
    </Section>
  );
}

function GarageSection() {
  const plan = useGarageStore((s) => s.plan);
  const garageCount = useGarageStore((s) => s.cars.length);
  const garageLimit = useGarageStore((s) => s.garageLimit);
  const syncMode = useGarageStore((s) => s.syncMode);
  const lastSyncError = useGarageStore((s) => s.lastSyncError);
  const syncFromCloud = useGarageStore((s) => s.syncFromCloud);
  const limitLabel = plan === 'pro' ? 'no limit' : `up to ${garageLimit ?? FREE_GARAGE_LIMIT}`;

  return (
    <Section title="Dream Garage">
      <p className="text-lg font-semibold">
        {garageCount} saved · {limitLabel}
      </p>
      <p className="text-sm text-zinc-400">
        {syncMode === 'cloud'
          ? 'Saved to your account, on every device you sign in on.'
          : 'On this device only until it syncs.'}
      </p>
      {lastSyncError && <p className="text-sm text-amber-200/90">{lastSyncError}</p>}
      <div className="flex flex-wrap gap-3 pt-1">
        <Link to="/garage" className="btn-secondary text-xs">
          Open garage
        </Link>
        <button
          type="button"
          onClick={() => void syncFromCloud()}
          className="text-xs text-zinc-400 hover:text-white"
        >
          Sync now
        </button>
      </div>
    </Section>
  );
}

/** Pro is shown only where it can be bought, or to someone who has it. */
function PlanSection({ billingConfigured }: { billingConfigured: boolean }) {
  const plan = useGarageStore((s) => s.plan);
  const [busy, setBusy] = useState<'checkout' | 'portal' | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!billingConfigured && plan !== 'pro') return null;

  const go = async (kind: 'checkout' | 'portal') => {
    setError(null);
    setBusy(kind);
    try {
      const { url } =
        kind === 'checkout'
          ? await accountApi.createCheckoutSession()
          : await accountApi.createPortalSession();
      if (url) window.location.href = url;
      else setError('Billing did not answer. Try again.');
    } catch {
      setError(
        kind === 'checkout' ? 'Could not start checkout. Try again.' : 'Could not open billing.',
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <Section title="Plan">
      <p className="text-2xl font-bold tracking-tight">{plan === 'pro' ? 'Pro' : 'Free'}</p>
      <ul className="text-sm text-zinc-400 flex flex-col gap-1.5 list-disc list-inside">
        <li>Free: every tool, and a garage of up to {FREE_GARAGE_LIMIT} cars</li>
        <li>Pro: a garage with no limit</li>
      </ul>
      {error && <p className="text-sm text-red-300">{error}</p>}
      {billingConfigured && (
        <div>
          {plan === 'free' ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void go('checkout')}
              className="btn-primary text-xs"
            >
              {busy === 'checkout' ? 'Redirecting…' : 'Upgrade to Pro'}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void go('portal')}
              className="btn-secondary text-xs"
            >
              {busy === 'portal' ? 'Opening…' : 'Manage billing'}
            </button>
          )}
        </div>
      )}
    </Section>
  );
}

/** Whether this account has a password (else it signs in with Google). */
function useHasPassword(): boolean | undefined {
  const [hasPassword, setHasPassword] = useState<boolean>();
  useEffect(() => {
    let live = true;
    void authClient.listAccounts().then(({ data }) => {
      if (live) setHasPassword(Boolean(data?.some((a) => a.providerId === 'credential')));
    });
    return () => {
      live = false;
    };
  }, []);
  return hasPassword;
}

/** Tells password managers which account a password form is for. */
function UsernameHint({ email }: { email: string }) {
  return (
    <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
  );
}

function SignInSection({
  email,
  hasPassword,
}: {
  email: string;
  hasPassword: boolean | undefined;
}) {
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState<'password' | 'devices' | 'out' | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const changePassword = async () => {
    setMessage(null);
    setBusy('password');
    const { error } = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: true,
    });
    setBusy(null);
    if (error) {
      setMessage({ tone: 'error', text: authErrorMessage(error) });
      return;
    }
    setCurrent('');
    setNext('');
    setMessage({ tone: 'ok', text: 'Password changed. Other devices have been signed out.' });
  };

  const signOutOthers = async () => {
    setMessage(null);
    setBusy('devices');
    const { error } = await authClient.revokeOtherSessions();
    setBusy(null);
    setMessage(
      error
        ? { tone: 'error', text: authErrorMessage(error) }
        : { tone: 'ok', text: 'Signed out everywhere but here.' },
    );
  };

  return (
    <Section title="Sign-in">
      {message && <FormMessage tone={message.tone}>{message.text}</FormMessage>}
      {hasPassword === false && <p className="text-sm text-zinc-300">You sign in with Google.</p>}
      {hasPassword && (
        <AuthFormBody onSubmit={changePassword}>
          <UsernameHint email={email} />
          <Field
            label="Current password"
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
          <Field
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            hint="At least 8 characters. Other devices are signed out."
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          <div>
            <SubmitButton busy={busy === 'password'}>
              {busy === 'password' ? 'Saving…' : 'Change password'}
            </SubmitButton>
          </div>
        </AuthFormBody>
      )}
      <div className="flex flex-wrap gap-3 pt-1">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => {
            setBusy('out');
            void signOut().then(() => navigate('/'));
          }}
          className="btn-secondary text-xs"
        >
          Sign out
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void signOutOthers()}
          className="text-xs text-zinc-400 hover:text-white"
        >
          {busy === 'devices' ? 'Signing out…' : 'Sign out of other devices'}
        </button>
      </div>
    </Section>
  );
}

function DeleteSection({
  email,
  hasPassword,
}: {
  email: string;
  hasPassword: boolean | undefined;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    setError(null);
    setBusy(true);
    const { error: failed } = await authClient.deleteUser(hasPassword ? { password } : {});
    setBusy(false);
    if (failed) {
      setError(authErrorMessage(failed));
      return;
    }
    useGarageStore.getState().forgetAccountGarage();
    navigate('/');
  };

  return (
    <Section title="Delete account">
      {!open ? (
        <div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs text-zinc-400 hover:text-red-400"
          >
            Delete my account…
          </button>
        </div>
      ) : (
        <AuthFormBody onSubmit={remove}>
          <p className="text-sm text-zinc-300">
            This deletes your sign-in and your saved garage for good.
          </p>
          {error && <FormMessage>{error}</FormMessage>}
          {hasPassword && <UsernameHint email={email} />}
          {hasPassword && (
            <Field
              label="Your password, to confirm"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={busy || hasPassword === undefined}
              className="inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 text-xs font-semibold bg-red-700 hover:bg-red-600 text-white transition-colors disabled:opacity-60 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-red-400"
            >
              {busy ? 'Deleting…' : 'Delete my account'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary text-xs">
              Keep it
            </button>
          </div>
        </AuthFormBody>
      )}
    </Section>
  );
}
