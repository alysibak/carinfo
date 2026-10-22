import { useId, useState } from 'react';
import type { CarDashboard } from '../types/car.types';
import { litres, luggageLabel } from '../utils/space';
import {
  fitCheck,
  formatFeet,
  formatGap,
  formatKg,
  formatLb,
  formatMetres,
  sizeVsClass,
  volumeVsClass,
} from '../utils/size';
import type { SpecGlossaryKey } from '../utils/specGlossary';
import { SpecLabel } from './SpecExplain';
import { Chevron, foldSummaryClass } from './ui';

const CM_PER_FOOT = 30.48;

/**
 * One measurement: the figure in metric, the same in feet or pounds beneath
 * it, and how it sits against the class in words.
 */
function Measure({
  label,
  value,
  alt,
  comparison,
  glossaryKey,
}: {
  label: string;
  value: string;
  alt?: string;
  comparison?: string | null;
  glossaryKey?: SpecGlossaryKey;
}) {
  return (
    <div className="py-2.5 border-b border-zinc-900">
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className="text-zinc-400 min-w-0">
          <SpecLabel label={label} glossaryKey={glossaryKey} />
        </span>
        <span className="text-white font-semibold tabular-nums text-right">{value}</span>
      </div>
      {(comparison || alt) && (
        <div className="flex items-baseline justify-between gap-4 mt-0.5 text-xs">
          <span className="text-zinc-300 min-w-0">{comparison}</span>
          {alt && <span className="text-zinc-500 tabular-nums text-right shrink-0">{alt}</span>}
        </div>
      )}
    </div>
  );
}

/** "compact SUVs", "sport compacts". */
function classPlural(className: string): string {
  const noun = className.charAt(0).toLowerCase() + className.slice(1);
  return noun.endsWith('s') ? noun : `${noun}s`;
}

/**
 * Whether the car fits a space the shopper measured, in metres or feet,
 * against its longest and widest version.
 */
function WillItFit({ size }: { size: NonNullable<CarDashboard['car']['size']> }) {
  const id = useId();
  const [unit, setUnit] = useState<'m' | 'ft'>('m');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const toCm = (text: string) => Number(text) * (unit === 'm' ? 100 : CM_PER_FOOT);
  // What was typed is converted, not reread in the new unit.
  const switchUnit = (next: 'm' | 'ft') => {
    if (next === unit) return;
    const convert = (text: string) => {
      const n = Number(text);
      if (!text || !(n > 0)) return text;
      const cm = toCm(text);
      return String(Math.round((next === 'm' ? cm / 100 : cm / CM_PER_FOOT) * 100) / 100);
    };
    setLength(convert(length));
    setWidth(convert(width));
    setUnit(next);
  };
  const check =
    Number(length) > 0 && Number(width) > 0 ? fitCheck(size, toCm(length), toCm(width)) : null;
  const several = size.measured.length > 1;
  const inputClass =
    'mt-1 w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm tabular-nums text-white focus:outline-hidden focus:border-zinc-500';

  return (
    <details className="mt-4 border-t border-zinc-900 group/fit">
      <summary className={`${foldSummaryClass} py-3 text-sm text-zinc-200 hover:text-white`}>
        Will it fit your garage or spot?
        <Chevron className="w-3.5 h-3.5 text-zinc-500 group-open/fit:rotate-180" />
      </summary>
      <fieldset>
        <legend className="sr-only">Will it fit your garage or spot?</legend>
        <p className="text-xs text-zinc-400 mt-1 mb-3">Measure the space and enter it here.</p>
        <div
          role="radiogroup"
          aria-label="Unit"
          className="inline-flex border border-zinc-800 mb-3"
        >
          {(
            [
              ['m', 'Metres'],
              ['ft', 'Feet'],
            ] as const
          ).map(([value, text]) => (
            <label
              key={value}
              className={`inline-flex items-center min-h-9 px-3 text-xs cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-zinc-300 ${
                unit === value ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <input
                type="radio"
                name={`${id}-unit`}
                value={value}
                checked={unit === value}
                onChange={() => switchUnit(value)}
                className="sr-only"
              />
              {text}
            </label>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label htmlFor={`${id}-length`} className="text-xs text-zinc-400">
            Length ({unit})
            <input
              id={`${id}-length`}
              type="number"
              inputMode="decimal"
              min={0}
              step={unit === 'm' ? 0.05 : 0.5}
              placeholder={unit === 'm' ? 'e.g. 6' : 'e.g. 20'}
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className={inputClass}
            />
          </label>
          <label htmlFor={`${id}-width`} className="text-xs text-zinc-400">
            Width ({unit})
            <input
              id={`${id}-width`}
              type="number"
              inputMode="decimal"
              min={0}
              step={unit === 'm' ? 0.05 : 0.5}
              placeholder={unit === 'm' ? 'e.g. 3' : 'e.g. 10'}
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
        {check && (
          <p className="text-sm mt-3 leading-relaxed" role="status">
            <span
              className={check.fits ? 'text-accent font-semibold' : 'text-amber-400 font-semibold'}
            >
              {check.fits ? 'It fits' : 'It does not fit'}
            </span>
            <span className="text-zinc-300">
              {': '}
              {check.spareLengthCm >= 0
                ? `${formatGap(check.spareLengthCm, unit)} to spare in length`
                : `${formatGap(check.spareLengthCm, unit)} too long`}
              {', '}
              {check.spareWidthCm >= 0
                ? `${formatGap(check.spareWidthCm, unit)} in width`
                : `${formatGap(check.spareWidthCm, unit)} too wide`}
              {several ? ', for its longest and widest version' : ''}.
            </span>
            <span className="block text-xs text-zinc-400 mt-1">
              The width is the body without mirrors. Leave room to open the doors and walk around
              it.
            </span>
          </p>
        )}
      </fieldset>
    </details>
  );
}

/**
 * How big the car is and how much fits in it, in plain words: Transport
 * Canada's measurements and EPA's interior volumes, each in metric with feet
 * or pounds beside it, and each against the middle of its class. Nothing here
 * is estimated.
 */
export default function SizeAndSpace({ dashboard }: { dashboard: CarDashboard }) {
  const { car, classComparison: cls } = dashboard;
  const size = car.size;
  const luggage = car.epa?.luggageVolumeCuFt;
  const passenger = car.epa?.passengerVolumeCuFt;
  if (!size && !luggage && !passenger) return null;

  const className = cls?.className;
  const vs = (measure: 'length' | 'width' | 'height' | 'weight', span: [number, number]) => {
    const stat = cls?.[measure];
    return stat && className ? sizeVsClass(measure, span, stat.median, className) : null;
  };
  const compared =
    !!className &&
    !!(cls?.length || cls?.width || cls?.height || cls?.weight || cls?.luggage || cls?.passenger);
  const several = (size?.measured.length ?? 0) > 1;

  return (
    <section id="size" className="border-b border-zinc-900 scroll-mt-32">
      <div className="page-wrap-wide section-y-tight">
        <h2 className="text-base font-bold tracking-tight mb-1">Size and space</h2>
        {compared && (
          <p className="text-[13px] text-zinc-400 mb-3">
            Against the middle of other {classPlural(className!)}, {cls!.years.min}–{cls!.years.max}
            .
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 md:gap-x-10 gap-y-6">
          {size && (
            <div className="min-w-0">
              <Measure
                label="Length"
                value={formatMetres(size.lengthCm)}
                alt={formatFeet(size.lengthCm)}
                comparison={vs('length', size.lengthCm)}
              />
              <Measure
                label="Width without mirrors"
                value={formatMetres(size.widthCm)}
                alt={formatFeet(size.widthCm)}
                comparison={vs('width', size.widthCm)}
              />
              <Measure
                label="Height"
                value={formatMetres(size.heightCm)}
                alt={formatFeet(size.heightCm)}
                comparison={vs('height', size.heightCm)}
              />
              <Measure
                label="Weight"
                value={formatKg(size.curbWeightKg)}
                alt={formatLb(size.curbWeightKg)}
                comparison={vs('weight', size.curbWeightKg)}
                glossaryKey="curbWeight"
              />
            </div>
          )}
          <div className="min-w-0">
            {luggage != null && (
              <Measure
                label={luggageLabel(car.bodyStyle)}
                value={`${litres(luggage).toLocaleString('en-CA')} L`}
                alt={`${luggage} cu ft`}
                comparison={
                  cls?.luggage && className
                    ? volumeVsClass(
                        luggageLabel(car.bodyStyle) === 'Trunk' ? 'trunk' : 'cargo',
                        cls.luggage,
                        className,
                      )
                    : null
                }
                glossaryKey="luggageVolume"
              />
            )}
            {passenger != null && (
              <Measure
                label="Room for passengers"
                value={`${litres(passenger).toLocaleString('en-CA')} L`}
                alt={`${passenger} cu ft`}
                comparison={
                  cls?.passenger && className
                    ? volumeVsClass('passenger', cls.passenger, className)
                    : null
                }
                glossaryKey="passengerVolume"
              />
            )}
            {size && <WillItFit size={size} />}
          </div>
        </div>
        <p className="text-xs text-zinc-500 mt-4">
          {size && 'Outside: Transport Canada. '}
          {(luggage || passenger) && 'Inside: EPA. '}
          {several &&
            `${size!.measured.length} versions measured; where they differ, both ends are shown.`}
        </p>
      </div>
    </section>
  );
}
