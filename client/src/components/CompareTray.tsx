import { Link, useLocation } from 'react-router-dom';
import { useCarStore } from '../stores/carStore';
import { displayModelLabel } from '../utils/trimLabel';
import { formatCompareIds, MAX_COMPARE } from '../utils/compareIds';

/** Sticky shortlist that follows the user until they open Compare. */
export default function CompareTray() {
  const location = useLocation();
  const comparedCars = useCarStore((s) => s.comparedCars);
  const removeCarFromComparison = useCarStore((s) => s.removeCarFromComparison);
  const clearComparison = useCarStore((s) => s.clearComparison);

  if (comparedCars.length === 0) return null;
  if (location.pathname === '/compare') return null;

  const compareHref = `/compare?cars=${formatCompareIds(comparedCars.map((c) => c.id))}`;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-40 border-t border-zinc-700 bg-black/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      role="region"
      aria-label="Compare shortlist"
    >
      <div className="page-wrap py-2.5 flex items-center gap-2 sm:gap-3">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500 shrink-0 tabular-nums">
          {comparedCars.length}/{MAX_COMPARE}
        </p>

        <ul className="flex-1 flex items-center gap-2 overflow-x-auto min-w-0 py-0.5">
          {comparedCars.map((car) => (
            <li
              key={car.id}
              className="flex items-center gap-1.5 shrink-0 border border-zinc-800 bg-zinc-950 pl-2 pr-1 py-1"
            >
              <Link
                to={`/car/${car.id}`}
                className="text-xs text-zinc-200 hover:text-white truncate max-w-[9.5rem]"
              >
                {car.year} {car.make}{' '}
                <span className="text-zinc-500">{displayModelLabel(car)}</span>
              </Link>
              <button
                type="button"
                onClick={() => removeCarFromComparison(car.id)}
                className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:text-white text-sm"
                aria-label={`Remove ${car.year} ${car.make} from compare`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={clearComparison}
          className="text-[10px] uppercase tracking-wider text-zinc-500 hover:text-zinc-300 shrink-0 hidden sm:inline"
        >
          Clear
        </button>
        <Link
          to={compareHref}
          className="shrink-0 px-3 py-2 bg-white text-black text-[10px] font-semibold uppercase tracking-wider hover:bg-zinc-200"
        >
          Compare
        </Link>
      </div>
    </div>
  );
}
