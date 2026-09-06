import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../utils/pageMeta';

const AccountClerkPanel = lazy(() => import('../components/AccountClerkPanel'));

export default function AccountPage() {
  usePageMeta('Account', 'Manage your CarInfo garage sync, plan, and billing.');
  const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (!clerkKey) {
    return (
      <div className="page-wrap py-10 max-w-2xl">
        <h1 className="text-2xl font-bold mb-3">Account</h1>
        <p className="text-sm text-zinc-400">
          Accounts aren't available yet. Your garage is saved on this device and works
          without one. Sign-in and cross-device sync are coming.
        </p>
        {import.meta.env.DEV && (
          <p className="mt-3 text-xs text-zinc-500">
            Set <code className="text-zinc-300">VITE_CLERK_PUBLISHABLE_KEY</code>,{' '}
            <code className="text-zinc-300">CLERK_SECRET_KEY</code> and{' '}
            <code className="text-zinc-300">DATABASE_URL</code> to enable them.
          </p>
        )}
        <Link to="/garage" className="inline-block mt-6 btn-secondary text-xs">
          Local garage
        </Link>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <p className="text-xs uppercase tracking-widest text-zinc-500">Loading account</p>
        </div>
      }
    >
      <AccountClerkPanel />
    </Suspense>
  );
}
