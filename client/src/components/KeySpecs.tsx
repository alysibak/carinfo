import type { CarDashboard, CarSpecs } from '../types/car.types';
import { formatEngineForDetail, hasNumericValue } from '../utils/dataValue';
import { formatFuelTypeLabel } from '../utils/fuelDisplay';
import DataValue from './DataValue';

/** Honest about which performance fields EPA carries vs. omits. */
const SPEC_GAP_NOTE =
  'Horsepower is EPA’s rated figure when available. Torque and 0–60 times aren’t part of EPA’s records, so they’re left off rather than estimated.';

/** Engine descriptor from the fields EPA actually carries (displacement + layout). */
function engineCharacter(car: CarSpecs): string | null {
  const label = formatEngineForDetail(car.engine);
  return label === 'Not on file' ? null : label;
}

function transmissionLabel(car: CarSpecs): string | null {
  const t = car.transmission;
  if (t.description) return t.description;
  if (!t.type) return null;
  const base = t.type.charAt(0).toUpperCase() + t.type.slice(1);
  return hasNumericValue(t.speeds) ? `${t.speeds}-spd ${base}` : base;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

interface Spec {
  label: string;
  value: string | number | null | undefined;
}

/**
 * Always-visible "what is this car" block. Leads with the powertrain character
 * (e.g. "5.0L V8") that EPA data does carry but the page previously buried — and
 * is honest, via the footnote, about the performance figures EPA simply omits.
 */
export default function KeySpecs({ dashboard }: { dashboard: CarDashboard }) {
  const { car, zeroToSixty, evCharge } = dashboard;
  const isEv = car.engine.fuelType === 'electric';
  const isFcev = car.engine.fuelType === 'hydrogen';

  const specs: Spec[] = [{ label: 'Engine', value: engineCharacter(car) }];

  if (hasNumericValue(car.engine.horsepower)) {
    specs.push({ label: 'Horsepower', value: `${car.engine.horsepower} hp` });
  }
  if (!isEv && !isFcev && hasNumericValue(car.engine.cylinders)) {
    specs.push({ label: 'Cylinders', value: car.engine.cylinders });
  }
  specs.push({ label: 'Drivetrain', value: car.driveType });
  specs.push({ label: 'Transmission', value: transmissionLabel(car) });
  if (!isEv) specs.push({ label: 'Fuel', value: formatFuelTypeLabel(car.engine.fuelType) });
  if (car.bodyStyle) specs.push({ label: 'Body', value: titleCase(car.bodyStyle) });
  if (car.vehicleCategory) specs.push({ label: 'Category', value: titleCase(car.vehicleCategory) });
  if (car.epa?.vClass) specs.push({ label: 'EPA class', value: car.epa.vClass });
  if (isEv && hasNumericValue(evCharge?.rangeMiles)) {
    specs.push({ label: 'EPA range', value: `${Math.round(evCharge!.rangeMiles!)} mi` });
  }
  // Rendered only if a real/derived value ever exists — predicted 0-60 needs power
  // + weight, which EPA omits, so this stays hidden today rather than faked.
  if (zeroToSixty) {
    specs.push({
      label: '0–60 mph',
      value: `~${zeroToSixty.value}s${zeroToSixty.method === 'predicted' ? ' (est.)' : ''}`,
    });
  }

  return (
    <section className="border-b border-zinc-900">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-8">
        <p className="text-[10px] tracking-[0.3em] text-zinc-500 uppercase mb-5">Specifications</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-zinc-900 border border-zinc-900">
          {specs.map((spec) => (
            <div key={spec.label} className="bg-black p-4 md:p-5 min-w-0">
              <p className="text-[10px] tracking-[0.25em] text-zinc-500 uppercase mb-2">{spec.label}</p>
              <DataValue value={spec.value} className="text-sm md:text-base font-bold text-white break-words" />
            </div>
          ))}
        </div>
        <p className="text-[11px] text-zinc-600 leading-relaxed mt-4 max-w-3xl">{SPEC_GAP_NOTE}</p>
      </div>
    </section>
  );
}
