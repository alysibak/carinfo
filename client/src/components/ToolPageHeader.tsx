import type { ReactNode } from 'react';
import { BackLink } from './ui';

/**
 * Shared page header — use this instead of hand-rolled sticky bars.
 * `centered` matches browse/collection title-in-the-middle layouts.
 */
export default function ToolPageHeader({
  backTo,
  backLabel = 'Back',
  title,
  subtitle,
  action,
  centered = false,
}: {
  backTo: string;
  backLabel?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  centered?: boolean;
}) {
  if (centered) {
    return (
      <div className="bg-black border-b border-zinc-900">
        <div className="page-wrap-wide py-4 sm:py-6">
          <div className="flex items-center justify-between gap-3 min-w-0">
            <BackLink to={backTo} label={backLabel} />
            <div className="text-center flex-1 min-w-0 px-1">
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight truncate">{title}</h1>
              {subtitle && <p className="text-xs text-zinc-500 mt-1 truncate">{subtitle}</p>}
            </div>
            {action ? (
              <div className="min-w-0 flex justify-end shrink-0">{action}</div>
            ) : (
              <span className="w-8 sm:w-12" aria-hidden />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black border-b border-zinc-900">
      <div className="page-wrap-wide py-4 sm:py-6">
        <div className="flex items-center justify-between gap-3">
          <BackLink to={backTo} label={backLabel} />
          {action ? (
            <div className="min-w-0 flex justify-end shrink-0">{action}</div>
          ) : (
            <span className="w-8 sm:w-12" aria-hidden />
          )}
        </div>
        <div className="mt-3 min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight break-words">
            {title}
          </h1>
          {subtitle && <p className="text-xs text-zinc-500 mt-1 break-words">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
