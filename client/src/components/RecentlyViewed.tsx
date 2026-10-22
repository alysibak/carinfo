import { Link } from 'react-router-dom';
import { useRecentStore } from '../stores/recentStore';

/** At most a row of them: a reminder, not a list to read. */
const SHOWN = 4;

/**
 * The cars opened last on this device, a tap away: someone back after a day,
 * or hopping between the two they are deciding on, starts where they left
 * off. Nothing shows until a car page has been opened.
 */
export default function RecentlyViewed({
  exclude,
  className = '',
}: {
  /** The car on screen, which needs no link to itself. */
  exclude?: string;
  className?: string;
}) {
  const cars = useRecentStore((state) => state.cars);
  const clear = useRecentStore((state) => state.clear);
  const shown = cars.filter((car) => car.id !== exclude).slice(0, SHOWN);
  if (shown.length === 0) return null;

  return (
    <section aria-labelledby="recently-viewed" className={`@container ${className}`}>
      <div className="flex items-center justify-between gap-4 mb-3">
        <h2 id="recently-viewed" className="text-base font-bold tracking-tight">
          Recently viewed
        </h2>
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center min-h-[44px] min-w-[44px] justify-end -my-3 text-xs text-zinc-500 hover:text-white underline underline-offset-4 decoration-zinc-700"
        >
          Clear
        </button>
      </div>
      <ul className="flex gap-2 overflow-x-auto snap-x snap-mandatory overscroll-x-contain -mx-4 px-4 scroll-px-4 pb-1 @2xl:mx-0 @2xl:px-0 @2xl:grid @2xl:grid-cols-4 @2xl:overflow-visible">
        {shown.map((car) => (
          <li key={car.id} className="snap-start shrink-0 w-[13.5rem] @2xl:w-auto">
            <Link
              to={`/car/${car.id}`}
              className="group flex h-full flex-col justify-center border border-zinc-800 hover:border-zinc-500 bg-zinc-950 px-3.5 py-3 min-h-[64px] transition-colors"
            >
              <span className="block text-sm font-semibold text-white group-hover:underline underline-offset-4 decoration-zinc-600">
                {car.title}
              </span>
              {car.detail && (
                <span className="block text-xs text-zinc-500 mt-0.5 line-clamp-2">
                  {car.detail}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-zinc-500 mt-2">Kept on this device only.</p>
    </section>
  );
}
