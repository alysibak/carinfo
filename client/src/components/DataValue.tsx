import {
  UNAVAILABLE_LABEL,
  formatOrFallback,
  isUnavailableFormatted,
  type FormatOptions,
} from '../utils/dataValue';

interface DataValueProps extends FormatOptions {
  value: number | string | null | undefined;
  className?: string;
  missingClassName?: string;
}

/** Renders a formatted value or a consistent muted "Not on file" treatment. */
export default function DataValue({
  value,
  suffix,
  allowZero,
  className = 'text-sm font-bold text-white',
  missingClassName = 'text-sm font-normal text-zinc-600 italic',
}: DataValueProps) {
  const text = formatOrFallback(value, { suffix, allowZero });
  if (isUnavailableFormatted(text)) {
    return <span className={missingClassName}>{text}</span>;
  }
  return <span className={className}>{text}</span>;
}

export function DataRow({
  label,
  value,
  allowZero,
  suffix,
}: {
  label: string;
  value: number | string | null | undefined;
  allowZero?: boolean;
  suffix?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3 border-b border-zinc-900 last:border-b-0">
      <span className="text-[10px] tracking-[0.25em] text-zinc-400 uppercase shrink-0">{label}</span>
      <DataValue value={value} suffix={suffix} allowZero={allowZero} className="text-sm font-bold text-white text-right" />
    </div>
  );
}

export { UNAVAILABLE_LABEL };
