import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import {
  AccountsUnavailable,
  AuthCard,
  AuthFormBody,
  Field,
  FormMessage,
  GoogleButton,
  OrDivider,
  SubmitButton,
} from '../components/AuthForm';
import { LoadingScreen } from '../components/ui';
import { useAccount } from '../hooks/useAccount';
import { useAccountStatus } from '../hooks/useAccountStatus';
import { authClient, authErrorMessage, safeNext } from '../services/authClient';
import { useNoIndex, usePageMeta } from '../utils/pageMeta';

/** Google's sign-in returns here with ?error= when it could not finish. */
function googleError(code: string | null): string | null {
  if (!code) return null;
  if (code === 'account_not_linked') {
    return 'That email already has a CarInfo password. Sign in with it below.';
  }
  return 'Google sign-in did not finish. Try again, or use your email and password.';
}

/** If a sign-in does not show up as a session by then, the browser did not keep the cookie. */
const COOKIE_WAIT_MS = 6_000;

export default function SignIn() {
  usePageMeta('Sign in', 'Sign in to CarInfo.');
  useNoIndex();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'), '/home');
  const account = useAccount();
  const status = useAccountStatus();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState<'password' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(() => googleError(params.get('error')));
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

  const submit = async () => {
    setError(null);
    setPending('password');
    const { error: failed } = await authClient.signIn.email({ email, password, rememberMe: true });
    if (failed) {
      setPending(null);
      setError(authErrorMessage(failed));
    }
  };

  const google = async () => {
    setError(null);
    setPending('google');
    const { error: failed } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: next,
      errorCallbackURL: `/sign-in${withNext}`,
    });
    // On success the browser is already on its way to Google.
    if (failed) {
      setPending(null);
      setError(authErrorMessage(failed));
    }
  };

  return (
    <AuthCard
      title="Sign in"
      intro="Compare, Dream Garage, Battle Mode, the Value Matrix and the VIN decoder are free with an account."
      footer={
        <>
          <p>
            New to CarInfo?{' '}
            <Link to={`/sign-up${withNext}`} className="text-white underline">
              Create a free account
            </Link>
          </p>
          {status?.emailConfigured && (
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
        {status?.googleSignIn && (
          <>
            <GoogleButton busy={busy} onClick={() => void google()} />
            <OrDivider />
          </>
        )}
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
          <SubmitButton busy={busy}>{busy ? 'Signing in…' : 'Sign in'}</SubmitButton>
        </AuthFormBody>
      </div>
    </AuthCard>
  );
}
