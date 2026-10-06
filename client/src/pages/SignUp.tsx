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

const COOKIE_WAIT_MS = 6_000;

export default function SignUp() {
  usePageMeta('Create an account', 'Create a free CarInfo account.');
  useNoIndex();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'), '/home');
  const account = useAccount();
  const status = useAccountStatus();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState<'password' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = pending !== null;

  useEffect(() => {
    if (pending !== 'password') return;
    const timer = setTimeout(() => {
      setPending(null);
      setError(
        'Account made, but this browser did not keep the sign-in. Allow cookies for this site.',
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
    const { error: failed } = await authClient.signUp.email({
      email,
      password,
      name: name.trim() || email.split('@')[0],
    });
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
    if (failed) {
      setPending(null);
      setError(authErrorMessage(failed));
    }
  };

  return (
    <AuthCard
      title="Create a free account"
      intro="For Compare, Dream Garage, Battle Mode, the Value Matrix and the VIN decoder. Car pages and search stay open to everyone."
      footer={
        <p>
          Already have an account?{' '}
          <Link to={`/sign-in${withNext}`} className="text-white underline">
            Sign in
          </Link>
        </p>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <FormMessage>{error}</FormMessage>}
        {status?.googleSignIn && (
          <>
            <GoogleButton busy={busy} onClick={() => void google()}>
              Sign up with Google
            </GoogleButton>
            <OrDivider />
          </>
        )}
        <AuthFormBody onSubmit={submit}>
          <Field
            label="Name (optional)"
            name="name"
            autoComplete="name"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
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
            name="new-password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            hint="At least 8 characters."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <SubmitButton busy={busy}>{busy ? 'Creating account…' : 'Create account'}</SubmitButton>
        </AuthFormBody>
        {status?.emailConfigured && (
          <p className="text-xs text-zinc-500">
            We&apos;ll email you a link to confirm the address.
          </p>
        )}
      </div>
    </AuthCard>
  );
}
