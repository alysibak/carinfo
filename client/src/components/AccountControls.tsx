import { Link, useLocation } from 'react-router-dom';
import { nextParam, signOut, useAccount } from '../hooks/useAccount';
import { useGarageStore } from '../stores/garageStore';

/** The header's sign-in links, or the signed-in account and a way out. */
export default function AccountControls({ onNavigate }: { onNavigate?: () => void }) {
  const account = useAccount();
  const plan = useGarageStore((s) => s.plan);
  const { pathname, search } = useLocation();

  // Nothing until the session is known, so a signed-in visitor never sees
  // "Sign in" flash; nothing at all where accounts are not set up.
  if (account.kind === 'loading' || account.kind === 'unavailable') return null;

  if (account.kind === 'signed-out') {
    const next = nextParam(pathname, search);
    return (
      <div className="flex items-center gap-2">
        <Link
          to={`/sign-in${next}`}
          onClick={onNavigate}
          className="inline-flex items-center min-h-[44px] text-sm text-zinc-300 hover:text-white transition-colors px-2"
        >
          Sign in
        </Link>
        <Link
          to={`/sign-up${next}`}
          onClick={onNavigate}
          className="inline-flex items-center min-h-[36px] text-sm font-semibold bg-accent text-accent-ink px-3.5 hover:bg-accent-hover transition duration-150 active:scale-[0.97]"
        >
          Sign up
        </Link>
      </div>
    );
  }

  const { user } = account.session;
  return (
    <div className="flex items-center gap-2">
      <Link
        to="/account"
        onClick={onNavigate}
        className="inline-flex items-center gap-1.5 min-h-[44px] text-sm text-zinc-300 hover:text-white transition-colors px-2"
        title={user.email}
      >
        {plan === 'pro' && (
          <span className="text-[11px] font-semibold uppercase tracking-wide text-accent">Pro</span>
        )}
        <span className="max-w-28 truncate">{user.name || user.email.split('@')[0]}</span>
      </Link>
      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          void signOut();
        }}
        className="inline-flex items-center min-h-[44px] text-sm text-zinc-400 hover:text-white transition-colors px-2"
      >
        Sign out
      </button>
    </div>
  );
}
