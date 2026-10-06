import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { nextParam, useAccount } from '../hooks/useAccount';
import { useGarageStore } from '../stores/garageStore';
import { usePageMeta } from '../utils/pageMeta';
import { LoadingScreen } from './ui';

/**
 * The tools (Compare, Dream Garage, Battle Mode, the Value Matrix, the VIN
 * decoder) are for members; car pages, search and browsing are open to all.
 * Where accounts are not set up, nothing is gated.
 */
export default function RequireAccount({ tool, children }: { tool: string; children: ReactNode }) {
  const account = useAccount();
  if (account.kind === 'loading') return <LoadingScreen label="Checking your sign-in" />;
  if (account.kind !== 'signed-out') return <>{children}</>;
  return <AccountGate tool={tool} />;
}

function AccountGate({ tool }: { tool: string }) {
  usePageMeta(tool, `${tool} is free with a CarInfo account.`);
  const { pathname, search } = useLocation();
  const saved = useGarageStore((s) => s.cars.length);
  const next = nextParam(pathname, search);
  return (
    <div className="page-wrap py-12 sm:py-20">
      <div className="max-w-xl">
        <p className="text-xs text-zinc-500 mb-3">Free with an account</p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
          Sign in to use {tool}
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed mb-6">
          {tool} is free with a CarInfo account. Car pages, search and browsing stay open to
          everyone.
        </p>
        {pathname === '/garage' && saved > 0 && (
          <p className="text-sm text-zinc-200 mb-6">
            {saved} car{saved === 1 ? '' : 's'} saved on this device will move into your garage when
            you sign in.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Link to={`/sign-up${next}`} className="btn-primary">
            Create free account
          </Link>
          <Link to={`/sign-in${next}`} className="btn-secondary">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
