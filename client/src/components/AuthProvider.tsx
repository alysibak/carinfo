import { lazy } from 'react';
import { Outlet } from 'react-router-dom';

/**
 * Clerk is ~200 KB of JavaScript that the landing page has no use for.
 *
 * Importing ClerkProvider in main.tsx put all of it in the entry chunk, so
 * every first-time visitor paid for the sign-in system before seeing a single
 * vehicle. Loading it here instead means:
 *
 *   - `/` (the marketing entry point) never downloads Clerk at all;
 *   - app-shell routes fetch it as a separate chunk, in parallel with the
 *     route chunk they were already waiting on.
 *
 * There is deliberately no <Suspense> here. The route components below are
 * already lazy and already suspend against App's boundary; sharing that one
 * boundary means Clerk and the route resolve together and the page mounts
 * exactly once. A nested boundary would mount the route bare and then remount
 * it inside the provider, throwing away its state and refetching its data.
 *
 * When no publishable key is configured the module is never requested at all.
 */
const ClerkShell = lazy(() => import('./ClerkShell'));

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

export function isAuthConfigured(): boolean {
  return Boolean(clerkKey);
}

/** Layout route element: nested routes, wrapped in Clerk's provider if configured. */
export default function AuthProvider() {
  if (!clerkKey) return <Outlet />;

  return (
    <ClerkShell publishableKey={clerkKey}>
      <Outlet />
    </ClerkShell>
  );
}
