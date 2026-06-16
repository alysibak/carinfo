interface FilterPillsProps {
  options: { id: string; label: string; description?: string; count?: number }[];
  activeIds: string[];
  onToggle: (id: string) => void;
  compact?: boolean;
}

export default function FilterPills({
  options,
  activeIds,
  onToggle,
  compact = false,
}: FilterPillsProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${compact ? '' : ''}`}>
      {options.map((opt) => {
        const active = activeIds.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onToggle(opt.id)}
            title={opt.description}
            className={`text-left border transition-colors ${
              compact ? 'px-3 py-1.5 text-xs' : 'px-3 py-2 text-xs'
            } ${
              active
                ? 'bg-white text-black border-white'
                : 'border-zinc-700 text-zinc-300 hover:border-zinc-400 hover:text-white bg-black'
            }`}
          >
            <span className="font-semibold tracking-wide">{opt.label}</span>
            {opt.count != null && (
              <span className={`ml-1.5 ${active ? 'text-zinc-600' : 'text-zinc-500'}`}>
                ({opt.count.toLocaleString()})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
