import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthCard, AuthFormBody, Field, FormMessage, SubmitButton } from '../components/AuthForm';
import { LoadingScreen } from '../components/ui';
import { useAccountStatus } from '../hooks/useAccountStatus';
import { authClient, authErrorMessage } from '../services/authClient';
import { PROVIDER_NAMES } from '../services/signInMethods';
import { useNoIndex, usePageMeta } from '../utils/pageMeta';
import { t } from '../i18n';
import { rich } from '../i18n/rich';

export default function ForgotPassword() {
  usePageMeta(t('Reset your password'), t('Reset your CarInfo password.'));
  useNoIndex();
  const status = useAccountStatus();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === undefined) return <LoadingScreen />;

  const back = (
    <p>
      <Link to="/sign-in" className="text-white underline">
        {t('Back to sign in')}
      </Link>
    </p>
  );

  if (!status?.emailConfigured) {
    const providers = status?.providers ?? [];
    const providerNames = providers.map((p) => PROVIDER_NAMES[p]).join(` ${t('or')} `);
    return (
      <AuthCard title={t('Reset your password')} footer={back}>
        <p className="text-sm text-zinc-300 leading-relaxed">
          {providers.length
            ? t(
                "Password reset by email isn't available on this site yet. If you signed up with {providers}, sign in with it instead.",
                { providers: providerNames },
              )
            : t("Password reset by email isn't available on this site yet.")}
        </p>
      </AuthCard>
    );
  }

  const submit = async () => {
    setError(null);
    setBusy(true);
    const { error: failed } = await authClient.requestPasswordReset({
      email,
      redirectTo: '/reset-password',
    });
    setBusy(false);
    if (failed) setError(authErrorMessage(failed));
    else setSent(true);
  };

  return (
    <AuthCard
      title={t('Reset your password')}
      intro={t("Enter the email you signed up with. We'll send a link to choose a new password.")}
      footer={
        <>
          <p>
            {rich(t('Or skip the password: <0>sign in with a code by email</0>'), [
              (children) => (
                <Link to="/sign-in?code=1" className="text-white underline">
                  {children}
                </Link>
              ),
            ])}
          </p>
          {back}
        </>
      }
    >
      {sent ? (
        <FormMessage tone="ok">
          {t('If an account uses {email}, a reset link is on its way. It works for one hour.', {
            email,
          })}
        </FormMessage>
      ) : (
        <AuthFormBody onSubmit={submit}>
          {error && <FormMessage>{error}</FormMessage>}
          <Field
            label={t('Email')}
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <SubmitButton busy={busy}>{busy ? t('Sending…') : t('Send reset link')}</SubmitButton>
        </AuthFormBody>
      )}
    </AuthCard>
  );
}
