import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../services/api';
import type { BestSellers as BestSellerList } from '../types/car.types';
import { rangeKm } from '../utils/efficiency';

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
                  // One clear name, not the whole card read out.
                  aria-label={`${model.rank}. ${model.sales}, ${model.sold.toLocaleString('en-CA')} sold: every ${model.label} year`}
                  className="group flex h-full flex-col border border-zinc-800 bg-zinc-950 p-4 @2xl:p-3.5 @5xl:p-4 transition-colors hover:border-zinc-500 hover:bg-zinc-900/60 focus-visible:border-zinc-400"
                >
                  <span className="text-2xl font-bold tabular-nums text-zinc-600 group-hover:text-zinc-400 transition-colors">
                    {model.rank}
                  </span>
                  <h3 className="mt-1 text-[15px] font-semibold text-white leading-snug">
                    {model.sales}
                  </h3>
                  <p className="text-[13px] text-zinc-300 tabular-nums">
                    {model.sold.toLocaleString('en-CA')} sold
                  </p>
                  {/* A figure a line: "L/100 km" broke across lines in a narrow card. */}
                  <dl className="mt-3 pt-3 border-t border-zinc-900 text-xs tabular-nums leading-relaxed">
                    <dt className="text-zinc-500">{model.newest.year} model</dt>
                    {newestFacts(model.newest).map((fact) => (
                      <dd key={fact} className="text-zinc-300 whitespace-nowrap">
                        {fact}
                      </dd>
                    ))}
                  </dl>
                  <span className="mt-auto pt-3 text-[13px] text-zinc-300 group-hover:text-white transition-colors">
                    Every year →
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
