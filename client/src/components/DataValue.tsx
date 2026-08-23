import {
  UNAVAILABLE_LABEL,
  formatOrFallback,
  isUnavailableFormatted,
  type FormatOptions,
} from '../utils/dataValue';
import type { SpecGlossaryKey } from '../utils/specGlossary';
import { TIER1_EXPANDABLE, TIER2_VALUE, TIER3_LABEL } from '../utils/visualTiers';
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
  valueTier,
  pairLayout = false,
}: {
  label: string;
  value: number | string | null | undefined;
  allowZero?: boolean;
  suffix?: string;
  total?: boolean;
  glossaryKey?: SpecGlossaryKey;
  /** 1 = decision-critical, 2 = supporting. Omit for legacy dossier row styling. */
  valueTier?: 1 | 2;
  /** Constrain label/value pair width for ownership rows. */
  pairLayout?: boolean;
}) {
  const labelClass = valueTier != null ? TIER3_LABEL : 'text-xs text-zinc-400';
  const valueClass =
    valueTier === 1
      ? TIER1_EXPANDABLE
      : valueTier === 2
        ? TIER2_VALUE
        : 'text-sm font-bold text-white';

  const isPrimaryPair = pairLayout && valueTier === 1;

  const row = (
    <div
      className={`flex py-2 border-b border-zinc-900 last:border-b-0 ${
        isPrimaryPair
          ? 'flex-col gap-0.5 items-start'
          : 'items-baseline justify-between gap-3'
      } ${total ? 'border-t border-zinc-700 mt-2 pt-3' : ''}`}
    >
      <span className={`${labelClass} shrink-0`}>
        {glossaryKey ? <SpecLabel label={label} glossaryKey={glossaryKey} /> : label}
      </span>
      <DataValue
        value={value}
        suffix={suffix}
        allowZero={allowZero}
        className={`${valueClass}${isPrimaryPair ? '' : ' text-right'}`}
        missingClassName="text-xs font-normal text-zinc-400 italic"
      />
    </div>
  );

  if (pairLayout) {
    return <div className={isPrimaryPair ? 'max-w-sm' : 'max-w-md'}>{row}</div>;
  }

  return row;
}

export { UNAVAILABLE_LABEL };
