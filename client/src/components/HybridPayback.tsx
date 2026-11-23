import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRegionalAssumptions } from '@carinfo/config/regional-assumptions';
import * as api from '../services/api';
import type { CarSpecs } from '../types/car.types';
import { regionName, useRegionStore } from '../stores/regionStore';
import { hybridSaving, SAVING_YEARS } from '../utils/payback';
import { paybackSentence, savingSentence } from '../utils/paybackText';
import { t } from '../i18n';

/**
 * Hybrid or gas: on a model year with both, the fuel the hybrid saves at the
 * visitor's pump prices and distance, and, given the price gap a dealer
 * quotes, how long it takes to pay for itself. Prices are the reader's: the
 * list prices on file are estimates, the same for both versions.
 */
export default function HybridPayback({ car }: { car: CarSpecs }) {
  const region = useRegionStore((state) => state.region);
  const [siblings, setSiblings] = useState<CarSpecs[] | null>(null);
  const [gapText, setGapText] = useState('');
  const gapId = useId();

  useEffect(() => {
    let active = true;
    setSiblings(null);
    api
      .getSiblingConfigs(car.id, 48)
      .then((rows) => {
        if (active) setSiblings(rows);
      })
      .catch(() => {
        if (active) setSiblings([]);
      });
    return () => {
      active = false;
    };
  }, [car.id]);

  const saving = siblings ? hybridSaving(car, siblings, region) : null;
  if (!saving) return null;
  const gap = Number(gapText.replace(/[^\d]/g, ''));
  const km = getRegionalAssumptions(region).annualKm.toLocaleString('en-CA');
  return (
    <div className="mt-6 border-t border-zinc-900 pt-5 max-w-2xl">
      <h3 className="text-sm font-semibold text-white">{t('Hybrid or gas?')}</h3>
      <p className="mt-1.5 text-sm text-zinc-300 leading-relaxed">
        {savingSentence(saving, t(regionName(region)), car)}
      </p>
      <p className="mt-1.5 text-sm text-zinc-300 leading-relaxed">
        {t(
          'On fuel alone, the hybrid is worth paying up to about {total} more if you keep it {years} years.',
          {
            total: '$' + Math.round(saving.yearlySaving * SAVING_YEARS).toLocaleString('en-CA'),
            years: SAVING_YEARS,
          },
        )}
      </p>
      <label
        htmlFor={gapId}
        className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-400"
      >
        {t('Price difference you are quoted')}
        <input
          id={gapId}
          inputMode="numeric"
          autoComplete="off"
          placeholder="$"
          value={gapText}
          onChange={(e) => {
            const digits = e.target.value.replace(/[^\d]/g, '');
            setGapText(digits ? Number(digits).toLocaleString('en-CA') : '');
          }}
          className="w-28 bg-zinc-900 border border-zinc-700 px-2 py-1.5 text-sm text-white focus:border-zinc-400 focus:outline-none"
        />
      </label>
      {gapText && (
        <p className="mt-1.5 text-sm text-zinc-200" aria-live="polite">
          {paybackSentence(gap, saving.yearlySaving)}
        </p>
      )}
      <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
        {t(
          'EPA fuel use at {region} pump prices and {km} km a year. Resale value, insurance and upkeep can tip it either way.',
          { region: t(regionName(region)), km },
        )}
      </p>
      <Link
        to={`/compare?cars=${saving.efficient.id},${saving.base.id}`}
        className="mt-2 inline-block text-sm text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700"
      >
        {t('Compare the two')}
      </Link>
    </div>
  );
}
