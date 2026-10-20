import { useId, useState } from 'react';
import type { VehicleSize } from '../types/car.types';
import { fitCheck, formatKg, formatMetres } from '../utils/size';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-zinc-900 text-sm">
      <span className="text-zinc-400">{label}</span>
      <span className="text-white font-semibold tabular-nums text-right">{value}</span>
    </div>
  );
}

/**
 * Transport Canada's measurements of the car, and whether it fits a space the
 * shopper measures: their garage, a parking spot. Their numbers and Transport
 * Canada's, nothing assumed.
 */
export default function SizeAndFit({ size }: { size: VehicleSize }) {
  const id = useId();
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const spaceLength = Number(length);
  const spaceWidth = Number(width);
  const check =
    spaceLength > 0 && spaceWidth > 0 ? fitCheck(size, spaceLength * 100, spaceWidth * 100) : null;
  const several = size.measured.length > 1;

  return (
    <div className="min-w-0">
      <h2 className="text-base font-bold tracking-tight mb-1">Size</h2>
      <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
        Transport Canada’s measurements
        {several ? `, from the ${size.measured.length} versions it measured that match` : ''}. Width
        is the body’s, without mirrors.
      </p>
      <Row label="Length" value={formatMetres(size.lengthCm)} />
      <Row label="Width" value={formatMetres(size.widthCm)} />
      <Row label="Height" value={formatMetres(size.heightCm)} />
      <Row label="Wheelbase" value={formatMetres(size.wheelbaseCm)} />
      <Row label="Curb weight" value={formatKg(size.curbWeightKg)} />

      <fieldset className="mt-4">
        <legend className="text-xs text-zinc-300 mb-2">Will it fit? Measure your space</legend>
        <div className="grid grid-cols-2 gap-2">
          <label htmlFor={`${id}-length`} className="text-xs text-zinc-500">
            Length (m)
            <input
              id={`${id}-length`}
              type="number"
              inputMode="decimal"
              min={0}
              step={0.05}
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="mt-1 w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm tabular-nums text-white focus:outline-hidden focus:border-zinc-500"
            />
          </label>
          <label htmlFor={`${id}-width`} className="text-xs text-zinc-500">
            Width (m)
            <input
              id={`${id}-width`}
              type="number"
              inputMode="decimal"
              min={0}
              step={0.05}
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              className="mt-1 w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm tabular-nums text-white focus:outline-hidden focus:border-zinc-500"
            />
          </label>
        </div>
        {check && (
          <p className="text-sm mt-2 leading-relaxed" role="status">
            <span
              className={check.fits ? 'text-accent font-semibold' : 'text-amber-400 font-semibold'}
            >
              {check.fits ? 'Fits' : 'Does not fit'}
            </span>
            <span className="text-zinc-400">
              {' '}
              (
              {check.spareLengthCm >= 0
                ? `${check.spareLengthCm} cm to spare in length`
                : `${-check.spareLengthCm} cm too long`}
              {', '}
              {check.spareWidthCm >= 0
                ? `${check.spareWidthCm} cm in width`
                : `${-check.spareWidthCm} cm too wide`}
              {several ? ', for its longest and widest version' : ''}). Leave room to open the doors
              and walk around it.
            </span>
          </p>
        )}
      </fieldset>
    </div>
  );
}
