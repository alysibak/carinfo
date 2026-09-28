import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGarageStore, FREE_GARAGE_LIMIT } from '../stores/garageStore';
import {
  cardStatClass,
  formatEngineForCard,
  formatMpgForCard,
  formatPriceShort,
} from '../utils/dataValue';
import SignInPromptSlot from '../components/SignInPromptSlot';
import ToolPageHeader from '../components/ToolPageHeader';
import { ConfirmDialog, Modal, StatusToast } from '../components/ui';
import { bodyStyleLabel } from '../utils/bodyStyleLabel';
import * as api from '../services/api';
import type { CarSpecs } from '../types/car.types';
import { COLLECTIONS } from '../config/collections';
import { displayModelLabel } from '../utils/trimLabel';
import VehiclePlaceholder from '../components/VehiclePlaceholder';

/**
 * An empty garage offers cars to start with, the leading pick of each
 * shortlist, each savable in one tap. It used to show a large padlock
 * outline: an odd picture for "nothing saved yet", and nothing to do.
 */
function GarageSuggestions({ onSaved }: { onSaved: (message: string) => void }) {
  const [cars, setCars] = useState<{ car: CarSpecs; list: string }[] | null>(null);
  const add = useGarageStore((s) => s.add);
  const saved = useGarageStore((s) => s.cars);

  useEffect(() => {
    let active = true;
    api
      .getCollectionPreviews()
      .then((previews) => {
        if (!active) return;
        const seen = new Set<string>();
        const picks: { car: CarSpecs; list: string }[] = [];
        for (const collection of Object.values(COLLECTIONS)) {
          const car = previews[collection.id]?.find((c) => !seen.has(c.id));
          if (!car) continue;
          seen.add(car.id);
          picks.push({ car, list: collection.title });
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
      <div className="grid sm:grid-cols-2 gap-2" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[68px] border border-zinc-900 bg-zinc-950" />
        ))}
      </div>
    );
  }
  if (cars.length === 0) return null;

  return (
    <ul className="grid sm:grid-cols-2 gap-2">
      {cars.map(({ car, list }) => {
        const isSaved = saved.some((c) => c.id === car.id);
        const price = formatPriceShort(car.price?.msrp, false);
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
                {list}
                {price !== 'Not on file' ? ` · ~${price}` : ''}
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

  const totalValue = garage.reduce((sum, car) => sum + (car.price?.msrp || 0), 0);
  const formattedValue =
    totalValue >= 1_000_000
      ? `$${(totalValue / 1_000_000).toFixed(2)}M`
      : `$${Math.round(totalValue / 1000)}k`;
  const uniqueMakes = new Set(garage.map((car) => car.make)).size;
  const avgMPG =
    garage.length > 0
      ? Math.round(
          garage.reduce((sum, car) => sum + (car.fuelEconomy.combined || 0), 0) / garage.length,
        )
      : 0;

  return (
    <div className="min-h-screen bg-black text-white">
      <StatusToast message={toast} />
      <ConfirmDialog
        open={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={clearGarage}
        title="Clear dream garage?"
        message="This removes every saved vehicle from your garage. You can't undo this."
        confirmLabel="Clear all"
        danger
      />

      <ToolPageHeader
        backTo="/"
        backLabel="Home"
        title="Dream Garage"
        subtitle={`${garage.length} vehicle${garage.length !== 1 ? 's' : ''}`}
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
          <SignInPromptSlot />
          {lastSyncError && (
            <p className="text-sm text-amber-200/90 border border-zinc-800 bg-zinc-950 px-4 py-3">
              {lastSyncError}
            </p>
          )}
          {plan === 'free' && (
            <div className="border border-zinc-800 bg-zinc-950 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-zinc-400">
                Free plan · {garage.length}/{garageLimit ?? FREE_GARAGE_LIMIT} vehicles
                {syncMode === 'cloud' ? ' · synced' : ' · this device'}
              </p>
              {import.meta.env.VITE_CLERK_PUBLISHABLE_KEY && (
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
              Save cars from any search result or car page to keep a shortlist here, on this device.
              Start with one of these, or search for your own.
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
            {/* Garage Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-800 border border-zinc-800 mb-12">
              <div className="bg-zinc-950 p-4">
                <p className="text-xs text-zinc-400 mb-2">Est. total value</p>
                <p className="text-3xl font-bold tabular-nums text-white">{formattedValue}</p>
              </div>
              <div className="bg-zinc-950 p-4">
                <p className="text-xs text-zinc-400 mb-2">Makes</p>
                <p className="text-3xl font-bold tabular-nums text-white">{uniqueMakes}</p>
              </div>
              <div className="bg-zinc-950 p-4">
                <p className="text-xs text-zinc-400 mb-2">Avg MPG</p>
                <p className="text-3xl font-bold tabular-nums text-white">{avgMPG}</p>
              </div>
              <div className="bg-zinc-950 p-4">
                <p className="text-xs text-zinc-400 mb-2">Vehicles</p>
                <p className="text-3xl font-bold tabular-nums text-white">{garage.length}</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 mb-12">
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
                className={`btn-primary text-xs ${garage.length < 2 ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                Compare saved
              </button>
              <button onClick={generateShareLink} className="btn-secondary text-xs">
                Share garage
              </button>
            </div>

            {/* Garage Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-900">
              {garage.map((car, index) => (
                <div
                  key={car.id}
                  className="bg-black p-8 hover:bg-zinc-950 transition-all duration-300 border border-zinc-900 hover:border-zinc-700 group relative"
                >
                  {/* Position Badge */}
                  <div className="absolute top-4 left-4 w-10 h-10 bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                    <span className="text-lg font-bold text-zinc-300">#{index + 1}</span>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromGarage(car.id)}
                    className="absolute top-4 right-4 w-10 h-10 bg-zinc-950 border border-zinc-800 flex items-center justify-center hover:bg-red-600 hover:border-red-600 transition-all group/remove"
                  >
                    <svg
                      className="w-5 h-5 text-zinc-300 group-hover/remove:text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>

                  {/* Year */}
                  <div className="mb-4 mt-12">
                    <p className="text-3xl sm:text-5xl font-bold text-zinc-300 group-hover:text-zinc-400 transition-colors">
                      {car.year}
                    </p>
                  </div>

                  {/* Make & Model */}
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold tracking-tight mb-1 group-hover:tracking-wide transition-all">
                      {car.make.toUpperCase()}
                    </h3>
                    <p className="text-lg font-light tracking-wider text-zinc-400 group-hover:text-zinc-400 transition-colors">
                      {car.model}
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-zinc-900 group-hover:bg-zinc-700 transition-colors mb-6" />

                  {/* Specs Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-xs text-zinc-300 mb-1">Engine</p>
                      <p
                        className={cardStatClass(
                          formatEngineForCard(car.engine.fuelType, car.engine.displacement),
                        )}
                      >
                        {formatEngineForCard(car.engine.fuelType, car.engine.displacement)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-300 mb-1">MPG</p>
                      <p className={cardStatClass(formatMpgForCard(car.fuelEconomy.combined))}>
                        {formatMpgForCard(car.fuelEconomy.combined)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-300 mb-1">Est. Value</p>
                      <p className={cardStatClass(formatPriceShort(car.price?.msrp))}>
                        {formatPriceShort(car.price?.msrp)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-300 mb-1">Type</p>
                      <p className="text-lg font-bold">{bodyStyleLabel(car.bodyStyle)}</p>
                    </div>
                  </div>

                  {/* View Button */}
                  <button
                    onClick={() => navigate(`/car/${car.id}`)}
                    className="w-full flex items-center justify-center gap-2 text-xs text-zinc-300 group-hover:text-white transition-all py-2 border border-zinc-900 group-hover:border-zinc-700"
                  >
                    <span>VIEW DETAILS</span>
                    <svg
                      className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Share your garage"
      >
        <p className="text-sm tracking-wide text-zinc-400 mb-6">
          Anyone with this link can view your saved vehicles and add them to their own garage.
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
            className="flex-1 btn-primary text-xs"
          >
            {copiedAgain ? 'Copied' : 'Copy link'}
          </button>
          <button
            type="button"
            onClick={() => setShowShareModal(false)}
            className="flex-1 btn-secondary text-xs"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
}
