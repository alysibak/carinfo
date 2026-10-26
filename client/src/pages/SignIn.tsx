import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import {
  AccountsUnavailable,
  AuthCard,
  AuthFormBody,
  Field,
  FormMessage,
  OrDivider,
  ProviderButtons,
  SubmitButton,
} from '../components/AuthForm';
import EmailCodeForm from '../components/EmailCodeForm';
import { LoadingScreen } from '../components/ui';
import { useAccount } from '../hooks/useAccount';
import { useAccountStatus } from '../hooks/useAccountStatus';
import { authClient, authErrorMessage, safeNext } from '../services/authClient';
import {
  lastSignInMethod,
  providerError,
  signInWith,
  type SignInProvider,
} from '../services/signInMethods';
import { useNoIndex, usePageMeta } from '../utils/pageMeta';

/** If a sign-in does not show up as a session by then, the browser did not keep the cookie. */
const COOKIE_WAIT_MS = 6_000;

export default function SignIn() {
  usePageMeta('Sign in', 'Sign in to CarInfo.');
  useNoIndex();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'), '/home');
  const account = useAccount();
  const status = useAccountStatus();
  const [last] = useState(lastSignInMethod);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // A code when asked for (?code=1, from sign-up) or last used here.
  const [mode, setMode] = useState<'password' | 'code'>(() =>
    params.get('code') === '1' || last === 'email-otp' ? 'code' : 'password',
  );
  const [pending, setPending] = useState<'password' | SignInProvider | null>(null);
  const [error, setError] = useState<string | null>(() =>
    providerError(params.get('error'), params.get('via')),
  );
  const busy = pending !== null;

  // A successful sign-in shows up as a session, which redirects below.
  useEffect(() => {
    if (pending !== 'password') return;
    const timer = setTimeout(() => {
      setPending(null);
      setError(
        'Signed in, but this browser did not keep the sign-in. Allow cookies for this site.',
      );
    }, COOKIE_WAIT_MS);
    return () => clearTimeout(timer);
  }, [pending]);

  if (account.kind === 'signed-in') return <Navigate to={next} replace />;
  if (account.kind === 'unavailable') return <AccountsUnavailable />;
  if (account.kind === 'loading') return <LoadingScreen />;

  const withNext = params.get('next') ? `?next=${encodeURIComponent(next)}` : '';
  const providers = status?.providers ?? [];
  const codes = Boolean(status?.emailConfigured);

  const submit = async () => {
    setError(null);
    setPending('password');
    const { error: failed } = await authClient.signIn.email({ email, password, rememberMe: true });
    if (failed) {
      setPending(null);
      setError(authErrorMessage(failed));
    }
  };

  const pick = async (provider: SignInProvider) => {
    setError(null);
    setPending(provider);
    const { error: failed } = await signInWith(provider, next, `/sign-in${withNext}`);
    // On success the browser is already on its way to the provider.
    if (failed) {
      setPending(null);
      setError(authErrorMessage(failed));
    }
  };

  return (
    <AuthCard
      title="Sign in"
      intro="Your garage and the Value chart are free with an account."
      footer={
        <>
          <p>
            New to CarInfo?{' '}
            <Link to={`/sign-up${withNext}`} className="text-white underline">
              Create a free account
            </Link>
          </p>
          {codes && mode === 'password' && (
            <p>
              <Link to="/forgot-password" className="text-zinc-300 hover:text-white underline">
                Forgot your password?
              </Link>
            </p>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <FormMessage>{error}</FormMessage>}
        {providers.length > 0 && (
          <>
            <ProviderButtons
              providers={providers}
              busy={busy}
              pending={pending === 'password' ? null : pending}
              last={last}
              onPick={(provider) => void pick(provider)}
            />
            <OrDivider />
          </>
        )}
        {mode === 'code' && codes ? (
          <EmailCodeForm initialEmail={email} onBack={() => setMode('password')} />
        ) : (
          <>
            <AuthFormBody onSubmit={submit}>
              <Field
                label="Email"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Field
                label="Password"
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <SubmitButton busy={busy}>
                {pending === 'password' ? 'Signing in…' : 'Sign in'}
              </SubmitButton>
            </AuthFormBody>
            {codes && (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('code');
                }}
                className="btn-ghost self-center"
              >
                No password? Email me a code
              </button>
            )}
          </>
        )}
      </div>
    </AuthCard>
  );
}
