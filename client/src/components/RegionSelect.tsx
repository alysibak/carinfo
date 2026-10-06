import { REGION_OPTIONS, useRegionStore } from '../stores/regionStore';

/**
 * The region cost estimates are worked out for. It sits beside the estimates
 * it changes (a car's estimated costs, compare's estimate rows) rather than in
 * the site header, where it made costs look like the point of the site.
 */
export default function RegionSelect({ className = '' }: { className?: string }) {
  const region = useRegionStore((s) => s.region);
  const setRegion = useRegionStore((s) => s.setRegion);
  return (
    <label className={`inline-flex items-center gap-2 text-[13px] text-zinc-400 ${className}`}>
      <span>Costs for</span>
      <select
        value={region}
        onChange={(e) => setRegion(e.target.value as typeof region)}
        className="bg-black border border-zinc-700 text-zinc-200 text-[13px] px-2 py-1.5 min-h-[36px] focus:outline-hidden focus:border-accent"
        aria-label="Costs for region"
      >
        {REGION_OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id} className="bg-zinc-950 text-white">
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
