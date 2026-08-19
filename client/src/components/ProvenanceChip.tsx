import type { ProvenanceSource } from '../types/car.types';

const LABELS: Record<ProvenanceSource, string> = {
  epa: 'EPA',
  nhtsa: 'NHTSA',
  estimated: 'Est.',
  curated: 'Curated',
};

const STYLES: Record<ProvenanceSource, string> = {
  epa: 'bg-transparent text-zinc-300 border-zinc-600',
  nhtsa: 'bg-transparent text-zinc-400 border-zinc-600',
  estimated: 'bg-transparent text-zinc-400 border-zinc-700 border-dashed',
  curated: 'bg-transparent text-zinc-400 border-zinc-600',
};

interface ProvenanceChipProps {
  source?: ProvenanceSource;
  className?: string;
}

export default function ProvenanceChip({ source, className = '' }: ProvenanceChipProps) {
  if (!source) return null;
  return (
    <span
      className={`inline-block text-[9px] uppercase tracking-widest px-1.5 py-0.5 border rounded-none ${STYLES[source]} ${className}`}
      title={
        source === 'epa'
          ? 'EPA verified via FuelEconomy.gov'
          : source === 'nhtsa'
            ? 'NHTSA verified'
            : source === 'estimated'
              ? 'Estimated value'
              : source === 'curated'
                ? 'EPA test-car rated horsepower (separate from FuelEconomy.gov)'
                : 'Curated data'
      }
    >
      {LABELS[source]}
    </span>
  );
}
