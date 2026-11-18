import { Suspense, lazy } from 'react';
import ErrorBoundary from './ErrorBoundary';

// Lazy so that SiteHeader, which every page renders eagerly, does not put the
// sign-in client in the entry chunk. The header renders without the controls
// for the moment the chunk is in flight.
const AccountControls = lazy(() => import('./AccountControls'));

/**
 * The header's account controls. Where their code cannot load, as with no
 * connection, the header goes without them rather than the page failing.
 */
export default function AuthHeaderSlot({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <ErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <AccountControls onNavigate={onNavigate} />
      </Suspense>
    </ErrorBoundary>
  );
}
