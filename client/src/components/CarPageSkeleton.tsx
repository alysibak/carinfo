/**
 * The car page's outline while it loads: the photo, the name and its lines,
 * the two buttons and the four figures, where each will land, so nothing
 * jumps when the page arrives.
 */
export default function CarPageSkeleton() {
  const block = 'bg-zinc-900';
  return (
    <div className="bg-black" role="status" aria-live="polite">
      <span className="sr-only">Loading the car</span>
      <div
        className="page-wrap-wide pt-5 sm:pt-6 pb-10 animate-pulse motion-reduce:animate-none"
        aria-hidden
      >
        <div className={`h-4 w-14 mb-5 ${block}`} />
        <div className="grid grid-cols-1 sm:grid-cols-[20rem_minmax(0,1fr)] gap-5 sm:gap-6">
          <div className={`aspect-[3/2] ${block}`} />
          <div className="min-w-0">
            <div className={`h-8 sm:h-10 w-3/4 max-w-sm ${block}`} />
            <div className={`h-4 w-1/2 max-w-xs mt-3 ${block}`} />
            <div className={`h-4 w-1/4 max-w-[8rem] mt-2 ${block}`} />
            <div className={`h-4 w-40 mt-5 ${block}`} />
            <div className="flex gap-2 mt-5">
              <div className={`h-11 w-36 ${block}`} />
              <div className={`h-11 w-36 ${block}`} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px mt-6 bg-zinc-900 border border-zinc-900">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-black p-4 sm:p-5 h-28 sm:h-36">
              <div className={`h-3 w-16 ${block}`} />
              <div className={`h-7 w-24 mt-4 ${block}`} />
              <div className={`h-3 w-28 mt-3 ${block}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
