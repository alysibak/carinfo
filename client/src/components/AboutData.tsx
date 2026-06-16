import { useState } from 'react';

const DISMISSED_KEY = 'carinfo-about-data-dismissed';

export default function AboutData({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[10px] tracking-[0.25em] text-zinc-400 hover:text-white uppercase transition-colors underline underline-offset-4"
        >
          About the data
        </button>
        {open && <AboutDataModal onClose={() => setOpen(false)} />}
      </>
    );
  }

  if (dismissed) {
    return (
      <div className="text-center">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[10px] tracking-[0.25em] text-zinc-400 hover:text-zinc-400 uppercase transition-colors"
        >
          About the data
        </button>
        {open && <AboutDataModal onClose={() => setOpen(false)} />}
      </div>
    );
  }

  return (
    <>
      <div className="max-w-3xl mx-auto mb-10 border border-zinc-900 bg-zinc-950 px-6 py-5 text-left">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-zinc-400 uppercase mb-2">About the data</p>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Fuel economy and specs from <strong className="text-zinc-200 font-medium">EPA</strong>.
              Safety from <strong className="text-zinc-200 font-medium">NHTSA</strong> when available.
              Prices and ownership costs are <strong className="text-zinc-200 font-medium">Ontario-baseline estimates in CAD</strong> —
              built for comparison and planning, not live dealer listing quotes.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="text-zinc-400 hover:text-white shrink-0"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 text-[10px] tracking-[0.2em] text-zinc-400 hover:text-white uppercase transition-colors"
        >
          Read full methodology →
        </button>
      </div>
      {open && <AboutDataModal onClose={() => setOpen(false)} />}
    </>
  );
}

function AboutDataModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-data-title"
    >
      <div
        className="max-w-lg w-full bg-black border border-zinc-800 p-8 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="about-data-title" className="text-lg font-black tracking-tight uppercase mb-6">
          How CarInfo works
        </h2>
        <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
          <p>
            <span className="text-white font-bold">Sourced (EPA)</span> — MPG/MPGe, engine size, fuel
            type, drive, transmission, CO₂, annual fuel cost, and EV range/charge times from
            FuelEconomy.gov bulk data.
          </p>
          <p>
            <span className="text-white font-bold">Sourced (NHTSA)</span> — Crash-test star ratings when
            NHTSA has tested that make/model/year. Many vehicles have no rating on file.
          </p>
          <p>
            <span className="text-white font-bold">Estimated (Ontario CAD)</span> — Market value uses a
            depreciation model with USD MSRP anchors converted to CAD and adjusted for the Canadian
            used market. Running costs use Ontario gas, electricity, insurance, and registration
            baselines at ~15,000 km/yr. Percentiles compare a vehicle to similar body styles and
            model years in our database.
          </p>
          <p>
            <span className="text-white font-semibold">Not included</span> — Live dealer listing prices,
            verified horsepower, 0–60 times, dimensions, or photos. Values are model estimates, not
            pulled from AutoTrader, CarGurus, or other listing feeds. We omit or label uncertain fields
            rather than invent them.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-8 w-full py-3 bg-white text-black text-xs font-black tracking-[0.25em] uppercase hover:bg-zinc-200 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
