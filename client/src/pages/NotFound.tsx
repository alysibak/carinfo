import { Link } from 'react-router-dom';
import { usePageMeta } from '../utils/pageMeta';

const QUICK_LINKS = [
  { to: '/browse', label: 'Start from a situation', desc: 'Shop by need, budget, or body type' },
  { to: '/value-matrix', label: 'Value chart', desc: 'Plot price vs efficiency across the fleet' },
  { to: '/home?fuel=electric', label: 'Electric vehicles', desc: 'EVs filtered in Search' },
  { to: '/vin', label: 'VIN lookup', desc: 'Decode any 17-character VIN' },
] as const;

export default function NotFound() {
  usePageMeta('Page not found', 'This CarInfo page does not exist.');

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-16">
      <div className="text-center max-w-lg w-full">
        <p className="text-[10px] tracking-[0.3em] text-zinc-500 uppercase mb-3">404</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          This page doesn&apos;t exist
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed mb-10">
          Wrong URL, or an old bookmark. Pick a path below — the archive is still here.
        </p>

        <div className="grid sm:grid-cols-2 gap-3 text-left mb-10">
          {QUICK_LINKS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="explore-card p-4 hover:border-zinc-500"
            >
              <p className="text-sm font-semibold text-white">{item.label}</p>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{item.desc}</p>
            </Link>
          ))}
        </div>

        <Link to="/" className="btn-primary text-xs">
          Back to home
        </Link>
      </div>
    </div>
  );
}
