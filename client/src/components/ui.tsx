import type { ProvenanceSource } from '../types/car.types';
import ProvenanceChip from './ProvenanceChip';

/** Consistent trust label: sourced vs estimated, used on cards and detail rows. */
export default function TrustLabel({
  source,
  estimated,
  className = '',
}: {
  source?: ProvenanceSource;
  /** Force "Est." when value is computed even if provenance key is missing */
  estimated?: boolean;
  className?: string;
}) {
  if (estimated) {
    return (
      <span
        className={`text-[9px] tracking-widest text-zinc-400 uppercase border border-dashed border-zinc-700 px-1.5 py-0.5 rounded-none ${className}`}
      >
        Est.
      </span>
    );
  }
  return <ProvenanceChip source={source} className={className} />;
}

export function InfoTip({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <span className="group relative inline-flex items-center gap-1">
      <span>{label}</span>
      <button
        type="button"
        className="w-4 h-4 border border-zinc-700 text-[10px] text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors shrink-0"
        aria-label={`What is ${label}?`}
      >
        ?
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2.5 bg-zinc-950 border border-zinc-800 text-[11px] leading-relaxed normal-case tracking-normal opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-20 ${
          wide ? 'w-72 max-w-[min(18rem,92vw)]' : 'w-56 max-w-[min(14rem,88vw)]'
        }`}
      >
        {children}
      </span>
    </span>
  );
}

export function ExpandableSection({
  title,
  summary,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="border border-zinc-800 bg-black group rounded-none">
      <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-4 hover:bg-zinc-950 transition-colors duration-150 border-b border-transparent group-open:border-zinc-800">
        <div>
          <span className="text-xs font-bold tracking-widest text-white uppercase">{title}</span>
          {summary && (
            <p className="text-[10px] tracking-widest text-zinc-400 uppercase mt-1">{summary}</p>
          )}
        </div>
        <span className="text-zinc-400 text-sm font-mono tabular-nums w-4 text-center group-open:hidden">+</span>
        <span className="text-zinc-400 text-sm font-mono tabular-nums w-4 text-center hidden group-open:inline">−</span>
      </summary>
      <div className="px-4 pb-4 pt-3 border-t border-zinc-800 space-y-1">{children}</div>
    </details>
  );
}
