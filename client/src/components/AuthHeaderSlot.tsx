import { Suspense, lazy } from 'react';
import { isAuthConfigured } from '../utils/authConfig';

// Lazy so that SiteHeader — which every app-shell page renders eagerly — does
// not drag @clerk/clerk-react into the entry chunk. The header renders without
// the auth controls for the moment the chunk is in flight.
const AuthHeaderControls = lazy(() =>
  import('./AccountAuth').then((m) => ({ default: m.AuthHeaderControls })),
);

/** Renders Clerk header controls only when the publishable key is present. */
export default function AuthHeaderSlot({ onNavigate }: { onNavigate?: () => void }) {
  if (!isAuthConfigured()) return null;
  return (
    <Suspense fallback={null}>
      <AuthHeaderControls onNavigate={onNavigate} />
    </Suspense>
  );
}
