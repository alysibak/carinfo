import type { ReactNode } from 'react';

/**
 * Shared page frame — black shell only.
 * Layout already owns min-h-screen; nesting another full viewport here
 * left blank bands above the site footer on short pages.
 */
export default function PageShell({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`bg-black text-white ${className}`.trim()}>{children}</div>;
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
    <div className={`${wide ? 'page-wrap-wide' : 'page-wrap'} section-y-tight ${className}`.trim()}>
      {children}
    </div>
  );
}
