import { Suspense, lazy } from 'react';

// Lazy so that SiteHeader, which every page renders eagerly, does not put the
// sign-in client in the entry chunk. The header renders without the controls
// for the moment the chunk is in flight.
const AccountControls = lazy(() => import('./AccountControls'));

/** The header's account controls. */
export default function AuthHeaderSlot({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Suspense fallback={null}>
      <AccountControls onNavigate={onNavigate} />
    </Suspense>
  );
}
