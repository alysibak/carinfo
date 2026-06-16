import { useState } from 'react';
import type { DerivedComparisonMetric, OwnershipAssumptions } from '../types/car.types';
import { formatCostPerKm } from '../utils/dataValue';
import { CURRENCY_METHODOLOGY_NOTE } from '../utils/currency';

interface ValuationLinksProps {
  compact?: boolean;
  assumptions?: OwnershipAssumptions;
  derivedComparison?: DerivedComparisonMetric | null;
  warnings?: string[];
  practicalityNote?: string;
}

export default function ValuationLinks({
  compact = false,
  assumptions,
  derivedComparison,
  warnings = [],
  practicalityNote,
}: ValuationLinksProps) {
  const [open, setOpen] = useState(false);

  if (compact) {
    return (
      <>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Market values are Ontario-baseline model estimates in CAD — not live listing quotes.{' '}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-zinc-300 underline underline-offset-2 hover:text-white transition-colors"
          >
            How these estimates work
          </button>
        </p>
        {open && (
          <MethodologyModal
            onClose={() => setOpen(false)}
            assumptions={assumptions}
            derivedComparison={derivedComparison}
            warnings={warnings}
            practicalityNote={practicalityNote}
          />
        )}
      </>
    );
  }

  return (
    <div className="surface-card p-5 space-y-3">
      <p className="text-sm font-semibold text-white">About these price estimates</p>
      <MethodologyBody
        assumptions={assumptions}
        derivedComparison={derivedComparison}
        warnings={warnings}
        practicalityNote={practicalityNote}
      />
    </div>
  );
}

function MethodologyModal({
  onClose,
  assumptions,
  derivedComparison,
  warnings,
  practicalityNote,
}: {
  onClose: () => void;
  assumptions?: OwnershipAssumptions;
  derivedComparison?: DerivedComparisonMetric | null;
  warnings?: string[];
  practicalityNote?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-labelledby="methodology-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-zinc-950 border border-zinc-800 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 id="methodology-title" className="text-sm font-black tracking-[0.2em] uppercase text-white">
            How these estimates work
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-white text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <MethodologyBody
          assumptions={assumptions}
          derivedComparison={derivedComparison}
          warnings={warnings}
          practicalityNote={practicalityNote}
        />
      </div>
    </div>
  );
}

function MethodologyBody({
  assumptions,
  derivedComparison,
  warnings = [],
  practicalityNote,
}: {
  assumptions?: OwnershipAssumptions;
  derivedComparison?: DerivedComparisonMetric | null;
  warnings?: string[];
  practicalityNote?: string;
}) {
  return (
    <div className="text-xs text-zinc-400 leading-relaxed space-y-4">
      <p>
        {CURRENCY_METHODOLOGY_NOTE} Individual condition, mileage, and local demand still move real prices — check
        marketplaces when you are ready to buy or sell.
      </p>
      {practicalityNote && (
        <p className="text-zinc-500 border-l-2 border-zinc-800 pl-3">{practicalityNote}</p>
      )}
      {assumptions && (
        <div className="space-y-2">
          <p className="text-[10px] tracking-[0.2em] text-zinc-500 uppercase">Assumptions</p>
          <ul className="space-y-1 list-none">
            <li>Annual driving: {assumptions.annualKm}</li>
            <li>Energy / fuel: {assumptions.energyPriceNote}</li>
            <li>Insurance: {assumptions.insuranceTier}</li>
            <li>Depreciation: {assumptions.depreciationNote}</li>
            <li>Region: {assumptions.regionNote}</li>
          </ul>
        </div>
      )}
      {derivedComparison && (
        <div className="space-y-2">
          <p className="text-[10px] tracking-[0.2em] text-zinc-500 uppercase">Derived comparison only</p>
          <p className="text-zinc-500">{derivedComparison.disclaimer}</p>
          {derivedComparison.fuelCostPerMile != null && (
            <p>Fuel / energy per km: {formatCostPerKm(derivedComparison.fuelCostPerMile)}</p>
          )}
          {derivedComparison.effectiveCostPerMile != null && (
            <p>Effective cost per km: {formatCostPerKm(derivedComparison.effectiveCostPerMile)}</p>
          )}
        </div>
      )}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w) => (
            <p key={w} className="text-amber-200/80 border-l-2 border-amber-800 pl-3">
              {w}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
