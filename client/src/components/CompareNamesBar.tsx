import { useEffect, useRef, useState, type RefObject } from 'react';
import type { CarSpecs } from '../types/car.types';
import { displayModelLabel } from '../utils/trimLabel';

/**
 * The cars' names over their columns once the table's own heading row has
 * scrolled away: a long table read "3", "0", "Standard" with nothing to say
 * whose they were. The table scrolls sideways in a box of its own, where a
 * heading row cannot stick to the page, so this is a bar of its own that
 * shows under the site header and follows the table sideways. Its columns
 * are the table's: the same fixed layout and widths.
 */
export default function CompareNamesBar({
  cars,
  headRef,
  scrollRef,
  labelColClass,
  carColClass,
}: {
  cars: CarSpecs[];
  /** The table's heading row: the bar shows once it is under the header. */
  headRef: RefObject<HTMLElement | null>;
  /** The box the table scrolls sideways in. */
  scrollRef: RefObject<HTMLElement | null>;
  labelColClass: string;
  carColClass: string;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const head = headRef.current;
    const box = scrollRef.current;
    if (!head || !box) return;
    const place = () => {
      const header =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue('--header-height'),
        ) || 0;
      const table = box.getBoundingClientRect();
      // Past the heading row, and still over the table.
      setShown(head.getBoundingClientRect().bottom < header && table.bottom > header + 80);
    };
    const follow = () => {
      if (barRef.current) barRef.current.scrollLeft = box.scrollLeft;
    };
    place();
    follow();
    window.addEventListener('scroll', place, { passive: true });
    window.addEventListener('resize', place);
    box.addEventListener('scroll', follow, { passive: true });
    return () => {
      window.removeEventListener('scroll', place);
      window.removeEventListener('resize', place);
      box.removeEventListener('scroll', follow);
    };
  }, [headRef, scrollRef, cars.length]);

  useEffect(() => {
    // Shown again after scrolling sideways meanwhile: line up at once.
    if (shown && barRef.current && scrollRef.current) {
      barRef.current.scrollLeft = scrollRef.current.scrollLeft;
    }
  }, [shown, scrollRef]);

  return (
    // No height of its own, so the table below does not move when it shows.
    <div className="sticky z-20 h-0" style={{ top: 'var(--header-height, 64px)' }} aria-hidden>
      <div
        ref={barRef}
        className={`overflow-hidden -mx-4 sm:mx-0 bg-black/90 backdrop-blur-md border-b border-zinc-800 transition-opacity duration-150 motion-reduce:transition-none ${
          shown ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <table className="w-full border-collapse table-fixed min-w-full">
          <colgroup>
            <col className={labelColClass} />
            {cars.map((car) => (
              <col key={car.id} className={carColClass} />
            ))}
          </colgroup>
          <tbody>
            <tr>
              {/* Pinned as the table's label column is, so a car scrolled under it hides here too. */}
              <td className="sticky left-0 z-10 bg-black px-3 sm:px-4 py-2" />
              {cars.map((car) => (
                <td
                  key={car.id}
                  className="px-2 sm:px-4 py-2 border-l border-zinc-800 text-left sm:text-center"
                >
                  <span className="block text-xs sm:text-[13px] font-semibold text-white truncate">
                    {car.year} {car.make} {displayModelLabel(car)}
                  </span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
