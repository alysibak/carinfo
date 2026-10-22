import type { FormEvent, InputHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PROVIDER_NAMES, type SignInProvider } from '../services/signInMethods';

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
  className = '',
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
        className={`mt-1.5 block w-full h-12 bg-black border border-zinc-700 focus:border-zinc-300 px-3 text-base text-white placeholder:text-zinc-500 focus:outline-hidden rounded-none transition-colors ${className}`}
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

/** Apple's mark, in the button's own colour, as its guidelines allow. */
function AppleMark() {
  return (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}

/** Microsoft's four squares. */
function MicrosoftMark() {
  return (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 21 21" aria-hidden>
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

const MARKS: Record<SignInProvider, () => ReactNode> = {
  google: GoogleMark,
  apple: AppleMark,
  microsoft: MicrosoftMark,
};

/**
 * One button per account the site can sign in with, the one this browser
 * used last marked, so a returning visitor taps the same one again.
 */
export function ProviderButtons({
  providers,
  busy,
  pending,
  last,
  onPick,
}: {
  providers: SignInProvider[];
  busy: boolean;
  /** The provider on its way, which says so. */
  pending?: SignInProvider | null;
  last?: string | null;
  onPick: (provider: SignInProvider) => void;
}) {
  if (providers.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {providers.map((provider) => {
        const Mark = MARKS[provider];
        const name = PROVIDER_NAMES[provider];
        return (
          <button
            key={provider}
            type="button"
            disabled={busy}
            onClick={() => onPick(provider)}
            className="btn-secondary w-full disabled:opacity-60"
          >
            <Mark />
            {pending === provider ? `Opening ${name}…` : `Continue with ${name}`}
            {last === provider && (
              <span className="ml-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
                {/* Read as "Continue with Apple, last used". */}
                <span className="sr-only">, </span>
                Last used
              </span>
            )}
          </button>
        );
      })}
    </div>
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
