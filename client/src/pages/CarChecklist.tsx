import { Link, useParams } from 'react-router-dom';
import { useEffect, useId, useState } from 'react';
import * as api from '../services/api';
import { isHttpError } from '../services/http';
import type { CarDashboard } from '../types/car.types';
import { ErrorState, LoadingScreen } from '../components/ui';
import ToolPageHeader from '../components/ToolPageHeader';
import PageShell, { PageBody } from '../components/PageShell';
import { checklistSections, type ChecklistItem } from '../utils/checklist';
import { usePageMeta } from '../utils/pageMeta';

type Status = 'loading' | 'ready' | 'missing' | 'error';

function Item({ item }: { item: ChecklistItem }) {
  const id = useId();
  const body = (
    <>
      <span className="text-sm text-zinc-200 leading-relaxed">{item.text}</span>
      {item.detail && (
        <span className="block text-xs text-zinc-500 mt-0.5 tabular-nums">{item.detail}</span>
      )}
    </>
  );
  if (!item.tick) return <li className="py-2 pl-7">{body}</li>;
  return (
    <li className="py-2">
      <label htmlFor={id} className="flex items-start gap-3 cursor-pointer">
        <input id={id} type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-accent" />
        <span className="min-w-0">{body}</span>
      </label>
    </li>
  );
}

/**
 * The car page's records as a checklist to take when seeing the car, on a
 * phone or printed: the VIN, recalls to ask about, what owners complained
 * of, open investigations, the crash rating, theft, and the facts to hold the
 * ad to. Ticks are for the visit; nothing is saved.
 */
export default function CarChecklist() {
  const { id = '' } = useParams();
  const [dashboard, setDashboard] = useState<CarDashboard | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    api
      .getCarDashboard(id)
      .then((data) => {
        if (!active) return;
        setDashboard(data);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (active) setStatus(isHttpError(err) && err.status === 404 ? 'missing' : 'error');
      });
    return () => {
      active = false;
    };
  }, [id, attempt]);

  const car = dashboard?.car;
  const name = car
    ? `${car.year} ${dashboard?.modelPage?.label ?? `${car.make} ${car.model}`}`
    : undefined;
  usePageMeta(
    name ? `Checklist: ${name}` : 'Checklist',
    name
      ? `What to check when seeing a ${name}: its recalls in Canada, what owners complained of, NHTSA's ratings and investigations, and theft, from the public records.`
      : undefined,
  );

  const carPath = `/car/${encodeURIComponent(id)}`;
  if (status === 'loading') return <LoadingScreen label="Loading the checklist" />;
  if (status === 'missing') {
    return (
      <ErrorState
        title="Car not found"
        message="No car with that id is on file."
        backTo="/home"
        backLabel="Search"
      />
    );
  }
  if (status === 'error' || !dashboard || !name) {
    return (
      <ErrorState
        title="Checklist unavailable"
        message="Could not load this car. Check your connection and try again."
        onRetry={() => setAttempt((n) => n + 1)}
        backTo={carPath}
        backLabel="Car"
      />
    );
  }

  const sections = checklistSections(dashboard);
  return (
    <PageShell>
      <ToolPageHeader backTo={carPath} backLabel="Car" title={`Checklist: ${name}`} />
      <PageBody>
        <div className="max-w-3xl">
          <p className="text-sm text-zinc-400 leading-relaxed">
            From the public records on file, to take when you see the car: keep it open on your
            phone or print it. Ticks are for the visit and are not saved.
          </p>
          <div className="flex flex-wrap gap-2 mt-4 print:hidden">
            <button type="button" onClick={() => window.print()} className="chip chip-on">
              Print
            </button>
            <Link to={carPath} className="chip">
              The {name}’s page
            </Link>
          </div>

          {sections.map((section, i) => (
            <section
              key={section.id}
              aria-labelledby={`checklist-${section.id}`}
              className="print-flow mt-8 border-t border-zinc-800 pt-4"
            >
              <h2 id={`checklist-${section.id}`} className="text-base font-bold tracking-tight">
                {i + 1}. {section.title}
              </h2>
              {section.intro && (
                <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{section.intro}</p>
              )}
              {section.items.length > 0 && (
                <ul className="mt-2 divide-y divide-zinc-900">
                  {section.items.map((item) => (
                    <Item key={`${item.text}|${item.detail ?? ''}`} item={item} />
                  ))}
                </ul>
              )}
              <p className="text-xs text-zinc-500 mt-2">Source: {section.source}.</p>
            </section>
          ))}
          {/* On paper, where the records came from and where to find them again. */}
          <p className="hidden print:block text-xs mt-8">
            {name} on CarInfo: {window.location.origin}
            {carPath}
          </p>
        </div>
      </PageBody>
    </PageShell>
  );
}
