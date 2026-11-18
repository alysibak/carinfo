/**
 * Waiting on a page: its shape, a title, lines and cards, quiet and grey, so
 * nothing jumps when it arrives. Said once to a screen reader.
 */
export function LoadingScreen({ label = 'Loading' }: { label?: string }) {
  // The page's shape while it loads, so nothing jumps when it arrives.
  return (
    <div className="min-h-[40vh] bg-black page-wrap section-y" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div aria-hidden className="animate-pulse motion-reduce:animate-none">
        <div className="h-3 w-24 bg-zinc-900" />
        <div className="mt-4 h-9 w-2/3 max-w-md bg-zinc-900" />
        <div className="mt-4 space-y-2 max-w-2xl">
          <div className="h-3 w-full bg-zinc-900" />
          <div className="h-3 w-11/12 bg-zinc-900" />
          <div className="h-3 w-3/5 bg-zinc-900" />
        </div>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="h-28 border border-zinc-900 bg-zinc-950" />
          <div className="hidden sm:block h-28 border border-zinc-900 bg-zinc-950" />
          <div className="hidden sm:block h-28 border border-zinc-900 bg-zinc-950" />
        </div>
      </div>
    </div>
  );
}
