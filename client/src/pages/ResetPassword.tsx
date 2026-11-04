import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthCard, AuthFormBody, Field, FormMessage, SubmitButton } from '../components/AuthForm';
import { authClient, authErrorMessage } from '../services/authClient';
import { useNoIndex, usePageMeta } from '../utils/pageMeta';
import { t } from '../i18n';

/** Where the emailed reset link lands, with ?token= (or ?error= when it is spent). */
export default function ResetPassword() {
  usePageMeta(t('Choose a new password'), t('Choose a new CarInfo password.'));
  useNoIndex();
  const [params] = useSearchParams();
  const token = params.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token || params.get('error')) {
    return (
      <AuthCard
        title={t('This link has expired')}
        footer={
          <p>
            <Link to="/forgot-password" className="text-white underline">
              {t('Send a new link')}
            </Link>
          </p>
        }
      >
        <p className="text-sm text-zinc-300">
          {t('Reset links work once, for one hour. Ask for a new one.')}
        </p>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard title={t('Password changed')}>
        <div className="flex flex-col gap-4">
          <FormMessage tone="ok">
            {t('Your new password is set, and other devices have been signed out.')}
          </FormMessage>
          <Link to="/sign-in" className="btn-primary w-full">
            {t('Sign in')}
          </Link>
        </div>
      </AuthCard>
    );
  }

  const submit = async () => {
    if (password !== confirm) {
      setError(t('The two passwords are not the same.'));
      return;
    }
    setError(null);
    setBusy(true);
    const { error: failed } = await authClient.resetPassword({ newPassword: password, token });
    setBusy(false);
    if (failed) setError(authErrorMessage(failed));
    else setDone(true);
  };

  return (
    <AuthCard title={t('Choose a new password')}>
      <AuthFormBody onSubmit={submit}>
        {error && <FormMessage>{error}</FormMessage>}
        <Field
          label={t('New password')}
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
        <Field
          label={t('New password, again')}
          type="password"
          name="confirm-password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <SubmitButton busy={busy}>{busy ? t('Saving…') : t('Set new password')}</SubmitButton>
      </AuthFormBody>
    </AuthCard>
  );
}
