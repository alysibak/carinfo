import { Link } from 'react-router-dom';
import { t } from '../i18n';

export interface Crumb {
  label: string;
  to?: string;
}

/** Where a page sits, Make / Model / Year, each a way back up. */
export default function Breadcrumbs({
  items,
  className = '',
}: {
  items: Crumb[];
  className?: string;
}) {
  if (items.length < 2) return null;
  return (
    <nav aria-label={t('Breadcrumb')} className={`text-xs text-zinc-400 ${className}`}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${i}-${item.label}`} className="inline-flex items-center gap-1.5">
              {item.to ? (
                <Link
                  to={item.to}
                  className="inline-flex items-center min-h-[32px] hover:text-white hover:underline underline-offset-4"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className="text-zinc-300">
                  {item.label}
                </span>
              )}
              {!last && (
                <span aria-hidden className="text-zinc-600">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
