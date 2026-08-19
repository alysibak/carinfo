import { Link } from 'react-router-dom';

export function PageHeader({
  title,
  subtitle,
  backTo,
  backLabel = 'Back',
  actions,
}: {
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8">
      {backTo && (
        <Link to={backTo} className="label-sm hover:text-white transition-colors mb-4 inline-block">
          ← {backLabel}
        </Link>
      )}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-zinc-400 mt-1.5 max-w-2xl leading-relaxed">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </header>
  );
}

export function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card px-4 py-3 text-center min-w-[100px]">
      <p className="text-lg font-semibold text-white">{value}</p>
      <p className="text-[11px] text-zinc-400 mt-0.5">{label}</p>
    </div>
  );
}
