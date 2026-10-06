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
          className="text-xs text-zinc-400 hover:text-white transition-colors px-2 py-1"
        >
          Sign in
        </Link>
        <Link
          to={`/sign-up${next}`}
          onClick={onNavigate}
          className="text-xs bg-accent text-accent-ink px-2.5 py-1.5 hover:bg-accent-hover transition-colors"
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
        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors px-2 py-1"
        title={user.email}
      >
        {plan === 'pro' && (
          <span className="border border-zinc-500 text-zinc-200 px-1.5 py-0.5">Pro</span>
        )}
        <span className="max-w-28 truncate">{user.name || user.email.split('@')[0]}</span>
      </Link>
      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          void signOut();
        }}
        className="text-xs text-zinc-500 hover:text-white transition-colors px-2 py-1"
      >
        Sign out
      </button>
    </div>
  );
}
