import type { FormEvent, InputHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** The frame every sign-in page shares: a heading, a line, the form, links below. */
export function AuthCard({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="page-wrap py-10 sm:py-16">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">{title}</h1>
        {intro && <div className="text-sm text-zinc-400 leading-relaxed mb-8">{intro}</div>}
        <div className="border border-zinc-800 bg-zinc-950 p-5 sm:p-6">{children}</div>
        {footer && <div className="mt-6 text-sm text-zinc-400 space-y-2">{footer}</div>}
      </div>
    </div>
  );
}

export function AuthFormBody({
  onSubmit,
  children,
}: {
  onSubmit: () => void | Promise<void>;
  children: ReactNode;
}) {
  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        void onSubmit();
      }}
      className="flex flex-col gap-4"
    >
      {children}
    </form>
  );
}

export function Field({
  label,
  hint,
  ...input
}: {
  label: string;
  hint?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input
        {...input}
        className="mt-1.5 block w-full h-12 bg-black border border-zinc-700 focus:border-zinc-300 px-3 text-base text-white placeholder:text-zinc-500 focus:outline-hidden rounded-none transition-colors"
      />
      {hint && <span className="block mt-1.5 text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

export function FormMessage({
  tone = 'error',
  children,
}: {
  tone?: 'error' | 'ok';
  children: ReactNode;
}) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={
        tone === 'error'
          ? 'text-sm text-red-300 border border-red-900/60 bg-red-950/30 px-3 py-2'
          : 'text-sm text-zinc-200 border border-zinc-700 bg-black px-3 py-2'
      }
    >
      {children}
    </p>
  );
}

export function SubmitButton({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-60">
      {children}
    </button>
  );
}

/** Google's own mark, as its sign-in guidelines ask. */
function GoogleMark() {
  return (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

export function GoogleButton({
  busy,
  onClick,
  children = 'Continue with Google',
}: {
  busy: boolean;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="btn-secondary w-full disabled:opacity-60"
    >
      <GoogleMark />
      {children}
    </button>
  );
}

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-xs text-zinc-500" aria-hidden>
      <span className="h-px flex-1 bg-zinc-800" />
      or
      <span className="h-px flex-1 bg-zinc-800" />
    </div>
  );
}

/** Where accounts are not set up, nothing is behind a sign-in either. */
export function AccountsUnavailable() {
  return (
    <AuthCard
      title="Accounts aren't available"
      intro="Sign-in isn't set up on this site right now. Every page and tool is open to you meanwhile."
    >
      {import.meta.env.DEV && (
        <p className="text-xs text-zinc-500 mb-4">
          Set <code className="text-zinc-300">DATABASE_URL</code> and{' '}
          <code className="text-zinc-300">BETTER_AUTH_SECRET</code> on the server to turn them on.
        </p>
      )}
      <Link to="/home" className="btn-secondary w-full">
        Search cars
      </Link>
    </AuthCard>
  );
}
