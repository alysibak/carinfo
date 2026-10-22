import { useEffect, useState } from 'react';
import { authClient, authErrorMessage } from '../services/authClient';
import { AuthFormBody, Field, FormMessage, SubmitButton } from './AuthForm';

const CODE_LENGTH = 6;

/** If a sign-in does not show up as a session by then, the browser did not keep the cookie. */
const COOKIE_WAIT_MS = 6_000;

/**
 * Sign in with a code sent by email: no password to make or remember. The
 * first code to a new address makes the account. A successful sign-in shows
 * up as a session, which the page around this redirects on.
 */
export default function EmailCodeForm({
  initialEmail = '',
  onBack,
  backLabel = 'Use a password instead',
}: {
  initialEmail?: string;
  onBack?: () => void;
  backLabel?: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState<'send' | 'verify' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (busy !== 'verify') return;
    const timer = setTimeout(() => {
      setBusy(null);
      setError(
        'Signed in, but this browser did not keep the sign-in. Allow cookies for this site.',
      );
    }, COOKIE_WAIT_MS);
    return () => clearTimeout(timer);
  }, [busy]);

  const send = async () => {
    setError(null);
    setBusy('send');
    const { error: failed } = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: 'sign-in',
    });
    setBusy(null);
    if (failed) {
      setError(authErrorMessage(failed));
      return;
    }
    setCode('');
    setStage('code');
    setNotice(`We emailed a ${CODE_LENGTH}-digit code to ${email}. It works for 10 minutes.`);
  };

  const verify = async (otp = code) => {
    if (busy) return;
    setError(null);
    setBusy('verify');
    const { error: failed } = await authClient.signIn.emailOtp({
      email,
      otp,
      // Only used when the code makes a new account.
      name: email.split('@')[0],
    });
    if (failed) {
      setBusy(null);
      setError(authErrorMessage(failed));
    }
  };

  if (stage === 'email') {
    return (
      <div className="flex flex-col gap-4">
        {error && <FormMessage>{error}</FormMessage>}
        <AuthFormBody onSubmit={send}>
          <Field
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            hint="We'll email you a code to sign in with. New here? This makes your account."
          />
          <SubmitButton busy={busy !== null}>
            {busy === 'send' ? 'Sending…' : 'Email me a code'}
          </SubmitButton>
        </AuthFormBody>
        {onBack && (
          <button type="button" onClick={onBack} className="btn-ghost self-center">
            {backLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <FormMessage>{error}</FormMessage>
      ) : (
        notice && <FormMessage tone="ok">{notice}</FormMessage>
      )}
      <AuthFormBody onSubmit={() => verify()}>
        <Field
          label="Code"
          name="code"
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern={`[0-9]{${CODE_LENGTH}}`}
          maxLength={CODE_LENGTH}
          required
          autoFocus
          value={code}
          onChange={(e) => {
            // Pasted as "123 456" or "123-456", it is still the code.
            const digits = e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH);
            setCode(digits);
            if (digits.length === CODE_LENGTH) void verify(digits);
          }}
          className="tracking-[0.4em]"
        />
        <SubmitButton busy={busy !== null}>
          {busy === 'verify' ? 'Signing in…' : 'Sign in'}
        </SubmitButton>
      </AuthFormBody>
      <div className="flex flex-wrap justify-center gap-x-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void send()}
          className="btn-ghost"
        >
          Send a new code
        </button>
        <button
          type="button"
          onClick={() => {
            setStage('email');
            setError(null);
          }}
          className="btn-ghost"
        >
          Use a different email
        </button>
      </div>
    </div>
  );
}
