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
import { signInWith, type SignInProvider } from '../services/signInMethods';
import { useNoIndex, usePageMeta } from '../utils/pageMeta';
import { t } from '../i18n';
import { rich } from '../i18n/rich';

const COOKIE_WAIT_MS = 6_000;

export default function SignUp() {
  usePageMeta(t('Create an account'), t('Create a free CarInfo account.'));
  useNoIndex();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'), '/home');
  const account = useAccount();
  const status = useAccountStatus();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'password' | 'code'>('password');
  const [pending, setPending] = useState<'password' | SignInProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = pending !== null;

  useEffect(() => {
    if (pending !== 'password') return;
    const timer = setTimeout(() => {
      setPending(null);
      setError(
        t('Account made, but this browser did not keep the sign-in. Allow cookies for this site.'),
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

  const providers = status?.providers ?? [];
  const codes = Boolean(status?.emailConfigured);

  const pick = async (provider: SignInProvider) => {
    setError(null);
    setPending(provider);
    // A provider's account is made on first sign-in; a failure lands on sign-in.
    const { error: failed } = await signInWith(provider, next, `/sign-in${withNext}`);
    if (failed) {
      setPending(null);
      setError(authErrorMessage(failed));
    }
  };

  return (
    <AuthCard
      title={t('Create a free account')}
      intro={t(
        'For your garage and the Value chart. Search, car pages, Compare and the VIN lookup stay open to everyone.',
      )}
      footer={
        <p>
          {rich(t('Already have an account? <0>Sign in</0>'), [
            (children) => (
              <Link to={`/sign-in${withNext}`} className="text-white underline">
                {children}
              </Link>
            ),
          ])}
        </p>
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
              onPick={(provider) => void pick(provider)}
            />
            <OrDivider />
          </>
        )}
        {mode === 'code' && codes ? (
          <EmailCodeForm
            initialEmail={email}
            onBack={() => setMode('password')}
            backLabel={t('Make a password instead')}
          />
        ) : (
          <>
            <AuthFormBody onSubmit={submit}>
              <Field
                label={t('Name (optional)')}
                name="name"
                autoComplete="name"
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Field
                label={t('Email')}
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Field
                label={t('Password')}
                type="password"
                name="new-password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                hint={t('At least 8 characters.')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <SubmitButton busy={busy}>
                {pending === 'password' ? t('Creating account…') : t('Create account')}
              </SubmitButton>
            </AuthFormBody>
            {codes && (
              <>
                <p className="text-xs text-zinc-500">
                  {t("We'll email you a link to confirm the address.")}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode('code');
                  }}
                  className="btn-ghost self-center"
                >
                  {t('Rather not make a password? Email me a code')}
                </button>
              </>
            )}
          </>
        )}
        <p className="text-xs text-zinc-500 leading-relaxed">
          {rich(
            t(
              'Creating an account accepts the <0>terms of use</0>; the <1>privacy policy</1> says what is kept and why.',
            ),
            [
              (children) => (
                <Link to="/terms" className="underline underline-offset-2 hover:text-zinc-300">
                  {children}
                </Link>
              ),
              (children) => (
                <Link to="/privacy" className="underline underline-offset-2 hover:text-zinc-300">
                  {children}
                </Link>
              ),
            ],
          )}
        </p>
      </div>
    </AuthCard>
  );
}
