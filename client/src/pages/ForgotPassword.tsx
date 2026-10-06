import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthCard, AuthFormBody, Field, FormMessage, SubmitButton } from '../components/AuthForm';
import { LoadingScreen } from '../components/ui';
import { useAccountStatus } from '../hooks/useAccountStatus';
import { authClient, authErrorMessage } from '../services/authClient';
import { useNoIndex, usePageMeta } from '../utils/pageMeta';

export default function ForgotPassword() {
  usePageMeta('Reset your password', 'Reset your CarInfo password.');
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
        Back to sign in
      </Link>
    </p>
  );

  if (!status?.emailConfigured) {
    return (
      <AuthCard title="Reset your password" footer={back}>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Password reset by email isn&apos;t available on this site yet.
          {status?.googleSignIn
            ? ' If you signed up with Google, sign in with Google instead.'
            : ''}
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
      title="Reset your password"
      intro="Enter the email you signed up with. We'll send a link to choose a new password."
      footer={back}
    >
      {sent ? (
        <FormMessage tone="ok">
          If an account uses {email}, a reset link is on its way. It works for one hour.
        </FormMessage>
      ) : (
        <AuthFormBody onSubmit={submit}>
          {error && <FormMessage>{error}</FormMessage>}
          <Field
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <SubmitButton busy={busy}>{busy ? 'Sending…' : 'Send reset link'}</SubmitButton>
        </AuthFormBody>
      )}
    </AuthCard>
  );
}
