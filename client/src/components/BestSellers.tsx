import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../services/api';
import type { BestSellers as BestSellerList } from '../types/car.types';
import { rangeKm } from '../utils/efficiency';
import { getRegionalAssumptions, type RegionId } from '@carinfo/config/regional-assumptions';
import { regionName, useRegionStore } from '../stores/regionStore';
import { carPhotoSources } from '../utils/carImages';
import { t } from '../i18n';

/**
 * "from ~$1,280/yr fuel in Ontario (est.)": the thriftiest version of the
 * newest year at the region's pump price and yearly distance.
 */
function fuelCostLine(mpg: number | undefined, region: RegionId) {
  if (!mpg || mpg <= 0) return null;
  const { annualKm, gasPriceCadPerL } = getRegionalAssumptions(region);
  const annual = Math.round(((annualKm / 100) * (235.215 / mpg) * gasPriceCadPerL) / 10) * 10;
  return t('from ~{amount}/yr fuel in {region} (est.)', {
    amount: `$${annual.toLocaleString('en-CA')}`,
    region: regionName(region),
  });
}

/** The model's newest year on file, a figure a line: "from 5.5 L/100 km", "NHTSA 5/5". */
function newestFacts(newest: BestSellerList['models'][number]['newest']): string[] {
  return [
    newest.combinedMpg
      ? `from ${(235.215 / newest.combinedMpg).toFixed(1)} L/100 km`
      : newest.rangeMiles
        ? `up to ${rangeKm(newest.rangeMiles)} km range`
        : null,
    newest.safetyStars ? `NHTSA ${newest.safetyStars}/5` : null,
  ].filter((fact): fact is string => !!fact);
}

/**
 * Canada's ten best sellers of the year, by units sold, each opening its
 * model's page: where most shoppers start. Sales are as The Car Guide counted
 * them; the figures beneath are the newest year on file, from the records.
 */
export default function BestSellers({
  headingLevel = 'h2',
}: {
  /** h1 where it heads the page. */
  headingLevel?: 'h1' | 'h2';
}) {
  const [data, setData] = useState<BestSellerList | null>(null);
  const region = useRegionStore((state) => state.region);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .getBestSellers()
      .then((list) => {
        if (active) setData(list);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (failed) return null;
  const Heading = headingLevel;

  return (
    <section aria-labelledby="best-sellers" className="@container">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-4">
        <Heading id="best-sellers" className="section-title">
          Canada’s best sellers
        </Heading>
        {data && (
          <p className="text-xs text-zinc-500">
            New vehicles sold in {data.year}, as{' '}
            <a
              href={data.source.url}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-500"
            >
              {data.source.name}
            </a>{' '}
            counted them
          </p>
        )}
      </div>
      {/* A row to swipe on a phone, a grid of five on a wide screen. */}
      <ol className="-mx-4 px-4 scroll-px-4 sm:mx-0 sm:px-0 flex sm:grid sm:grid-cols-2 @2xl:grid-cols-5 gap-2 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none overscroll-x-contain pb-1 sm:pb-0">
        {data
          ? data.models.map((model) => (
              <li key={model.path} className="snap-start shrink-0 w-[72%] sm:w-auto">
                <Link
                  to={model.path}
                  // Named by its rank, name, sales and where it goes, not the whole
                  // card read out: the figures are hidden from that name. Not an
                  // aria-label, which must hold the card's visible text.
                  className="spotlight group flex h-full flex-col border border-zinc-800 bg-zinc-950 transition-colors hover:border-zinc-600 focus-visible:border-zinc-400 overflow-hidden"
                >
                  {/* The car itself across the top, its credit on it (the photos
                      are CC BY-SA), the rank over the corner: a podium. */}
                  {carPhotoSources(model.photo).length > 0 ? (
                    <span className="theme-dark relative block aspect-[16/10] bg-zinc-900 overflow-hidden">
                      <img
                        src={carPhotoSources(model.photo).at(-1)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
                      />
                      <span
                        aria-hidden
                        className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-black/40"
                      />
                      <span className="absolute top-2 left-3 text-4xl font-bold leading-none tracking-[-0.04em] text-white/90">
                        {model.rank}
                      </span>
                      <span
                        aria-hidden
                        className="absolute bottom-1 right-2 left-2 text-right text-[10px] leading-tight text-zinc-300 line-clamp-1"
                      >
                        {t('Photo: {credit}', { credit: model.photo?.credit ?? '' })}
                      </span>
                    </span>
                  ) : (
                    <span className="px-4 pt-4 text-5xl font-bold leading-none tabular-nums tracking-[-0.04em] text-transparent [-webkit-text-stroke:1px_color-mix(in_oklab,var(--color-white)_30%,transparent)] group-hover:[-webkit-text-stroke:1px_color-mix(in_oklab,var(--color-white)_75%,transparent)] transition-[-webkit-text-stroke] duration-300">
                      {model.rank}
                    </span>
                  )}
                  <span className="flex flex-1 flex-col p-4 pt-3 @2xl:p-3.5 @5xl:p-4">
                    <h3 className="text-[15px] font-semibold text-white leading-snug">
                      {model.sales}
                    </h3>
                    <p className="text-[13px] text-zinc-300 tabular-nums">
                      {model.sold.toLocaleString('en-CA')} sold
                    </p>
                    {/* A figure a line: "L/100 km" broke across lines in a narrow card. */}
                    <dl
                      aria-hidden
                      className="mt-3 pt-3 border-t border-zinc-900 text-xs tabular-nums leading-relaxed"
                    >
                      <dt className="text-zinc-500">{model.newest.year} model</dt>
                      {newestFacts(model.newest).map((fact) => (
                        <dd key={fact} className="text-zinc-300 whitespace-nowrap">
                          {fact}
                        </dd>
                      ))}
                    </dl>
                    {fuelCostLine(model.newest.combinedMpg, region) && (
                      <span aria-hidden className="mt-2 block text-xs text-zinc-400">
                        {fuelCostLine(model.newest.combinedMpg, region)}
                      </span>
                    )}
                    <span className="mt-auto pt-3 text-[13px] text-zinc-300 group-hover:text-white transition-colors">
                      Every <span className="sr-only">{model.label}</span> year
                      <span aria-hidden> →</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))
          : Array.from({ length: 10 }, (_, i) => (
              <li
                key={i}
                aria-hidden
                className="snap-start shrink-0 w-[72%] sm:w-auto h-44 border border-zinc-900 bg-zinc-950 animate-pulse motion-reduce:animate-none"
              />
            ))}
      </ol>
    </section>
  );
}
