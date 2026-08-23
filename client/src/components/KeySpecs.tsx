import type { CarDashboard, CarSpecs, ProvenanceSource } from '../types/car.types';
import { formatEngineForDetail, formatCurrency, hasNumericValue } from '../utils/dataValue';
import { displayProvenanceSource } from '../utils/dataTrust';
import { engineLayoutLabel, formatFuelTypeLabel } from '../utils/fuelDisplay';
import { displayTrimLabel, formatTransmissionLabel } from '../utils/trimLabel';
import { efficiencyUnit } from '../utils/fuelLabels';
import { fiveYearFuelSavings, fuelSavingsShort, phevModes } from '../utils/epaContent';
import { formatAnnualFuelCostCadDisplay } from '../utils/fuelLabels';
import type { SpecGlossaryKey } from '../utils/specGlossary';
import { TIER1_SPEC_EMPHASIS, TIER2_VALUE, TIER3_LABEL } from '../utils/visualTiers';
import { SpecLabel } from './SpecExplain';
import DataValue from './DataValue';
import ProvenanceChip from './ProvenanceChip';

interface SpecRow {
  key: string;
  label: string;
  value: string | number | null | undefined;
  glossary?: SpecGlossaryKey;
  provenanceSource?: ProvenanceSource | null;
}

interface SpecGroup {
  title: string;
  rows: SpecRow[];
}

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

function segmentLabel(segment: string): string {
  return segment
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function pushIf(rows: SpecRow[], row: SpecRow | null) {
  if (row && row.value != null && row.value !== '' && row.value !== 'Not on file') rows.push(row);
}

function buildSpecGroups(dashboard: CarDashboard): SpecGroup[] {
  const { car, zeroToSixty, evCharge } = dashboard;
  const isEv = car.engine.fuelType === 'electric';
  const isFcev = car.engine.fuelType === 'hydrogen';
  const isPhev = car.engine.fuelType === 'plug-in hybrid';
  const phev = phevModes(car);
  const effLabel = efficiencyUnit(car);

  const powertrain: SpecRow[] = [];
  pushIf(powertrain, {
    key: 'engine',
    label: 'Engine',
    value: engineCharacter(car),
    glossary: 'engine',
  });
  if (!isEv && !isFcev && hasNumericValue(car.engine.displacement)) {
    pushIf(powertrain, {
      key: 'displacement',
      label: 'Displacement',
      value: `${car.engine.displacement}L`,
      glossary: 'displacement',
    });
  }
  const knownLayout =
    car.engine.configuration &&
    engineLayoutLabel(car.engine.configuration, car.engine.cylinders) === car.engine.configuration
      ? car.engine.configuration
      : null;
  if (!isEv && !isFcev && knownLayout) {
    pushIf(powertrain, {
      key: 'configuration',
      label: 'Layout',
      value: knownLayout,
      glossary: 'configuration',
    });
  }
  if (!isEv && !isFcev && hasNumericValue(car.engine.cylinders)) {
    pushIf(powertrain, {
      key: 'cylinders',
      label: 'Cylinders',
      value: car.engine.cylinders,
      glossary: 'cylinders',
    });
  }
  if (hasNumericValue(car.engine.horsepower)) {
    pushIf(powertrain, {
      key: 'horsepower',
      label: 'Horsepower',
      value: `${car.engine.horsepower} hp`,
      glossary: 'horsepower',
    });
  }
  if (hasNumericValue(car.engine.torque)) {
    pushIf(powertrain, {
      key: 'torque',
      label: 'Torque',
      value: `${car.engine.torque} lb-ft`,
      glossary: 'torque',
    });
  }
  pushIf(powertrain, {
    key: 'drivetrain',
    label: 'Drivetrain',
    value: car.driveType,
    glossary: 'drivetrain',
  });
  pushIf(powertrain, {
    key: 'transmission',
    label: 'Transmission',
    value: transmissionLabel(car),
    glossary: 'transmission',
  });
  if (!isEv) {
    pushIf(powertrain, {
      key: 'fuel',
      label: 'Fuel',
      value: formatFuelTypeLabel(car.engine.fuelType),
      glossary: 'fuel',
    });
  }

  const vehicle: SpecRow[] = [];
  const trim = displayTrimLabel(car);
  if (trim) {
    pushIf(vehicle, {
      key: 'trim',
      label: 'Trim',
      value: trim,
      glossary: 'trim',
    });
  }
  if (car.bodyStyle) {
    pushIf(vehicle, {
      key: 'body',
      label: 'Body',
      value: titleCase(car.bodyStyle),
      glossary: 'body',
    });
  }
  if (car.vehicleCategory) {
    pushIf(vehicle, {
      key: 'category',
      label: 'Category',
      value: titleCase(car.vehicleCategory),
      glossary: 'category',
    });
  }
  if (car.epa?.vClass) {
    pushIf(vehicle, {
      key: 'epaClass',
      label: 'EPA class',
      value: car.epa.vClass,
      glossary: 'epaClass',
    });
  }
  if (car.countryOfOrigin) {
    const raw = car.provenance?.countryOfOrigin;
    pushIf(vehicle, {
      key: 'origin',
      label: 'Origin',
      value: car.countryOfOrigin,
      glossary: 'countryOfOrigin',
      provenanceSource: raw ? displayProvenanceSource('countryOfOrigin', raw) : null,
    });
  }
  if (car.shoppingSegment) {
    pushIf(vehicle, {
      key: 'segment',
      label: 'Segment',
      value: segmentLabel(car.shoppingSegment),
      glossary: 'shoppingSegment',
    });
  }

  const market: SpecRow[] = [];
  if (hasNumericValue(car.price?.msrp)) {
    const priceLabel = car.price?.isEstimated ? 'Est. current value' : 'Current value';
    pushIf(market, {
      key: 'msrp',
      label: priceLabel,
      value: formatCurrency(car.price!.msrp!, car.price?.isEstimated),
      glossary: 'msrp',
    });
  }
  if (car.price?.confidenceLabel) {
    pushIf(market, {
      key: 'valueConfidence',
      label: 'Value confidence',
      value: car.price.confidenceLabel,
    });
  }

  const fuel: SpecRow[] = [];
  if (hasNumericValue(car.fuelEconomy.city) && !isEv) {
    pushIf(fuel, {
      key: 'mpgCity',
      label: `City ${effLabel}`,
      value: car.fuelEconomy.city,
      glossary: 'mpgCity',
    });
  }
  if (hasNumericValue(car.fuelEconomy.highway) && !isEv) {
    pushIf(fuel, {
      key: 'mpgHighway',
      label: `Highway ${effLabel}`,
      value: car.fuelEconomy.highway,
      glossary: 'mpgHighway',
    });
  }
  if (hasNumericValue(car.fuelEconomy.combined)) {
    pushIf(fuel, {
      key: 'mpgCombined',
      label: `Combined ${effLabel}`,
      value: car.fuelEconomy.combined,
      glossary: isEv || isFcev ? 'mpge' : 'mpgCombined',
    });
  }
  if (isPhev && phev) {
    if (hasNumericValue(phev.electricMpge)) {
      pushIf(fuel, {
        key: 'phevElectricMpge',
        label: 'Electric-mode MPGe',
        value: phev.electricMpge,
        glossary: 'phevElectricMpge',
      });
    }
    if (hasNumericValue(phev.electricRangeMi)) {
      pushIf(fuel, {
        key: 'phevRange',
        label: 'Electric range',
        value: `${Math.round(phev.electricRangeMi!)} mi`,
        glossary: 'phevElectricRange',
      });
    }
    if (hasNumericValue(phev.gasMpg)) {
      pushIf(fuel, {
        key: 'phevGas',
        label: 'Gas-mode MPG',
        value: phev.gasMpg,
        glossary: 'phevGasMpg',
      });
    }
    if (hasNumericValue(phev.blendedMpge)) {
      pushIf(fuel, {
        key: 'phevBlended',
        label: 'Blended MPGe',
        value: phev.blendedMpge,
        glossary: 'phevBlendedMpge',
      });
    }
    if (hasNumericValue(phev.chargeL2Hours)) {
      pushIf(fuel, {
        key: 'phevCharge',
        label: 'Level 2 charge',
        value: `~${phev.chargeL2Hours} h`,
        glossary: 'charge240',
      });
    }
  }
  const rangeMi = evCharge?.rangeMiles ?? car.epa?.rangeMiles;
  if ((isEv || isFcev) && hasNumericValue(rangeMi)) {
    pushIf(fuel, {
      key: 'epaRange',
      label: 'EPA range',
      value: `${Math.round(rangeMi!)} mi`,
      glossary: 'epaRange',
    });
  }
  if (hasNumericValue(evCharge?.kWhPer100Mi)) {
    pushIf(fuel, {
      key: 'kwh',
      label: 'Consumption',
      value: `${evCharge!.kWhPer100Mi} kWh/100mi`,
      glossary: 'kwhPer100mi',
    });
  }
  if (hasNumericValue(evCharge?.charge240Hours)) {
    pushIf(fuel, {
      key: 'charge240',
      label: 'Home charge (240V)',
      value: `~${evCharge!.charge240Hours} h`,
      glossary: 'charge240',
    });
  }
  if (hasNumericValue(evCharge?.charge120Hours ?? car.epa?.charge120Hours)) {
    const hrs = evCharge?.charge120Hours ?? car.epa!.charge120Hours!;
    pushIf(fuel, {
      key: 'charge120',
      label: 'Home charge (120V)',
      value: `~${hrs} h`,
      glossary: 'charge120',
    });
  }
  const annualFuelCad = formatAnnualFuelCostCadDisplay(car);
  if (annualFuelCad) {
    pushIf(fuel, {
      key: 'annualFuel',
      label: 'Annual fuel cost',
      value: annualFuelCad,
      glossary: 'annualFuelCost',
    });
  }

  const environment: SpecRow[] = [];
  if (car.epa?.co2 != null) {
    pushIf(environment, {
      key: 'co2',
      label: 'CO₂ emissions',
      value: `${car.epa.co2} g/mi`,
      glossary: 'co2',
    });
  }
  if (hasNumericValue(car.epa?.ghgScore)) {
    pushIf(environment, {
      key: 'ghg',
      label: 'Emissions score',
      value: `${car.epa!.ghgScore}/10`,
      glossary: 'ghgScore',
    });
  }
  if (hasNumericValue(car.epa?.barrelsPerYear)) {
    pushIf(environment, {
      key: 'barrels',
      label: 'Oil use',
      value: `${car.epa!.barrelsPerYear} barrels/yr`,
      glossary: 'barrelsPerYear',
    });
  }
  const fuelSav = fiveYearFuelSavings(car);
  if (fuelSav) {
    pushIf(environment, {
      key: 'fuelSav5',
      label: '5-yr fuel vs. average',
      value: `${fuelSavingsShort(fuelSav)} over 5 yr`,
      glossary: 'fuelSavings5yr',
    });
  }

  const performance: SpecRow[] = [];
  if (zeroToSixty) {
    pushIf(performance, {
      key: 'zero60',
      label: '0-60 mph',
      value: `~${zeroToSixty.value}s${zeroToSixty.method === 'predicted' ? ' (est.)' : ''}`,
      glossary: 'zeroToSixty',
    });
  }

  const safety: SpecRow[] = [];
  const sr = car.safetyRating;
  if (hasNumericValue(sr?.overall, { allowZero: false })) {
    pushIf(safety, {
      key: 'safetyOverall',
      label: 'NHTSA overall',
      value: `${sr!.overall}/5 stars`,
      glossary: 'safetyOverall',
    });
    if (hasNumericValue(sr?.frontal, { allowZero: false })) {
      pushIf(safety, {
        key: 'safetyFrontal',
        label: 'Frontal crash',
        value: `${sr!.frontal}/5`,
        glossary: 'safetyFrontal',
      });
    }
    if (hasNumericValue(sr?.side, { allowZero: false })) {
      pushIf(safety, {
        key: 'safetySide',
        label: 'Side crash',
        value: `${sr!.side}/5`,
        glossary: 'safetySide',
      });
    }
    if (hasNumericValue(sr?.rollover, { allowZero: false })) {
      pushIf(safety, {
        key: 'safetyRollover',
        label: 'Rollover',
        value: `${sr!.rollover}/5`,
        glossary: 'safetyRollover',
      });
    }
  }

  return [
    { title: 'Powertrain', rows: powertrain },
    { title: 'Vehicle', rows: vehicle },
    { title: 'Market', rows: market },
    { title: 'Fuel economy', rows: fuel },
    { title: 'Crash safety', rows: safety },
    { title: 'Performance', rows: performance },
    { title: 'Emissions', rows: environment },
  ].filter((g) => g.rows.length > 0);
}

function SpecGroupBlock({ group }: { group: SpecGroup }) {
  return (
    <div className="border border-zinc-800 min-w-0">
      <p className={`px-3 py-2 border-b border-zinc-800 bg-zinc-950/80 ${TIER3_LABEL}`}>
        {group.title}
      </p>
      <div className="flex flex-col">
        {group.rows.map((spec) => (
          <div
            key={spec.key}
            className={`py-1 px-3 border-b border-zinc-900 last:border-b-0 min-w-0 ${
              spec.key === 'msrp'
                ? 'flex flex-col gap-0.5'
                : 'flex items-baseline justify-between gap-4'
            }`}
          >
            <p className={`${TIER3_LABEL} min-w-0`}>
              <SpecLabel label={spec.label} glossaryKey={spec.glossary} />
            </p>
            <div
              className={`flex items-center gap-1.5 min-w-0 ${
                spec.key === 'msrp' ? 'flex-wrap' : 'justify-end shrink-0'
              }`}
            >
              <DataValue
                value={spec.value}
                className={`${
                  spec.key === 'msrp' ? TIER1_SPEC_EMPHASIS : TIER2_VALUE
                } break-words max-w-full ${spec.key === 'msrp' ? '' : 'text-right'}`}
              />
              {spec.provenanceSource && <ProvenanceChip source={spec.provenanceSource} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function KeySpecs({ dashboard }: { dashboard: CarDashboard }) {
  const groups = buildSpecGroups(dashboard);

  return (
    <section className="border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-6">
        <p className="text-[10px] tracking-widest text-zinc-400 uppercase mb-4 border-t border-zinc-800 pt-4">
          Specifications
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6">
          {groups.map((group) => (
            <SpecGroupBlock key={group.title} group={group} />
          ))}
        </div>
      </div>
    </section>
  );
}
