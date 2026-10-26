import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGarageStore, FREE_GARAGE_LIMIT } from '../stores/garageStore';
import { formatMoneyShort } from '../utils/money';
import { useAccountStatus } from '../hooks/useAccountStatus';
import ToolPageHeader from '../components/ToolPageHeader';
import { ConfirmDialog, Modal, StatusToast } from '../components/ui';
import * as api from '../services/api';
import type { CarSpecs } from '../types/car.types';
import { COLLECTIONS } from '../config/collections';
import {
  displayModelFamilyLabel,
  displayModelLabel,
  displayVehicleTitle,
} from '../utils/trimLabel';
import { efficiencyOf } from '../utils/efficiency';
import { rankedFigure } from '../utils/rankedFigure';
import VehiclePlaceholder from '../components/VehiclePlaceholder';
import CarCard from '../components/CarCard';
import CarRecordsNote from '../components/CarRecordsNote';

interface GarageStat {
  label: string;
  value: string;
  unit?: string;
  /** The saved car the figure is of. */
  car?: CarSpecs;
  estimate?: boolean;
}

/** The saved car that leads on a figure (none where no car has it), and the figure. */
function leadingCar(
  cars: CarSpecs[],
  best: 'min' | 'max',
  figure: (car: CarSpecs) => number | null,
): { car: CarSpecs; value: number } | null {
  let lead: { car: CarSpecs; value: number } | null = null;
  for (const car of cars) {
    const value = figure(car);
    if (value == null) continue;
    if (!lead || (best === 'min' ? value < lead.value : value > lead.value)) lead = { car, value };
  }
  return lead;
}

/**
 * An empty garage offers cars to start with, the leading pick of each
 * shortlist, each savable in one tap. It used to show a large padlock
 * outline: an odd picture for "nothing saved yet", and nothing to do.
 */
function GarageSuggestions({ onSaved }: { onSaved: (message: string) => void }) {
  const [cars, setCars] = useState<{ car: CarSpecs; list: string; figure: string | null }[] | null>(
    null,
  );
  const add = useGarageStore((s) => s.add);
  const saved = useGarageStore((s) => s.cars);

  useEffect(() => {
    let active = true;
    api
      .getCollectionPreviews()
      .then((previews) => {
        if (!active) return;
        // One of each model: two lists both led with a Prius.
        const seen = new Set<string>();
        const model = (c: CarSpecs) => `${c.make} ${displayModelFamilyLabel(c)}`;
        const picks: { car: CarSpecs; list: string; figure: string | null }[] = [];
        for (const collection of Object.values(COLLECTIONS)) {
          const car = previews[collection.id]?.find((c) => !seen.has(model(c)));
          if (!car) continue;
          seen.add(model(car));
          picks.push({
            car,
            list: collection.title,
            figure: rankedFigure(car, collection.display?.rankBy),
          });
        }
        setCars(picks.slice(0, 6));
      })
      .catch(() => {
        if (active) setCars([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (cars == null) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[68px] border border-zinc-900 bg-zinc-950" />
        ))}
      </div>
    );
  }
  if (cars.length === 0) return null;

  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {cars.map(({ car, list, figure }) => {
        const isSaved = saved.some((c) => c.id === car.id);
        return (
          <li
            key={car.id}
            className="flex items-center gap-3 border border-zinc-800 bg-zinc-950 p-3"
          >
            <span className="w-14 h-9 shrink-0 overflow-hidden" aria-hidden>
              <VehiclePlaceholder car={car} compact hideCaption />
            </span>
            <Link to={`/car/${car.id}`} className="min-w-0 flex-1 group">
              <span className="block text-sm font-semibold text-white truncate group-hover:underline underline-offset-2">
                {car.year} {car.make} {displayModelLabel(car)}
              </span>
              <span className="block text-xs text-zinc-400 truncate">
                {[list, figure].filter(Boolean).join(' · ')}
              </span>
            </Link>
            <button
              type="button"
              disabled={isSaved}
              onClick={async () => {
                const res = await Promise.resolve(add(car));
                onSaved(res.ok ? 'Saved to garage' : (res.message ?? 'Could not save'));
              }}
              className={`chip shrink-0 ${isSaved ? 'chip-on' : ''}`}
            >
              {isSaved ? 'Saved' : 'Save'}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function DreamGarage() {
  const [shareLink, setShareLink] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [copiedAgain, setCopiedAgain] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const garage = useGarageStore((s) => s.cars);
  const removeFromGarage = useGarageStore((s) => s.remove);
  const clearGarage = useGarageStore((s) => s.clear);
  const plan = useGarageStore((s) => s.plan);
  const garageLimit = useGarageStore((s) => s.garageLimit);
  const syncMode = useGarageStore((s) => s.syncMode);
  const lastSyncError = useGarageStore((s) => s.lastSyncError);
  const billingConfigured = Boolean(useAccountStatus()?.billingConfigured);
  const navigate = useNavigate();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const generateShareLink = async () => {
    const carIds = garage.map((car) => car.id).join(',');
    const link = `${window.location.origin}/shared-garage?cars=${carIds}`;
    setShareLink(link);
    setShowShareModal(true);
    setCopiedAgain(false);

    try {
      await navigator.clipboard.writeText(link);
      setToast('Link copied to clipboard');
    } catch {
      setToast('Share link ready — copy from the dialog');
    }
  };

  // What a shortlist is for: which of the saved cars leads, and on what. The
  // estimate comes last and says it is one. (A sum of the cars' estimated
  // values, and a count of their makes, said nothing to someone buying one.)
  const fiveStar = garage.filter((car) => (car.safetyRating?.overall ?? 0) >= 5).length;
  const thriftiest = leadingCar(garage, 'min', (car) => {
    const efficiency = efficiencyOf(car);
    return efficiency?.unit === 'L/100 km' ? efficiency.value : null;
  });
  const strongest = leadingCar(garage, 'max', (car) => car.engine.horsepower || null);
  const cheapestToRun = leadingCar(garage, 'min', (car) => car.runningCostCad || null);
  const garageStats: GarageStat[] = [
    { label: 'NHTSA 5-star', value: `${fiveStar} of ${garage.length}` },
    {
      label: 'Lowest fuel use',
      value: thriftiest ? thriftiest.value.toFixed(1) : '—',
      unit: thriftiest ? 'L/100 km' : undefined,
      car: thriftiest?.car,
    },
    {
      label: 'Most power',
      value: strongest ? String(strongest.value) : '—',
      unit: strongest ? 'hp' : undefined,
      car: strongest?.car,
    },
    {
      label: 'Cheapest to run (est.)',
      value: cheapestToRun ? formatMoneyShort(cheapestToRun.value) : '—',
      unit: cheapestToRun ? 'a year' : undefined,
      car: cheapestToRun?.car,
      estimate: true,
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <StatusToast message={toast} />
      <ConfirmDialog
        open={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={clearGarage}
        title="Clear your garage?"
        message="This removes every saved vehicle from your garage. You can't undo this."
        confirmLabel="Clear all"
        danger
      />

      <ToolPageHeader
        wide
        backTo="/"
        backLabel="Home"
        title="Your garage"
        subtitle={`${garage.length} ${garage.length === 1 ? 'car' : 'cars'} saved`}
        action={
          garage.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="min-h-[44px] px-2 -mr-2 text-xs text-zinc-400 hover:text-red-500 transition-colors"
            >
              Clear
            </button>
          ) : undefined
        }
      />

      <div className="pt-8 pb-16 page-wrap-wide">
        <div className="mb-8 space-y-3">
          {lastSyncError && (
            <p className="text-sm text-amber-200/90 border border-zinc-800 bg-zinc-950 px-4 py-3">
              {lastSyncError}
            </p>
          )}
          {plan === 'free' && (
            <div className="border border-zinc-800 bg-zinc-950 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-zinc-400">
                {billingConfigured ? 'Free plan · ' : ''}
                {garage.length}/{garageLimit ?? FREE_GARAGE_LIMIT} cars
                {syncMode === 'cloud' ? ' · saved to your account' : ' · this device'}
              </p>
              {billingConfigured && (
                <Link to="/account" className="text-xs text-white hover:underline shrink-0">
                  Upgrade to Pro →
                </Link>
              )}
            </div>
          )}
        </div>
        {garage.length === 0 ? (
          <div className="max-w-4xl py-8 sm:py-12">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Nothing saved yet</h2>
            <p className="text-[15px] text-zinc-400 mb-6 max-w-lg leading-relaxed">
              Save cars from any search result or car page to keep a shortlist here. Start with one
              of these, or search for your own.
            </p>
            <GarageSuggestions onSaved={setToast} />
            <div className="flex flex-wrap gap-2 mt-6">
              <Link to="/home" className="btn-primary">
                Search cars
              </Link>
              <Link to="/browse" className="btn-secondary">
                Browse
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-800 border border-zinc-800 mb-8">
              {garageStats.map((stat) => (
                <div key={stat.label} className="bg-zinc-950 p-4 min-w-0">
                  <dt className="field-label mb-2">{stat.label}</dt>
                  <dd>
                    <span
                      className={`text-2xl sm:text-3xl font-bold tabular-nums ${
                        stat.estimate ? 'text-zinc-300' : 'text-white'
                      }`}
                    >
                      {stat.value}
                    </span>
                    {stat.unit && <span className="ml-1 text-xs text-zinc-400">{stat.unit}</span>}
                    {/* Which car, where only one of several leads. */}
                    {stat.car && garage.length > 1 && (
                      <span className="block mt-1 text-xs text-zinc-400 truncate">
                        {displayVehicleTitle(stat.car)}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-wrap items-center gap-3 mb-8">
              <button
                onClick={() =>
                  navigate(
                    `/compare?cars=${garage
                      .slice(0, 5)
                      .map((c) => c.id)
                      .join(',')}`,
                  )
                }
                disabled={garage.length < 2}
                className="btn-primary"
              >
                Compare saved
              </button>
              <button onClick={generateShareLink} className="btn-secondary">
                Share garage
              </button>
            </div>

            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {garage.map((car) => (
                <li key={car.id}>
                  <CarCard
                    car={car}
                    onRemove={() => removeFromGarage(car.id)}
                    notes={<CarRecordsNote carId={car.id} />}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Modal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Share your garage"
      >
        <p className="text-sm tracking-wide text-zinc-400 mb-6">
          Anyone with this link can see the cars you saved and add them to their own garage.
        </p>

        <div className="bg-zinc-950 border border-zinc-900 p-4 mb-6 font-mono text-sm break-all">
          {shareLink}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch gap-3">
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(shareLink);
                setCopiedAgain(true);
                setToast('Link copied');
              } catch {
                setToast('Could not copy — select the link above');
              }
            }}
            className="flex-1 btn-primary"
          >
            {copiedAgain ? 'Copied' : 'Copy link'}
          </button>
          <button
            type="button"
            onClick={() => setShowShareModal(false)}
            className="flex-1 btn-secondary"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
}
