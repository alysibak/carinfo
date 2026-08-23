import { Link } from 'react-router-dom';
import type { CarDashboard, ProvenanceSource } from '../types/car.types';
import {
  buildProvenanceEntries,
  filterProvenanceEntries,
  isVerifiedSource,
  provenanceGlossaryKey,
  type ProvenanceEntry,
  type TrustFilter,
} from '../utils/dataTrust';
import { TIER3_LABEL, TIER_HELPER } from '../utils/visualTiers';
import ProvenanceChip from './ProvenanceChip';
import { SpecLabel } from './SpecExplain';

const FILTERS: { id: TrustFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'verified', label: 'Verified' },
  { id: 'estimated', label: 'Estimated' },
];

const SOURCE_SORT_ORDER: Record<ProvenanceSource, number> = {
  epa: 0,
  nhtsa: 1,
  curated: 2,
  estimated: 3,
};

function sortBySource(a: ProvenanceEntry, b: ProvenanceEntry): number {
  return SOURCE_SORT_ORDER[a.source] - SOURCE_SORT_ORDER[b.source];
}

function provenanceSummaryLine(
  entries: ProvenanceEntry[],
  filter: TrustFilter,
  allTotal: number,
): string {
  const verifiedCount = entries.filter((e) => isVerifiedSource(e.source)).length;
  const estimatedCount = entries.filter((e) => e.source === 'estimated').length;
  const shown = entries.length;

  if (filter === 'all') {
    return `${verifiedCount} of ${shown} values EPA or NHTSA verified, ${estimatedCount} estimated.`;
  }
  if (filter === 'verified') {
    return `${shown} verified value${shown === 1 ? '' : 's'} (of ${allTotal} on this vehicle).`;
  }
  return `${shown} estimated value${shown === 1 ? '' : 's'} (of ${allTotal} on this vehicle).`;
}

function ProvenanceRow({ entry }: { entry: ProvenanceEntry }) {
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2 border border-zinc-800 bg-black text-xs">
      <span className="text-zinc-400 truncate min-w-0">
        <SpecLabel
          label={entry.label}
          glossaryKey={provenanceGlossaryKey(entry.key)}
        />
      </span>
      <span className="flex min-w-0 items-center justify-end gap-1.5 text-right">
        <ProvenanceChip source={entry.source} />
        {entry.confidence && (
          <span className="min-w-0 truncate text-[9px] tracking-wider text-zinc-400 uppercase">
            {entry.confidence}
          </span>
        )}
      </span>
    </li>
  );
}

interface DataTrustPanelProps {
  dashboard: CarDashboard;
  filter: TrustFilter;
  onFilterChange: (filter: TrustFilter) => void;
}

export default function DataTrustPanel({ dashboard, filter, onFilterChange }: DataTrustPanelProps) {
  const allEntries = buildProvenanceEntries(dashboard);
  const entries = filterProvenanceEntries(allEntries, filter);

  if (allEntries.length === 0) return null;

  const verifiedEntries = entries.filter((e) => isVerifiedSource(e.source)).sort(sortBySource);
  const estimatedEntries = entries.filter((e) => e.source === 'estimated').sort(sortBySource);
  const summaryLine = provenanceSummaryLine(entries, filter, allEntries.length);

  return (
    <section className="border-b border-zinc-800 bg-zinc-950/40">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] tracking-widest text-zinc-400 uppercase">Data sources</p>
            <p className="text-xs text-zinc-400 mt-1">
              Where key values come from and how confident we are.{' '}
              <Link to="/methodology" className="text-zinc-400 underline underline-offset-2 hover:text-white">
                Full methodology
              </Link>
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by data source">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onFilterChange(f.id)}
                className={`min-h-[36px] px-3 py-2 text-[10px] tracking-widest uppercase border transition-colors ${
                  filter === f.id
                    ? 'border-white text-white bg-zinc-900'
                    : 'border-zinc-700 text-zinc-400 hover:text-zinc-300 hover:border-zinc-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {entries.length === 0 ? (
          <p className={TIER_HELPER}>No fields match this filter for this vehicle.</p>
        ) : (
          <>
            <p className={`${TIER_HELPER} mb-4`}>{summaryLine}</p>
            {filter === 'all' ? (
              <div className="space-y-5">
                {verifiedEntries.length > 0 && (
                  <div>
                    <p className={`${TIER3_LABEL} mb-2`}>Verified</p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {verifiedEntries.map((entry) => (
                        <ProvenanceRow key={entry.key} entry={entry} />
                      ))}
                    </ul>
                  </div>
                )}
                {estimatedEntries.length > 0 && (
                  <div>
                    <p className={`${TIER3_LABEL} mb-2`}>Estimated</p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {estimatedEntries.map((entry) => (
                        <ProvenanceRow key={entry.key} entry={entry} />
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {entries.sort(sortBySource).map((entry) => (
                  <ProvenanceRow key={entry.key} entry={entry} />
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  );
}
