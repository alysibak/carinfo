import { Suspense, lazy } from 'react';
import { Outlet } from 'react-router-dom';

// Its own chunk, with the sign-in client: the landing page, outside this
// layout route, never loads it.
const AccountSync = lazy(() => import('./AccountSync'));

/**
 * Layout route for the app shell: keeps the garage in step with the signed-in
 * account. Its Suspense wraps only the sync, never the routes, so a route is
 * not mounted twice while the chunk loads.
 */
export default function AuthProvider() {
  return (
    <>
      <Suspense fallback={null}>
        <AccountSync />
      </Suspense>
      <Outlet />
    </>
  );
}
