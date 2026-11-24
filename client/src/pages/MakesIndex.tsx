import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import * as api from '../services/api';
import type { MakeIndexEntry } from '../types/car.types';
import { usePageMeta } from '../utils/pageMeta';
import { t, tp } from '../i18n';

function MakeTile({ make }: { make: MakeIndexEntry }) {
  return (
    <li>
      <Link to={make.path} className="choice-tile h-full">
        <span className="min-w-0">
          <span className="block text-[15px] text-white">{make.make}</span>
          <span className="block text-xs text-zinc-400 mt-0.5 tabular-nums">
            {make.onSale > 0
              ? t('{models} · {onSale} on sale', {
                  models: tp(make.models, '{count} model', '{count} models'),
                  onSale: make.onSale,
                })
              : tp(make.models, '{count} model', '{count} models')}
          </span>
        </span>
      </Link>
    </li>
  );
}

/** Every make with model pages, A to Z: those selling models now, then the rest. */
export default function MakesIndex() {
  usePageMeta(
    t('Every make, A to Z'),
    t('Every make with models on file since 1995: open one to see its models, year by year.'),
  );
  const [makes, setMakes] = useState<MakeIndexEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api
      .getMakeIndex()
      .then(setMakes)
      .catch(() => setFailed(true));
  }, []);

  const current = makes?.filter((make) => make.onSale > 0) ?? [];
  const past = makes?.filter((make) => make.onSale === 0) ?? [];

  return (
    <div className="bg-black text-white pb-12">
      <div className="page-wrap pt-8 sm:pt-10">
        <PageHeader
          title={t('Every make, A to Z')}
          subtitle={t('Open a make to see its models, the ones on sale first.')}
        />
        {failed && (
          <p role="alert" className="mt-6 text-sm text-red-300">
            {t('Could not load the makes. Try again.')}
          </p>
        )}
        {!makes && !failed && (
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-2" aria-hidden>
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="h-[62px] border border-zinc-900 bg-zinc-950 animate-pulse" />
            ))}
          </div>
        )}
        {current.length > 0 && (
          <section className="mt-8" aria-labelledby="makes-current">
            <h2 id="makes-current" className="section-title mb-4">
              {t('Selling models now')}
            </h2>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {current.map((make) => (
                <MakeTile key={make.path} make={make} />
              ))}
            </ul>
          </section>
        )}
        {past.length > 0 && (
          <section className="mt-10" aria-labelledby="makes-past">
            <h2 id="makes-past" className="section-title mb-4">
              {t('Earlier models only')}
            </h2>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {past.map((make) => (
                <MakeTile key={make.path} make={make} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
