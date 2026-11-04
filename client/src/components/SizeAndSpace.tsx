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
import { typicalOf } from '../utils/keyFigures';
import { SpecLabel } from './SpecExplain';
import { Chevron, foldSummaryClass } from './ui';
import { msg, t } from '../i18n';
import { fmtNumber } from '../i18n/format';

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

/** "long, wide and tall". */
function listWords(words: readonly string[]): string {
  if (words.length <= 1) return words[0] ?? '';
  return t('{list} and {last}', {
    list: words.slice(0, -1).join(', '),
    last: words.at(-1)!,
  });
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

  const unitOptions = [
    ['m', msg('Metres')],
    ['ft', msg('Feet')],
  ] as const;

  return (
    <details className="mt-4 border-t border-zinc-900 group/fit">
      <summary className={`${foldSummaryClass} py-3 text-sm text-zinc-200 hover:text-white`}>
        {t('Will it fit your garage or spot?')}
        <Chevron className="w-3.5 h-3.5 text-zinc-500 group-open/fit:rotate-180" />
      </summary>
      <fieldset>
        <legend className="sr-only">{t('Will it fit your garage or spot?')}</legend>
        <p className="text-xs text-zinc-400 mt-1 mb-3">
          {t('Measure the space and enter it here.')}
        </p>
        <div
          role="radiogroup"
          aria-label={t('Unit')}
          className="inline-flex border border-zinc-800 mb-3"
        >
          {unitOptions.map(([value, text]) => (
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
              {t(text)}
            </label>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label htmlFor={`${id}-length`} className="text-xs text-zinc-400">
            {t('Length ({unit})', { unit })}
            <input
              id={`${id}-length`}
              type="number"
              inputMode="decimal"
              min={0}
              step={unit === 'm' ? 0.05 : 0.5}
              placeholder={unit === 'm' ? t('e.g. 6') : t('e.g. 20')}
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className={inputClass}
            />
          </label>
          <label htmlFor={`${id}-width`} className="text-xs text-zinc-400">
            {t('Width ({unit})', { unit })}
            <input
              id={`${id}-width`}
              type="number"
              inputMode="decimal"
              min={0}
              step={unit === 'm' ? 0.05 : 0.5}
              placeholder={unit === 'm' ? t('e.g. 3') : t('e.g. 10')}
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
              {check.fits ? t('It fits') : t('It does not fit')}
            </span>
            <span className="text-zinc-300">
              {': '}
              {check.spareLengthCm >= 0
                ? t('{gap} to spare in length', {
                    gap: formatGap(check.spareLengthCm, unit),
                  })
                : t('{gap} too long', { gap: formatGap(check.spareLengthCm, unit) })}
              {', '}
              {check.spareWidthCm >= 0
                ? t('{gap} in width', { gap: formatGap(check.spareWidthCm, unit) })
                : t('{gap} too wide', { gap: formatGap(check.spareWidthCm, unit) })}
              {several ? t(', for its longest and widest version') : ''}.
            </span>
            <span className="block text-xs text-zinc-400 mt-1">
              {t(
                'The width is the body without mirrors. Leave room to open the doors and walk around it.',
              )}
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
  // Measurements about those of the class are said once, together: "About the
  // same length as a typical compact SUV" three times over read as filler.
  const outside = size
    ? ([
        ['length', size.lengthCm, msg('long')],
        ['width', size.widthCm, msg('wide')],
        ['height', size.heightCm, msg('tall')],
        ['weight', size.curbWeightKg, msg('heavy')],
      ] as const)
    : [];
  const against = new Map(outside.map(([measure, span]) => [measure, vs(measure, span)]));
  const isAlike = (said: string | null | undefined) =>
    !!said && (said.startsWith('About') || said.startsWith('À peu près'));
  const alike = outside.filter(([measure]) => isAlike(against.get(measure))).map(([, , word]) => t(word));
  const differs = (measure: (typeof outside)[number][0]) => {
    const said = against.get(measure);
    return said && !isAlike(said) ? said : null;
  };
  const several = (size?.measured.length ?? 0) > 1;

  return (
    <section id="size" className="border-b border-zinc-900 scroll-mt-32">
      <div className="page-wrap-wide section-y-tight">
        <h2 className="block-title mb-1">{t('Size and space')}</h2>
        {compared && (
          <p className="text-[13px] text-zinc-400 mb-3">
            {alike.length > 0 && (
              <span className="text-zinc-200">
                {t('About as {words} as {typical}. ', {
                  words: listWords(alike),
                  typical: typicalOf(className!),
                })}
              </span>
            )}
            {t('Against the middle of other {classPlural}, {min}–{max}.', {
              classPlural: classPlural(className!),
              min: cls!.years.min,
              max: cls!.years.max,
            })}
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 md:gap-x-10 gap-y-6">
          {size && (
            <div className="min-w-0">
              <Measure
                label={t('Length')}
                value={formatMetres(size.lengthCm)}
                alt={formatFeet(size.lengthCm)}
                comparison={differs('length')}
              />
              <Measure
                label={t('Width without mirrors')}
                value={formatMetres(size.widthCm)}
                alt={formatFeet(size.widthCm)}
                comparison={differs('width')}
              />
              <Measure
                label={t('Height')}
                value={formatMetres(size.heightCm)}
                alt={formatFeet(size.heightCm)}
                comparison={differs('height')}
              />
              <Measure
                label={t('Weight')}
                value={formatKg(size.curbWeightKg)}
                alt={formatLb(size.curbWeightKg)}
                comparison={differs('weight')}
                glossaryKey="curbWeight"
              />
            </div>
          )}
          <div className="min-w-0">
            {luggage != null && (
              <Measure
                label={luggageLabel(car.bodyStyle)}
                value={t('{litres} L', { litres: fmtNumber(litres(luggage)) })}
                alt={t('{cuFt} cu ft', { cuFt: luggage })}
                comparison={
                  cls?.luggage && className
                    ? volumeVsClass(
                        luggageLabel(car.bodyStyle) === t('Trunk') ? 'trunk' : 'cargo',
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
                label={t('Room for passengers')}
                value={t('{litres} L', { litres: fmtNumber(litres(passenger)) })}
                alt={t('{cuFt} cu ft', { cuFt: passenger })}
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
          {size && t('Outside: Transport Canada. ')}
          {(luggage || passenger) && t('Inside: EPA. ')}
          {several &&
            t('{count} versions measured; where they differ, both ends are shown.', {
              count: size!.measured.length,
            })}
        </p>
      </div>
    </section>
  );
}
