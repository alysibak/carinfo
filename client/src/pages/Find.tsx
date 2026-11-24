import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import * as api from '../services/api';
import { usePageMeta } from '../utils/pageMeta';
import { searchQueryToParams } from '../utils/searchParams';
import {
  answersFromParams,
  answersToParams,
  CARRY,
  finderQuery,
  HOW_NEW,
  MUST_HAVES,
  RUNS_ON,
  type FinderAnswers,
} from '../utils/finder';
import { intlLocale, t, tp } from '../i18n';

function Choice({
  on,
  onClick,
  label,
  note,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  note?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`text-left min-h-[48px] px-3.5 py-2.5 border transition-colors ${
        on
          ? 'border-accent bg-accent/10 text-white'
          : 'border-zinc-800 bg-zinc-950 text-zinc-200 hover:border-zinc-500'
      }`}
    >
      <span className="block text-[15px]">{label}</span>
      {note && <span className="block text-xs text-zinc-400 mt-0.5">{note}</span>}
    </button>
  );
}

function Question({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="border-t border-zinc-900 pt-6 mt-6 first:border-t-0 first:pt-0 first:mt-0">
      <legend className="float-left w-full mb-3 text-base font-semibold text-white">
        <span className="text-accent tabular-nums mr-2">{number}</span>
        {title}
      </legend>
      <div className="clear-left grid grid-cols-2 sm:grid-cols-4 gap-2">{children}</div>
    </fieldset>
  );
}

/**
 * Three questions instead of 37,000 versions: what the car carries, what it
 * runs on and how new it is, each optional, then must-haves. The count of
 * models that fit updates as you answer, so no answer leads to nothing.
 */
export default function Find() {
  usePageMeta(
    t('Find a car in 3 questions'),
    t(
      'What it carries, what it runs on and how new: answer what you know and see the models that fit, from EPA, NHTSA and Transport Canada records.',
    ),
  );
  const [params, setParams] = useSearchParams();
  const answers = useMemo(() => answersFromParams(params), [params]);
  const [count, setCount] = useState<number | null>(null);

  const update = (next: Partial<FinderAnswers>) =>
    setParams(answersToParams({ ...answers, ...next }), { replace: true });
  const toggle = <K extends 'carry' | 'runsOn' | 'howNew'>(key: K, value: FinderAnswers[K]) =>
    update({ [key]: answers[key] === value ? undefined : value } as Partial<FinderAnswers>);

  const query = useMemo(() => finderQuery(answers), [answers]);
  const resultsLink = `/home?${searchQueryToParams(query, 1).toString()}`;

  // How many models fit, a moment after the last answer.
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api
        .searchCars({ ...query, limit: 1, offset: 0 }, { signal: controller.signal })
        .then((res) => setCount(res.total))
        .catch(() => {
          if (!controller.signal.aborted) setCount(null);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const answered = !!(answers.carry || answers.runsOn || answers.howNew || answers.must.length);
  const years = (from: number, to?: number) =>
    to ? t('{from} to {to}', { from, to }) : t('{year} or newer', { year: from });

  return (
    <div className="bg-black text-white pb-36">
      <div className="page-wrap pt-8 sm:pt-10 max-w-3xl">
        <PageHeader
          title={t('Find a car in 3 questions')}
          subtitle={t(
            'Answer what you know and skip the rest. We don’t ask your budget: every price on file is an estimate, so a budget would sort cars on our guesses.',
          )}
        />

        <div className="mt-8">
          <Question number={1} title={t('What will it carry?')}>
            {CARRY.map((option) => (
              <Choice
                key={option.id}
                on={answers.carry === option.id}
                onClick={() => toggle('carry', option.id)}
                label={t(option.label)}
                note={t(option.note)}
              />
            ))}
          </Question>

          <Question number={2} title={t('What should it run on?')}>
            {RUNS_ON.map((option) => (
              <Choice
                key={option.id}
                on={answers.runsOn === option.id}
                onClick={() => toggle('runsOn', option.id)}
                label={t(option.label)}
              />
            ))}
          </Question>

          <Question number={3} title={t('How new?')}>
            {HOW_NEW.map((option) => (
              <Choice
                key={option.id}
                on={answers.howNew === option.id}
                onClick={() => toggle('howNew', option.id)}
                label={years(option.from, option.to)}
              />
            ))}
          </Question>

          <fieldset className="border-t border-zinc-900 pt-6 mt-6">
            <legend className="float-left w-full mb-3 text-base font-semibold text-white">
              {t('Must-haves')}{' '}
              <span className="font-normal text-sm text-zinc-400">{t('(optional)')}</span>
            </legend>
            <div className="clear-left flex flex-wrap gap-2">
              {MUST_HAVES.map((option) => {
                const on = answers.must.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      update({
                        must: on
                          ? answers.must.filter((id) => id !== option.id)
                          : [...answers.must, option.id],
                      })
                    }
                    className={`chip ${on ? 'chip-on' : ''}`}
                  >
                    {t(option.label)}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>
      </div>

      {/* The answer, always in reach: how many models fit, and the way to them. */}
      <div className="fixed inset-x-0 bottom-(--tabbar-height) z-30 border-t border-zinc-800 bg-black/95 backdrop-blur">
        <div className="page-wrap max-w-3xl py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-zinc-300" aria-live="polite">
            {count == null
              ? t('Counting…')
              : count === 0
                ? t('No model fits all of these. Take one away.')
                : tp(count, '{count} model fits', '{count} models fit', {
                    count: count.toLocaleString(intlLocale()),
                  })}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {answered && (
              <button
                type="button"
                onClick={() => setParams(new URLSearchParams(), { replace: true })}
                className="btn-ghost min-h-[44px] text-sm"
              >
                {t('Start over')}
              </button>
            )}
            {count === 0 ? (
              <span className="btn-primary opacity-50 min-h-[44px]" aria-disabled>
                {t('Show them')}
              </span>
            ) : (
              <Link to={resultsLink} className="btn-primary min-h-[44px]">
                {t('Show them')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
