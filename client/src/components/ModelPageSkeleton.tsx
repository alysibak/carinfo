/**
 * The model page's outline while it loads: the name, the photo beside what
 * to check, and the years, where each will land. A spinner said only that
 * something was coming.
 */
export default function ModelPageSkeleton() {
  const block = 'bg-zinc-900';
  return (
    <div className="bg-black" role="status" aria-live="polite">
      <span className="sr-only">Loading every year</span>
      <div aria-hidden className="animate-pulse motion-reduce:animate-none">
        <div className="border-b border-zinc-900">
          <div className="page-wrap py-4 sm:py-6">
            <div className={`h-4 w-16 ${block}`} />
            <div className={`h-8 md:h-9 w-56 mt-5 ${block}`} />
            <div className={`h-3 w-64 max-w-full mt-3 ${block}`} />
          </div>
        </div>
        <div className="page-wrap section-y-tight">
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-[15rem_1fr] lg:grid-cols-[26rem_1fr] items-start mb-8">
            <div className={`aspect-[3/2] ${block}`} />
            <div className="min-w-0">
              <div className={`h-4 w-60 max-w-full ${block}`} />
              <div className={`h-4 w-80 max-w-full mt-2 ${block}`} />
              <div className={`h-5 w-36 mt-8 ${block}`} />
              <div className={`h-4 w-full max-w-xl mt-3 ${block}`} />
              <div className={`h-4 w-2/3 max-w-md mt-2 ${block}`} />
            </div>
          </div>
          <div className={`h-5 w-40 ${block}`} />
          <div className="mt-4 border-t border-zinc-900">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-6 h-14 border-b border-zinc-900">
                <div className={`h-4 w-12 ${block}`} />
                <div className={`h-4 w-24 ${block}`} />
                <div className={`h-4 w-20 hidden sm:block ${block}`} />
                <div className={`h-4 w-10 ${block}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
