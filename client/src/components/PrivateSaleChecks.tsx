import { useId, useState } from 'react';
import type { RegionId } from '@carinfo/config/regional-assumptions';
import { REGION_OPTIONS, useRegionStore } from '../stores/regionStore';
import { LIEN_CHECKS, LIEN_RISKS_URL, PRIVATE_SALE_CHECKS } from '../config/privateSale';
import { Chevron, foldSummaryClass } from './ui';
import { t } from '../i18n';

/**
 * Buying from a private seller: the checks before paying, and the
 * province's own lien search, with its official page. A lien, money still
 * owed on the car, can follow it to the buyer.
 */
export default function PrivateSaleChecks() {
  const region = useRegionStore((state) => state.region);
  const [province, setProvince] = useState<RegionId>(region);
  const selectId = useId();
  const lien = LIEN_CHECKS[province];
  return (
    <details className="group/private mt-6 border border-zinc-800 bg-zinc-950">
      <summary className={`${foldSummaryClass} px-4 py-3 text-sm font-semibold text-white`}>
        <span>{t('Buying from a private seller? Check before you pay')}</span>
        <Chevron className="w-3.5 h-3.5 text-zinc-500 group-open/private:rotate-180" />
      </summary>
      <div className="px-4 pb-4">
        <ul className="space-y-1.5 text-sm text-zinc-300 leading-relaxed list-disc pl-5">
          {PRIVATE_SALE_CHECKS.map((check) => (
            <li key={check}>{t(check)}</li>
          ))}
        </ul>
        <div className="mt-4 border-t border-zinc-900 pt-3">
          <label
            htmlFor={selectId}
            className="flex flex-wrap items-center gap-2 text-xs text-zinc-400"
          >
            {t('No money owed on it: in')}
            <select
              id={selectId}
              value={province}
              onChange={(e) => setProvince(e.target.value as RegionId)}
              className="bg-zinc-900 border border-zinc-700 px-2 py-1.5 text-sm text-white focus:border-zinc-400 focus:outline-none"
            >
              {REGION_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {t(option.label)}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-2 text-sm text-zinc-200 leading-relaxed">{t(lien.text)}</p>
          <a
            href={lien.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-sm text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700"
          >
            {t('How, on {source}', { source: lien.source })}
          </a>
          <p className="mt-3 text-xs text-zinc-500 leading-relaxed">
            {t('A lien can follow the car to you: the lender may take it back.')}{' '}
            <a
              href={LIEN_RISKS_URL}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 decoration-zinc-700 hover:text-white"
            >
              {t('Financial Consumer Agency of Canada')}
            </a>
          </p>
        </div>
      </div>
    </details>
  );
}
