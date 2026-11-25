import { useEffect, useId, useState } from 'react';
import { getRegionalAssumptions } from '@carinfo/config/regional-assumptions';
import {
  plausibleAnnualKm,
  REGION_OPTIONS,
  regionName,
  useRegionStore,
} from '../stores/regionStore';
import { intlLocale, t } from '../i18n';

const grouped = (km: number) => km.toLocaleString(intlLocale());

/**
 * The region cost estimates are worked out for, and the distance: the
 * region's average unless the visitor gives their own, which every fuel and
 * running cost on the site then uses. It sits beside the estimates it
 * changes (a car's estimated costs, compare's estimate rows) rather than in
 * the site header, where it made costs look like the point of the site.
 */
export default function RegionSelect({ className = '' }: { className?: string }) {
  const region = useRegionStore((s) => s.region);
  const setRegion = useRegionStore((s) => s.setRegion);
  const ownKm = useRegionStore((s) => s.annualKm);
  const setAnnualKm = useRegionStore((s) => s.setAnnualKm);
  const regionalKm = getRegionalAssumptions(region).annualKm;
  const shownKm = ownKm ?? regionalKm;
  const [text, setText] = useState(() => grouped(shownKm));
  const kmId = useId();

  // Another region's average, or a distance set elsewhere on the page.
  useEffect(() => setText(grouped(shownKm)), [shownKm]);

  const commit = () => {
    const km = Number(text.replace(/[^\d]/g, ''));
    // Cleared, or the average itself: the region's, following the region.
    const next = !text.trim() || km === regionalKm ? null : plausibleAnnualKm(km) ? km : ownKm;
    setAnnualKm(next);
    setText(grouped(next ?? regionalKm));
  };

  return (
    <span
      className={`inline-flex flex-wrap items-center gap-x-2 gap-y-2 text-[13px] text-zinc-400 ${className}`}
    >
      <label className="inline-flex items-center gap-2">
        <span>{t('Costs for')}</span>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value as typeof region)}
          className="bg-black border border-zinc-700 hover:border-zinc-400 text-zinc-200 hover:text-white text-[13px] px-2 py-1.5 min-h-[36px] transition-colors focus:outline-hidden focus:border-accent"
          aria-label={t('Costs for region')}
        >
          {REGION_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id} className="bg-zinc-950 text-white">
              {t(opt.label)}
            </option>
          ))}
        </select>
      </label>
      <span className="inline-flex items-center gap-2">
        <label htmlFor={kmId}>{t('driving')}</label>
        <input
          id={kmId}
          inputMode="numeric"
          autoComplete="off"
          enterKeyHint="done"
          value={text}
          onChange={(e) => {
            const km = Number(e.target.value.replace(/[^\d]/g, ''));
            setText(e.target.value.trim() && Number.isFinite(km) ? grouped(km) : '');
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          className="w-[5.5rem] bg-black border border-zinc-700 text-zinc-200 text-[13px] px-2 py-1.5 min-h-[36px] tabular-nums focus:outline-hidden focus:border-accent"
        />
        <span>{t('km a year')}</span>
      </span>
      {ownKm != null ? (
        <button
          type="button"
          onClick={() => {
            setAnnualKm(null);
            setText(grouped(regionalKm));
          }}
          className="min-h-[36px] text-zinc-500 underline underline-offset-2 decoration-zinc-700 hover:text-zinc-200"
        >
          {t('Use the {region} average', { region: t(regionName(region)) })}
        </button>
      ) : (
        <span className="text-zinc-500">
          {t('({region} average)', { region: t(regionName(region)) })}
        </span>
      )}
    </span>
  );
}
