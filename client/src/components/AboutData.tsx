import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useModalFocus } from '../hooks/useModalFocus';

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
              Fuel economy and engine specs from <strong className="text-zinc-200 font-medium">EPA</strong>.
              Crash safety from <strong className="text-zinc-200 font-medium">NHTSA</strong> when we find a match
              (~13% of vehicles on file). Horsepower from the EPA test-car list when matched (~71%).
              Market value and running costs are <strong className="text-zinc-200 font-medium">Ontario-baseline
              estimates in CAD</strong>, always labeled, never live listing prices.
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
        <Link
          to="/methodology"
          className="mt-3 inline-block text-[10px] tracking-[0.2em] text-zinc-400 hover:text-white uppercase transition-colors"
        >
          Read full methodology →
        </Link>
      </div>
      {open && <AboutDataModal onClose={() => setOpen(false)} />}
    </>
  );
}

function AboutDataModal({ onClose }: { onClose: () => void }) {
  const containerRef = useModalFocus(true, onClose);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-data-title"
    >
      <div
        ref={containerRef}
        className="max-w-lg w-full bg-black border border-zinc-800 p-8 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="about-data-title" className="text-lg font-black tracking-tight uppercase mb-6">
          How CarInfo works
        </h2>
        <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
          <p>
            <span className="text-white font-bold">Sourced (EPA)</span>: MPG/MPGe, engine size, fuel
            type, drive, transmission, CO₂, annual fuel cost, and EV range/charge times from
            FuelEconomy.gov bulk data.
          </p>
          <p>
            <span className="text-white font-bold">Sourced (NHTSA)</span>: Crash-test star ratings when
            NHTSA has tested that make/model/year. NHTSA tests far fewer configurations than EPA lists,
            so most vehicles show no rating. That is expected, not a lookup failure.
          </p>
          <p>
            <span className="text-white font-bold">Curated (EPA test car)</span>: Rated horsepower when
            matched to an EPA test-car record. EV motor output may be estimated when no test-car match exists.
          </p>
          <p>
            <span className="text-white font-bold">Estimated (Ontario CAD)</span>: Market value uses a
            depreciation model with USD MSRP anchors converted to CAD. Running costs use Ontario gas,
            electricity, insurance, and registration baselines at ~15,000 km/yr. Every estimate shows a
            confidence label.
          </p>
          <p>
            <span className="text-white font-semibold">Not included</span>: Live dealer listing prices,
            dimensions, torque, real 0–60 times, or listing photos. Body-type illustrations only.
            We omit uncertain fields rather than invent them.
          </p>
        </div>
        <Link
          to="/methodology"
          onClick={onClose}
          className="mt-6 block text-center text-[10px] tracking-[0.2em] text-zinc-400 hover:text-white uppercase"
        >
          Full methodology page →
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-3 bg-white text-black text-xs font-black tracking-[0.25em] uppercase hover:bg-zinc-200 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
