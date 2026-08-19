import {
  UNAVAILABLE_LABEL,
  formatOrFallback,
  isUnavailableFormatted,
  type FormatOptions,
} from '../utils/dataValue';
import type { SpecGlossaryKey } from '../utils/specGlossary';
import { SpecLabel } from './SpecExplain';

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
  missingClassName = 'text-sm font-normal text-zinc-400 italic',
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
  total,
  glossaryKey,
}: {
  label: string;
  value: number | string | null | undefined;
  allowZero?: boolean;
  suffix?: string;
  total?: boolean;
  glossaryKey?: SpecGlossaryKey;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-2.5 border-b border-zinc-900 last:border-b-0 ${
        total ? 'border-t border-zinc-700 mt-1 pt-3' : ''
      }`}
    >
      <span className="text-[10px] tracking-widest text-zinc-400 uppercase shrink-0">
        {glossaryKey ? <SpecLabel label={label} glossaryKey={glossaryKey} /> : label}
      </span>
      <DataValue
        value={value}
        suffix={suffix}
        allowZero={allowZero}
        className="text-sm font-medium tabular-nums text-white text-right"
      />
    </div>
  );
}

export { UNAVAILABLE_LABEL };
