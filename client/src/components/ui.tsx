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
        className={`text-[9px] tracking-[0.15em] text-zinc-600 uppercase border border-dashed border-zinc-800 px-1.5 py-0.5 ${className}`}
      >
        Est.
      </span>
    );
  }
  return <ProvenanceChip source={source} className={className} />;
}

export function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="group relative inline-flex items-center gap-1">
      <span>{label}</span>
      <button
        type="button"
        className="w-4 h-4 border border-zinc-700 text-[10px] text-zinc-600 hover:text-white hover:border-zinc-500 transition-colors"
        aria-label={`What is ${label}?`}
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 px-3 py-2 bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 normal-case tracking-normal opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-10"
      >
        {children}
      </span>
    </span>
  );
}

export function ExpandableSection({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      className="border border-zinc-900 bg-black group"
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none px-6 py-4 flex items-center justify-between gap-4 hover:bg-zinc-950 transition-colors">
        <div>
          <span className="text-xs font-black tracking-[0.2em] text-white uppercase">{title}</span>
          {summary && (
            <p className="text-[10px] tracking-widest text-zinc-600 uppercase mt-1">{summary}</p>
          )}
        </div>
        <span className="text-zinc-600 group-open:rotate-180 transition-transform text-sm">▼</span>
      </summary>
      <div className="px-6 pb-6 border-t border-zinc-900">{children}</div>
    </details>
  );
}
