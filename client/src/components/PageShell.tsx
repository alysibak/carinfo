import type { ReactNode } from 'react';

/**
 * Shared page frame — one place for the full-page black shell.
 * Compare-tray padding lives on Layout; don't duplicate it here.
 */
export default function PageShell({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`min-h-screen bg-black text-white ${className}`.trim()}>{children}</div>;
}

export function PageBody({
  children,
  wide = false,
  className = '',
}: {
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  return (
    <div className={`${wide ? 'page-wrap-wide' : 'page-wrap'} py-6 sm:py-8 ${className}`.trim()}>
      {children}
    </div>
  );
}
