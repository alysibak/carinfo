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
          Accounts are not enabled on this build. Set{' '}
          <code className="text-zinc-200">VITE_CLERK_PUBLISHABLE_KEY</code>,{' '}
          <code className="text-zinc-200">CLERK_SECRET_KEY</code>, and{' '}
          <code className="text-zinc-200">DATABASE_URL</code> to turn on cloud garage sync.
        </p>
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
