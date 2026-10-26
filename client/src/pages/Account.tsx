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
import { PROVIDER_NAMES, type SignInProvider } from '../services/signInMethods';
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
    <section className="border border-zinc-800 bg-zinc-950 card-sheen p-5 flex flex-col gap-3">
      {/* A heading that reads as one: each box's name was 12px and grey. */}
      <h2 className="block-title">{title}</h2>
      {children}
    </section>
  );
}

function AccountPanel({ session }: { session: AuthSession }) {
  const { user } = session;
  const status = useAccountStatus();
  const { hasPassword, linked } = useSignInMethods();
  const [params] = useSearchParams();
  const checkoutFlash = params.get('checkout');
  const syncFromCloud = useGarageStore((s) => s.syncFromCloud);

  // Pro arrives by Stripe's webhook, a moment after checkout returns here.
  useEffect(() => {
    if (checkoutFlash === 'success') void syncFromCloud();
  }, [checkoutFlash, syncFromCloud]);

  return (
    <div className="page-wrap py-10 max-w-2xl">
      <h1 className="page-title mb-2">Account</h1>
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
        <SignInSection email={user.email} hasPassword={hasPassword} linked={linked} />
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
            className="btn-secondary"
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
    <Section title="Your garage">
      <p className="text-[15px] text-zinc-200 tabular-nums">
        {garageCount} saved · {limitLabel}
      </p>
      <p className="text-sm text-zinc-400">
        {syncMode === 'cloud'
          ? 'Saved to your account, on every device you sign in on.'
          : 'On this device only until it syncs.'}
      </p>
      {lastSyncError && <p className="text-sm text-amber-200/90">{lastSyncError}</p>}
      <div className="flex flex-wrap gap-3 pt-1">
        <Link to="/garage" className="btn-secondary">
          Open garage
        </Link>
        <button
          type="button"
          onClick={() => void syncFromCloud()}
          className="inline-flex items-center min-h-[44px] text-sm text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-600 hover:decoration-zinc-300"
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
              className="btn-primary"
            >
              {busy === 'checkout' ? 'Redirecting…' : 'Upgrade to Pro'}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void go('portal')}
              className="btn-secondary"
            >
              {busy === 'portal' ? 'Opening…' : 'Manage billing'}
            </button>
          )}
        </div>
      )}
    </Section>
  );
}

/**
 * How this account signs in: whether it has a password, and the accounts
 * (Google, Apple, Microsoft) joined to it. Undefined until known.
 */
function useSignInMethods(): { hasPassword: boolean | undefined; linked: string[] } {
  const [methods, setMethods] = useState<{ hasPassword: boolean | undefined; linked: string[] }>({
    hasPassword: undefined,
    linked: [],
  });
  useEffect(() => {
    let live = true;
    void authClient.listAccounts().then(({ data }) => {
      if (!live) return;
      const ids = (data ?? []).map((a) => a.providerId);
      setMethods({
        hasPassword: ids.includes('credential'),
        linked: ids.flatMap((id) =>
          id in PROVIDER_NAMES ? [PROVIDER_NAMES[id as SignInProvider]] : [],
        ),
      });
    });
    return () => {
      live = false;
    };
  }, []);
  return methods;
}

/** "Google", "Google or Apple", "Google, Apple or Microsoft". */
function orList(names: string[]): string {
  return names.length < 2
    ? (names[0] ?? '')
    : `${names.slice(0, -1).join(', ')} or ${names.at(-1)}`;
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
  linked,
}: {
  email: string;
  hasPassword: boolean | undefined;
  linked: string[];
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
      {hasPassword === false && (
        <p className="text-sm text-zinc-300">
          This account has no password: you sign in with{' '}
          {linked.length ? orList(linked) : 'a code by email'}.
        </p>
      )}
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
          className="btn-secondary"
        >
          Sign out
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void signOutOthers()}
          className="inline-flex items-center min-h-[44px] text-sm text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-600 hover:decoration-zinc-300"
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
  // Without a password, deleting needs a sign-in from the last day.
  const [stale, setStale] = useState(false);

  const remove = async () => {
    setError(null);
    setBusy(true);
    const { error: failed } = await authClient.deleteUser(hasPassword ? { password } : {});
    setBusy(false);
    if (failed) {
      if (failed.code === 'SESSION_EXPIRED' || failed.code === 'SESSION_NOT_FRESH') {
        setStale(true);
        return;
      }
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
            className="inline-flex items-center min-h-[44px] text-sm text-zinc-300 hover:text-red-300 underline underline-offset-4 decoration-zinc-600 hover:decoration-red-400"
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
          {stale && (
            <div className="flex flex-col gap-3">
              <FormMessage>
                To confirm it&apos;s you, sign in again, then come back here to delete the account.
              </FormMessage>
              <button
                type="button"
                onClick={() => {
                  void signOut().then(() => navigate('/sign-in?next=%2Faccount'));
                }}
                className="btn-secondary self-start"
              >
                Sign in again
              </button>
            </div>
          )}
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
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
              Keep it
            </button>
          </div>
        </AuthFormBody>
      )}
    </Section>
  );
}
