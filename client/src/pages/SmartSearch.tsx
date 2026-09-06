import { useSearchParams, Link } from 'react-router-dom';
import { useEffect, useState, useMemo, useCallback } from 'react';
import * as api from '../services/api';
import type { CarSpecs, SearchQuery } from '../types/car.types';
import { type FuelTypeFilter } from '../utils/marketIntelligence';
import SelectMenu from '../components/SelectMenu';
import ToolPageHeader from '../components/ToolPageHeader';
import PageShell, { PageBody } from '../components/PageShell';
import { ErrorState, LoadingScreen } from '../components/ui';
import {
  formatMpgForCard,
  formatPowerForCard,
  formatPriceShort,
} from '../utils/dataValue';
import { formatFuelBadge, usesMpge } from '../utils/fuelDisplay';
import { displayModelLabel } from '../utils/trimLabel';
import { searchQueryToParams } from '../utils/searchParams';
import { differentiateCars } from '../utils/differentiateCars';
import { usePageMeta } from '../utils/pageMeta';

type RankBy = 'match' | 'efficiency' | 'value' | 'power';

/**
 * Quiz results are a decision aid, not a catalog.
 * Show exactly three picks. Everything else lives in Search.
 */
const PICK_COUNT = 3;
const FETCH_LIMIT = 40;

const PERSONA_COPY: Record<string, { title: string; defaultRank: RankBy }> = {
  commuter: { title: 'Built around commuting', defaultRank: 'efficiency' },
  gearhead: { title: 'Built around performance', defaultRank: 'power' },
  family: { title: 'Built around family use', defaultRank: 'match' },
  work: { title: 'Built around work use', defaultRank: 'value' },
};

function buildQuizFilters(
  persona: string | null,
  priority: string | null,
  usage: string | null,
  minPrice: number,
  maxPrice: number,
): SearchQuery['filters'] {
  const filters: SearchQuery['filters'] = {
    price: { min: minPrice, max: maxPrice },
  };

  if (persona === 'commuter') filters.fuelEconomy = { min: 25 };
  else if (persona === 'gearhead') filters.horsepower = { min: 250 };
  else if (persona === 'family') filters.bodyStyle = ['suv', 'minivan', 'wagon'];
  else if (persona === 'work') {
    filters.bodyStyle = ['truck'];
    filters.driveType = ['AWD', '4WD'];
  }

  if (priority === 'mpg') filters.fuelEconomy = { min: 30 };
  else if (priority === 'power') filters.horsepower = { min: 300 };
  else if (priority === 'safety') filters.bodyStyle = ['suv', 'minivan', 'wagon', 'sedan'];
  else if (priority === 'space') filters.bodyStyle = ['suv', 'minivan', 'wagon'];

  if (usage === 'commute') {
    filters.fuelEconomy = { min: Math.max(filters.fuelEconomy?.min || 0, 28) };
  } else if (usage === 'family') {
    filters.bodyStyle = filters.bodyStyle || ['suv', 'minivan', 'wagon'];
  } else if (usage === 'fun') {
    filters.horsepower = { min: Math.max(filters.horsepower?.min || 0, 250) };
  } else if (usage === 'work') {
    filters.bodyStyle = filters.bodyStyle || ['truck', 'van'];
    filters.driveType = filters.driveType || ['AWD', '4WD'];
  }

  return filters;
}

export default function SmartSearch() {
  usePageMeta('Three picks for you', 'Quiz results: three cars to compare, not a scrolling catalog.');
  const [searchParams] = useSearchParams();
  const [allCars, setAllCars] = useState<CarSpecs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rankBy, setRankBy] = useState<RankBy>('match');
  const [fuelTypeFilter, setFuelTypeFilter] = useState<FuelTypeFilter>('all');

  const persona = searchParams.get('persona') as 'commuter' | 'gearhead' | 'family' | 'work' | null;
  const minPrice = parseInt(searchParams.get('minPrice') || '0', 10);
  const maxPrice = parseInt(searchParams.get('maxPrice') || '999999', 10);
  const priority = searchParams.get('priority') as 'mpg' | 'power' | 'safety' | 'space' | null;
  const usage = searchParams.get('usage') as 'commute' | 'family' | 'fun' | 'work' | null;

  const copy = PERSONA_COPY[persona ?? ''] ?? {
    title: 'Based on your answers',
    defaultRank: 'match' as RankBy,
  };

  const quizFilters = useMemo(
    () => buildQuizFilters(persona, priority, usage, minPrice, maxPrice),
    [persona, priority, usage, minPrice, maxPrice],
  );

  useEffect(() => {
    setRankBy(copy.defaultRank);
  }, [copy.defaultRank]);

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let results = await api.searchCars({
        filters: quizFilters,
        sort: { field: 'year', order: 'desc' },
        limit: FETCH_LIMIT,
        collapseByModel: true,
      });

      if (results.total === 0 && (persona || priority || usage)) {
        results = await api.searchCars({
          filters: { price: { min: minPrice, max: maxPrice } },
          sort: { field: 'year', order: 'desc' },
          limit: FETCH_LIMIT,
          collapseByModel: true,
        });
      }

      if (results.total === 0) {
        results = await api.searchCars({
          filters: {
            price: {
              min: Math.max(0, Math.floor(minPrice * 0.5)),
              max: maxPrice < 999999 ? Math.ceil(maxPrice * 1.5) : maxPrice,
            },
          },
          sort: { field: 'year', order: 'desc' },
          limit: FETCH_LIMIT,
          collapseByModel: true,
        });
      }

      setAllCars(results.results);
    } catch {
      setAllCars([]);
      setError('Unable to load matches right now.');
    } finally {
      setLoading(false);
    }
  }, [quizFilters, persona, priority, usage, minPrice, maxPrice]);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const scoreCar = useCallback(
    (car: CarSpecs): number => {
      const price = car.price?.msrp || 50000;
      const mpg = car.fuelEconomy.combined || 20;
      const safety =
        car.safetyRating?.overall && car.safetyRating.overall > 0
          ? car.safetyRating.overall
          : 3;
      const yearBoost = Math.max(0, car.year - 2005) / 20;
      const power =
        car.engine.horsepower ??
        (car.engine.fuelType === 'electric' ? 250 : (car.engine.displacement ?? 2.0) * 70);

      switch (rankBy) {
        case 'efficiency':
          return mpg * (car.engine.fuelType === 'electric' || car.engine.fuelType === 'hybrid' ? 1.2 : 1);
        case 'power':
          return power / (price / 1000);
        case 'value':
          return (mpg * safety * (1 + yearBoost * 0.1)) / (price / 10000);
        case 'match':
        default: {
          let score = (mpg * safety * (1 + yearBoost * 0.1)) / (price / 10000);
          if (priority === 'mpg') score = mpg * 2;
          if (priority === 'power') score = power / (price / 1000);
          if (priority === 'safety') score = safety * 20 + mpg;
          if (priority === 'space') {
            score = (['suv', 'minivan', 'wagon'].includes(car.bodyStyle) ? 1.4 : 1) * mpg;
          }
          return score;
        }
      }
    },
    [rankBy, priority],
  );

  const rankedCars = useMemo(() => {
    let list = [...allCars];

    if (fuelTypeFilter === 'electric') {
      list = list.filter((c) => c.engine.fuelType === 'electric');
    } else if (fuelTypeFilter === 'hybrid') {
      list = list.filter(
        (c) => c.engine.fuelType === 'hybrid' || c.engine.fuelType === 'plug-in hybrid',
      );
    } else if (fuelTypeFilter === 'gasoline-only') {
      list = list.filter((c) => c.engine.fuelType === 'gasoline');
    } else if (fuelTypeFilter === 'gasoline') {
      list = list.filter(
        (c) =>
          c.engine.fuelType === 'gasoline' ||
          c.engine.fuelType === 'hybrid' ||
          c.engine.fuelType === 'plug-in hybrid',
      );
    }

    list.sort((a, b) => scoreCar(b) - scoreCar(a));
    return list;
  }, [allCars, fuelTypeFilter, scoreCar]);

  const picks = rankedCars.slice(0, PICK_COUNT);
  const moreCount = Math.max(0, rankedCars.length - PICK_COUNT);
  const pickDiff = useMemo(() => differentiateCars(picks), [picks]);

  const catalogHref = `/home?${searchQueryToParams(
    {
      filters: quizFilters,
      sort: { field: 'year', order: 'desc' },
      collapseByModel: true,
    },
    1,
  ).toString()}`;

  const compareHref =
    picks.length >= 2
      ? `/compare?cars=${picks.map((c) => c.id).join(',')}`
      : null;

  const answerLine = [
    persona,
    priority && `cares about ${priority}`,
    usage && `for ${usage}`,
    `est. $${minPrice.toLocaleString()}–$${maxPrice >= 999999 ? '100k+' : maxPrice.toLocaleString()} CAD`,
  ]
    .filter(Boolean)
    .join(' · ');

  if (loading) {
    return <LoadingScreen label="Picking three cars" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Matches unavailable"
        message={error}
        onRetry={loadVehicles}
        backTo="/"
        backLabel="Home"
      />
    );
  }

  return (
    <PageShell>
      <ToolPageHeader
        backTo="/"
        backLabel="Home"
        title="Three picks"
        subtitle={copy.title}
        action={
          <Link
            to="/?quiz=1"
            className="text-xs text-zinc-500 hover:text-white min-h-[44px] inline-flex items-center"
          >
            Retake quiz
          </Link>
        }
      />

      <PageBody>
        <p className="text-sm text-zinc-400 mb-1">{answerLine}</p>
        <p className="text-xs text-zinc-600 mb-6">
          Three cars that fit — with plain-English notes on how they differ, so you can choose.
        </p>

        {pickDiff.axes.length > 0 && picks.length > 1 && (
          <div className="mb-6 pb-5 border-b border-zinc-800">
            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
              How these three differ
            </p>
            <ul className="space-y-2">
              {pickDiff.axes.map((axis) => (
                <li key={axis} className="text-base text-zinc-200 leading-snug">
                  {axis}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-8 pb-5 border-b border-zinc-900">
          <SelectMenu
            aria-label="Rank picks"
            size="sm"
            className="w-40"
            value={rankBy}
            onChange={(v) => setRankBy(v as RankBy)}
            options={[
              { value: 'match', label: 'Best match' },
              { value: 'efficiency', label: 'Efficiency' },
              { value: 'value', label: 'Value' },
              { value: 'power', label: 'Power / $' },
            ]}
          />
          <div className="flex gap-1">
            {(
              [
                ['all', 'All'],
                ['gasoline', 'Gas'],
                ['electric', 'EV'],
                ['hybrid', 'Hybrid'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFuelTypeFilter(value)}
                className={`px-2 py-1 text-[10px] uppercase tracking-wider ${
                  fuelTypeFilter === value ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {picks.length === 0 ? (
          <div className="py-12">
            <p className="text-base text-zinc-300 mb-3">Nothing matched those answers.</p>
            <div className="flex flex-wrap gap-4 text-xs">
              <Link to="/?quiz=1" className="underline underline-offset-4 text-zinc-400 hover:text-white">
                Retake quiz
              </Link>
              <Link to={catalogHref} className="underline underline-offset-4 text-zinc-400 hover:text-white">
                Open Search anyway
              </Link>
            </div>
          </div>
        ) : (
          <>
            <ol>
              {picks.map((car, i) => (
                <li key={car.id} className="border-t border-zinc-800">
                  <div className="flex gap-4 py-5 items-start">
                    <span
                      className={`shrink-0 tabular-nums font-bold leading-none ${
                        i === 0 ? 'text-3xl text-white w-10' : 'text-lg text-zinc-500 w-10 pt-1'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1">
                        {i === 0 ? 'Start here' : i === 1 ? 'Strong alternative' : 'Also worth a look'}
                      </p>
                      <Link to={`/car/${car.id}`} className="group block">
                        <h2
                          className={`font-bold tracking-tight text-white group-hover:text-zinc-300 ${
                            i === 0 ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-xl'
                          }`}
                        >
                          {car.year} {car.make} {displayModelLabel(car)}
                        </h2>
                      </Link>
                      <p className="text-base sm:text-lg text-white font-medium mt-2 leading-snug">
                        {pickDiff.byCarId[car.id]?.edge ?? 'Open the dossier for full specs'}
                      </p>
                      <p className="text-xs text-zinc-500 mt-2">
                        {[
                          formatPowerForCard(car.engine.horsepower),
                          `${formatMpgForCard(car.fuelEconomy.combined)} ${
                            usesMpge(car.engine.fuelType) ? 'MPGe' : 'MPG'
                          }`,
                          car.price?.msrp != null
                            ? `est. ${formatPriceShort(car.price.msrp, true)}`
                            : null,
                          car.bodyStyle,
                          formatFuelBadge(car.engine.fuelType),
                        ]
                          .filter((x) => x && x !== 'Not on file')
                          .join(' · ')}
                      </p>
                      <Link
                        to={`/car/${car.id}`}
                        className={`inline-block mt-3 text-[10px] uppercase tracking-wider ${
                          i === 0
                            ? 'bg-white text-black px-3 py-2 font-semibold hover:bg-zinc-200'
                            : 'text-zinc-400 border-b border-zinc-700 hover:text-white hover:border-white pb-0.5'
                        }`}
                      >
                        {i === 0 ? 'Open this car' : 'View'}
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-8 pt-6 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
              {compareHref && (
                <Link
                  to={compareHref}
                  className="text-xs uppercase tracking-wider text-white border border-zinc-600 px-4 py-2.5 hover:border-white text-center sm:text-left"
                >
                  Compare these {picks.length}
                </Link>
              )}
              <Link to="/?quiz=1" className="text-xs text-zinc-500 hover:text-white">
                Change answers
              </Link>
              {moreCount > 0 && (
                <Link to={catalogHref} className="text-xs text-zinc-500 hover:text-white sm:ml-auto">
                  {moreCount}+ more in Search →
                </Link>
              )}
            </div>
          </>
        )}
      </PageBody>
    </PageShell>
  );
}
