import { Suspense, lazy, useContext } from 'react';
import { Link } from 'react-router-dom';
import { isAuthConfigured } from '../utils/authConfig';
import { ClerkMountedContext } from '../utils/clerkMounted';

// Lazy so that SiteHeader — which every app-shell page renders eagerly — does
// not drag @clerk/clerk-react into the entry chunk. The header renders without
// the auth controls for the moment the chunk is in flight.
const AuthHeaderControls = lazy(() =>
  import('./AccountAuth').then((m) => ({ default: m.AuthHeaderControls })),
);

/** Renders Clerk header controls only when the publishable key is present. */
export default function AuthHeaderSlot({ onNavigate }: { onNavigate?: () => void }) {
  const clerkMounted = useContext(ClerkMountedContext);
  if (!isAuthConfigured()) return null;
  // The landing page renders outside Clerk, which it never loads; Clerk's
  // controls there would throw. The account page loads Clerk and signs in.
  if (!clerkMounted) {
    return (
      <Link
        to="/account"
        onClick={onNavigate}
        className="text-[10px] uppercase tracking-widest text-zinc-400 hover:text-white transition-colors px-2 py-1"
      >
        Account
      </Link>
    );
  }
  return (
    <Suspense fallback={null}>
      <AuthHeaderControls onNavigate={onNavigate} />
    </Suspense>
  );
}
