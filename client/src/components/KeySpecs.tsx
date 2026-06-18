import type { CarDashboard, CarSpecs } from '../types/car.types';
import { formatEngineForDetail, hasNumericValue } from '../utils/dataValue';
import { formatFuelTypeLabel } from '../utils/fuelDisplay';
import { formatTransmissionLabel } from '../utils/trimLabel';
import DataValue from './DataValue';

const SPEC_GAP_NOTE =
  'Horsepower from the EPA Test Car List when available — a supplemental EPA dataset of rated engine outputs, separate from the main fuel economy file. Torque and 0–60 times are not in EPA records and are left off rather than estimated.';

function engineCharacter(car: CarSpecs): string | null {
  const label = formatEngineForDetail(car.engine);
  return label === 'Not on file' ? null : label;
}

function transmissionLabel(car: CarSpecs): string | null {
  if (!car.transmission?.type) return null;
  return formatTransmissionLabel(car.transmission);
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

interface Spec {
  label: string;
  value: string | number | null | undefined;
}

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
  if (zeroToSixty) {
    specs.push({
      label: '0–60 mph',
      value: `~${zeroToSixty.value}s${zeroToSixty.method === 'predicted' ? ' (est.)' : ''}`,
    });
  }

  const midpoint = Math.ceil(specs.length / 2);
  const leftCol = specs.slice(0, midpoint);
  const rightCol = specs.slice(midpoint);

  return (
    <section className="border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-6">
        <p className="text-[10px] tracking-widest text-zinc-500 uppercase mb-4 border-t border-zinc-800 pt-4">
          Full specifications
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-800 border border-zinc-800">
          {[leftCol, rightCol].map((col, colIdx) => (
            <div key={colIdx} className="min-w-0">
              {col.map((spec) => (
                <div
                  key={spec.label}
                  className="flex items-baseline justify-between gap-4 py-2 px-3 border-b border-zinc-900 last:border-b-0"
                >
                  <p className="text-[10px] tracking-widest text-zinc-500 uppercase shrink-0">
                    {spec.label}
                  </p>
                  <DataValue
                    value={spec.value}
                    className="text-sm font-medium text-white text-right tabular-nums"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
        <p className="text-xs text-zinc-600 leading-relaxed mt-3 max-w-3xl">{SPEC_GAP_NOTE}</p>
      </div>
    </section>
  );
}
