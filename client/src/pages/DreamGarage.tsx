import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGarageStore, FREE_GARAGE_LIMIT } from '../stores/garageStore';
import { cardStatClass, formatEngineForCard, formatMpgForCard, formatPriceShort } from '../utils/dataValue';
import SignInPromptSlot from '../components/SignInPromptSlot';
import ToolPageHeader from '../components/ToolPageHeader';
import { ConfirmDialog, Modal, StatusToast } from '../components/ui';

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
  const formattedValue = totalValue >= 1_000_000
    ? `$${(totalValue / 1_000_000).toFixed(2)}M`
    : `$${Math.round(totalValue / 1000)}k`;
  const uniqueMakes = new Set(garage.map((car) => car.make)).size;
  const avgMPG = garage.length > 0
    ? Math.round(garage.reduce((sum, car) => sum + (car.fuelEconomy.combined || 0), 0) / garage.length)
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
              className="min-h-[44px] px-2 -mr-2 text-xs tracking-[0.2em] sm:tracking-[0.3em] text-zinc-400 hover:text-red-500 transition-colors"
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
                <Link
                  to="/account"
                  className="text-xs uppercase tracking-widest text-white hover:underline shrink-0"
                >
                  Upgrade to Pro →
                </Link>
              )}
            </div>
          )}
        </div>
        {garage.length === 0 ? (
          <div className="max-w-4xl mx-auto text-center py-32">
            <svg
              className="w-32 h-32 mx-auto mb-8 text-zinc-900"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>

            <h2 className="text-2xl font-bold tracking-tight mb-3 uppercase">
              No vehicles saved yet
            </h2>
            <p className="text-sm text-zinc-400 mb-8 max-w-md mx-auto leading-relaxed">
              Browse or search to save cars here. Use Compare when you&apos;re ready to decide.
            </p>
            <Link to="/home" className="btn-primary text-xs">
              Browse vehicles
            </Link>
          </div>
        ) : (
          <div>
            {/* Garage Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-800 border border-zinc-800 mb-12">
              <div className="bg-zinc-950 p-4">
                <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Est. total value</p>
                <p className="text-3xl font-bold tabular-nums text-white">{formattedValue}</p>
              </div>
              <div className="bg-zinc-950 p-4">
                <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Makes</p>
                <p className="text-3xl font-bold tabular-nums text-white">{uniqueMakes}</p>
              </div>
              <div className="bg-zinc-950 p-4">
                <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Avg MPG</p>
                <p className="text-3xl font-bold tabular-nums text-white">{avgMPG}</p>
              </div>
              <div className="bg-zinc-950 p-4">
                <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-2">Vehicles</p>
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
                    <span className="text-lg font-black text-zinc-300">#{index + 1}</span>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromGarage(car.id)}
                    className="absolute top-4 right-4 w-10 h-10 bg-zinc-950 border border-zinc-800 flex items-center justify-center hover:bg-red-600 hover:border-red-600 transition-all group/remove"
                  >
                    <svg className="w-5 h-5 text-zinc-300 group-hover/remove:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {/* Year */}
                  <div className="mb-4 mt-12">
                    <p className="text-3xl sm:text-5xl font-black text-zinc-300 group-hover:text-zinc-400 transition-colors">
                      {car.year}
                    </p>
                  </div>

                  {/* Make & Model */}
                  <div className="mb-6">
                    <h3 className="text-2xl font-black tracking-tight mb-1 group-hover:tracking-wide transition-all">
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
                      <p className="text-xs tracking-widest text-zinc-300 mb-1 uppercase">Engine</p>
                      <p className={cardStatClass(formatEngineForCard(car.engine.fuelType, car.engine.displacement))}>
                        {formatEngineForCard(car.engine.fuelType, car.engine.displacement)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs tracking-widest text-zinc-300 mb-1 uppercase">MPG</p>
                      <p className={cardStatClass(formatMpgForCard(car.fuelEconomy.combined))}>
                        {formatMpgForCard(car.fuelEconomy.combined)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs tracking-widest text-zinc-300 mb-1 uppercase">Est. Value</p>
                      <p className={cardStatClass(formatPriceShort(car.price?.msrp))}>
                        {formatPriceShort(car.price?.msrp)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs tracking-widest text-zinc-300 mb-1 uppercase">Type</p>
                      <p className="text-lg font-bold capitalize">{car.bodyStyle}</p>
                    </div>
                  </div>

                  {/* View Button */}
                  <button
                    onClick={() => navigate(`/car/${car.id}`)}
                    className="w-full flex items-center justify-center gap-2 text-xs tracking-widest text-zinc-300 group-hover:text-white transition-all py-2 border border-zinc-900 group-hover:border-zinc-700"
                  >
                    <span>VIEW DETAILS</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal open={showShareModal} onClose={() => setShowShareModal(false)} title="Share your garage">
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
            className="flex-1 btn-primary text-xs tracking-[0.2em]"
          >
            {copiedAgain ? 'Copied' : 'Copy link'}
          </button>
          <button
            type="button"
            onClick={() => setShowShareModal(false)}
            className="flex-1 btn-secondary text-xs tracking-[0.2em]"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
}
