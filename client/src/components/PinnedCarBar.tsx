/**
 * A slim bar under the site header once the car page's figures scroll away:
 * the car, what it is worth and costs a year, and the two things a reader
 * does next. Rendered only while shown, so it is never in the tab order hidden.
 */
export default function PinnedCarBar({
  title,
  figures,
  inCompare,
  onCompare,
  onGarage,
}: {
  title: string;
  figures: string | null;
  inCompare: boolean;
  onCompare: () => void;
  onGarage: () => void;
}) {
  return (
    <div
      className="fixed inset-x-0 z-40 border-b border-zinc-800 bg-black/95 backdrop-blur-md animate-fade-in"
      style={{ top: 'var(--header-height)' }}
    >
      <div className="page-wrap-wide py-2 flex items-center gap-3 min-h-[52px]">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white truncate">{title}</p>
          {figures && <p className="text-xs text-zinc-400 tabular-nums truncate">{figures}</p>}
        </div>
        <button
          type="button"
          onClick={onGarage}
          className="hidden sm:inline-flex btn-secondary min-h-[36px]! py-1.5! px-3! text-[13px]"
        >
          Save to garage
        </button>
        <button
          type="button"
          onClick={onCompare}
          className={`${inCompare ? 'btn-secondary' : 'btn-primary'} min-h-[36px]! py-1.5! px-3! text-[13px] shrink-0`}
        >
          {inCompare ? 'In compare' : 'Add to compare'}
        </button>
      </div>
    </div>
  );
}
