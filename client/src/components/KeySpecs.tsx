import type { CarDashboard, CarSpecs, ProvenanceSource } from '../types/car.types';
import { formatEngineForDetail, formatCurrency, hasNumericValue } from '../utils/dataValue';
import { displayProvenanceSource } from '../utils/dataTrust';
import { engineLayoutLabel, engineLitres, formatCarFuelLabel } from '../utils/fuelDisplay';
import { bodyStyleLabel } from '../utils/bodyStyleLabel';
import { displayTrimLabel, formatTransmissionLabel } from '../utils/trimLabel';
import { efficiencyUnit } from '../utils/fuelLabels';
import { formatCo2 } from '../utils/efficiency';
import { formatVolume, luggageLabel } from '../utils/space';
import { formatFeet, formatMetres } from '../utils/size';
import { fiveYearFuelSavings, fuelSavingsShort, phevModes } from '../utils/epaContent';
import { formatAnnualEnergyCost } from '../utils/fuelLabels';
import type { SpecGlossaryKey } from '../utils/specGlossary';
import { TIER1_SPEC_EMPHASIS, TIER2_VALUE, TIER3_LABEL } from '../utils/visualTiers';
import { SpecLabel } from './SpecExplain';
import DataValue from './DataValue';
import { Chevron, foldSummaryClass } from './ui';
import { t, tp } from '../i18n';

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

function pushIf(rows: SpecRow[], row: SpecRow | null) {
  if (row && row.value != null && row.value !== '' && row.value !== 'Not on file') rows.push(row);
}

function buildSpecGroups(dashboard: CarDashboard): SpecGroup[] {
  const { car, zeroToSixty, evCharge, ownership } = dashboard;
  const isEv = car.engine.fuelType === 'electric';
  const isFcev = car.engine.fuelType === 'hydrogen';
  const isPhev = car.engine.fuelType === 'plug-in hybrid';
  const phev = phevModes(car);
  const effLabel = efficiencyUnit(car);

  const powertrain: SpecRow[] = [];
  pushIf(powertrain, {
    key: 'engine',
    label: t('Engine'),
    value: engineCharacter(car),
    glossary: 'engine',
  });
  if (!isEv && !isFcev && hasNumericValue(car.engine.displacement)) {
    pushIf(powertrain, {
      key: 'displacement',
      label: t('Displacement'),
      value: engineLitres(car.engine.displacement!),
      glossary: 'displacement',
    });
  }
  const knownLayout = car.engine.configuration
    ? engineLayoutLabel(car.engine.configuration, car.engine.cylinders)
    : null;
  if (!isEv && !isFcev && knownLayout) {
    pushIf(powertrain, {
      key: 'configuration',
      label: t('Layout'),
      value: knownLayout,
      glossary: 'configuration',
    });
  }
  if (dashboard.enginePosition) {
    pushIf(powertrain, {
      key: 'enginePosition',
      label: t('Engine position'),
      value: dashboard.enginePosition === 'mid' ? t('Mid-engine') : t('Rear-engine'),
      glossary: 'enginePosition',
    });
  }
  if (!isEv && !isFcev && hasNumericValue(car.engine.cylinders)) {
    pushIf(powertrain, {
      key: 'cylinders',
      label: t('Cylinders'),
      value: car.engine.cylinders,
      glossary: 'cylinders',
    });
  }
  if (hasNumericValue(car.engine.horsepower)) {
    pushIf(powertrain, {
      key: 'horsepower',
      label: t('Horsepower'),
      value: t('{hp} hp', { hp: car.engine.horsepower }),
      glossary: 'horsepower',
    });
  }
  if (hasNumericValue(car.engine.torque)) {
    pushIf(powertrain, {
      key: 'torque',
      label: t('Torque'),
      value: t('{torque} lb-ft', { torque: car.engine.torque }),
      glossary: 'torque',
      ...(car.provenance?.['engine.torque']
        ? {
            provenanceSource: displayProvenanceSource(
              'engine.torque',
              car.provenance['engine.torque'],
            ),
          }
        : {}),
    });
  }
  pushIf(powertrain, {
    key: 'drivetrain',
    label: t('Drivetrain'),
    value: car.driveType,
    glossary: 'drivetrain',
  });
  pushIf(powertrain, {
    key: 'transmission',
    label: t('Transmission'),
    value: transmissionLabel(car),
    glossary: 'transmission',
  });
  if (!isEv) {
    pushIf(powertrain, {
      key: 'fuel',
      label: t('Fuel'),
      value: formatCarFuelLabel(car),
      glossary: 'fuel',
    });
  }

  const vehicle: SpecRow[] = [];
  const trim = displayTrimLabel(car);
  if (trim) {
    pushIf(vehicle, {
      key: 'trim',
      label: t('Trim'),
      value: trim,
      glossary: 'trim',
    });
  }
  if (car.bodyStyle) {
    pushIf(vehicle, {
      key: 'body',
      label: t('Body'),
      value: bodyStyleLabel(car.bodyStyle),
      glossary: 'body',
    });
  }
  // EPA's vehicle category ("Car") said less than the body style beside it.
  if (car.epa?.vClass) {
    pushIf(vehicle, {
      key: 'epaClass',
      // By room inside, not outside size: a 2022 Civic is "Midsize Cars"
      // beside "Competes as: Compact car".
      label: t('EPA size, by room inside'),
      value: car.epa.vClass,
      glossary: 'epaClass',
    });
  }
  // Where the make is from, by its name: a lookup, not an estimate to mark.
  if (car.countryOfOrigin) {
    pushIf(vehicle, {
      key: 'origin',
      label: t('Brand origin'),
      value: car.countryOfOrigin,
      glossary: 'countryOfOrigin',
    });
  }
  if (car.variant) {
    pushIf(vehicle, {
      key: 'variant',
      label: t('Trim'),
      value: car.variant,
      glossary: 'variant',
      provenanceSource: displayProvenanceSource('variant', car.provenance?.variant ?? 'estimated'),
    });
  }
  if (dashboard.competitiveClass) {
    pushIf(vehicle, {
      key: 'class',
      // Beside "EPA class", which measures interior volume.
      label: t('Competes as'),
      value: dashboard.competitiveClass,
      glossary: 'competitiveClass',
    });
  }
  if (dashboard.generation) {
    pushIf(vehicle, {
      key: 'generation',
      label: t('Generation'),
      value: dashboard.generation,
      glossary: 'generation',
    });
  }

  const space: SpecRow[] = [];
  if (hasNumericValue(car.seats)) {
    const seatsLabel =
      car.seatsMax != null && car.seatsMax !== car.seats
        ? `${car.seats}–${car.seatsMax}`
        : String(car.seats);
    pushIf(space, {
      key: 'seats',
      label: t('Seats'),
      value: seatsLabel,
      glossary: 'seats',
      provenanceSource: displayProvenanceSource('seats', car.provenance?.seats ?? 'curated'),
    });
  }
  if (hasNumericValue(car.towingCapacityLb)) {
    pushIf(space, {
      key: 'towing',
      label: t('Max towing'),
      value: t('{lb} lb', { lb: car.towingCapacityLb!.toLocaleString() }),
      glossary: 'towing',
      provenanceSource: displayProvenanceSource(
        'towingCapacityLb',
        car.provenance?.towingCapacityLb ?? 'curated',
      ),
    });
  }
  if (car.size) {
    pushIf(space, {
      key: 'wheelbase',
      label: t('Wheelbase'),
      value: `${formatMetres(car.size.wheelbaseCm)} (${formatFeet(car.size.wheelbaseCm)})`,
      glossary: 'wheelbase',
    });
  }
  if (car.epa?.luggageVolumeCuFt) {
    pushIf(space, {
      key: 'luggage',
      label: luggageLabel(car.bodyStyle),
      value: formatVolume(car.epa.luggageVolumeCuFt),
      glossary: 'luggageVolume',
    });
  }
  if (car.epa?.passengerVolumeCuFt) {
    pushIf(space, {
      key: 'passenger',
      label: t('Passenger space'),
      value: formatVolume(car.epa.passengerVolumeCuFt),
      glossary: 'passengerVolume',
    });
  }

  const market: SpecRow[] = [];
  if (hasNumericValue(car.price?.msrp)) {
    const priceLabel = car.price?.isEstimated ? t('Est. current value') : t('Current value');
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
      label: t('Value confidence'),
      value: car.price.confidenceLabel,
    });
  }

  const fuel: SpecRow[] = [];
  if (hasNumericValue(car.fuelEconomy.city) && !isEv) {
    pushIf(fuel, {
      key: 'mpgCity',
      label: effLabel === 'MPGe' ? t('City MPGe') : t('City MPG'),
      value: car.fuelEconomy.city,
      glossary: 'mpgCity',
    });
  }
  if (hasNumericValue(car.fuelEconomy.highway) && !isEv) {
    pushIf(fuel, {
      key: 'mpgHighway',
      label: effLabel === 'MPGe' ? t('Highway MPGe') : t('Highway MPG'),
      value: car.fuelEconomy.highway,
      glossary: 'mpgHighway',
    });
  }
  if (hasNumericValue(car.fuelEconomy.combined)) {
    pushIf(fuel, {
      key: 'mpgCombined',
      label: effLabel === 'MPGe' ? t('Combined MPGe') : t('Combined MPG'),
      value: car.fuelEconomy.combined,
      glossary: isEv || isFcev ? 'mpge' : 'mpgCombined',
    });
  }
  if (isPhev && phev) {
    if (hasNumericValue(phev.electricMpge)) {
      pushIf(fuel, {
        key: 'phevElectricMpge',
        label: t('Electric-mode MPGe'),
        value: phev.electricMpge,
        glossary: 'phevElectricMpge',
      });
    }
    if (hasNumericValue(phev.electricRangeMi)) {
      pushIf(fuel, {
        key: 'phevRange',
        label: t('Electric range'),
        value: `${Math.round(phev.electricRangeMi!)} mi`,
        glossary: 'phevElectricRange',
      });
    }
    if (hasNumericValue(phev.gasMpg)) {
      pushIf(fuel, {
        key: 'phevGas',
        label: t('Gas-mode MPG'),
        value: phev.gasMpg,
        glossary: 'phevGasMpg',
      });
    }
    if (hasNumericValue(phev.blendedMpge)) {
      pushIf(fuel, {
        key: 'phevBlended',
        label: t('Blended MPGe'),
        value: phev.blendedMpge,
        glossary: 'phevBlendedMpge',
      });
    }
    if (hasNumericValue(phev.chargeL2Hours)) {
      pushIf(fuel, {
        key: 'phevCharge',
        label: t('Level 2 charge'),
        value: `~${phev.chargeL2Hours} h`,
        glossary: 'charge240',
      });
    }
  }
  const rangeMi = evCharge?.rangeMiles ?? car.epa?.rangeMiles;
  if ((isEv || isFcev) && hasNumericValue(rangeMi)) {
    pushIf(fuel, {
      key: 'epaRange',
      label: car.provenance?.['epa.rangeMiles'] === 'nrcan' ? t('Range') : t('EPA range'),
      value: `${Math.round(rangeMi!)} mi`,
      glossary: 'epaRange',
    });
  }
  if (hasNumericValue(evCharge?.kWhPer100Mi)) {
    pushIf(fuel, {
      key: 'kwh',
      label: t('Consumption'),
      value: `${evCharge!.kWhPer100Mi} kWh/100mi`,
      glossary: 'kwhPer100mi',
    });
  }
  if (hasNumericValue(evCharge?.charge240Hours)) {
    pushIf(fuel, {
      key: 'charge240',
      label: t('Home charge (240V)'),
      value: `~${evCharge!.charge240Hours} h`,
      glossary: 'charge240',
    });
  }
  if (hasNumericValue(evCharge?.charge120Hours ?? car.epa?.charge120Hours)) {
    const hrs = evCharge?.charge120Hours ?? car.epa!.charge120Hours!;
    pushIf(fuel, {
      key: 'charge120',
      label: t('Home charge (120V)'),
      value: `~${hrs} h`,
      glossary: 'charge120',
    });
  }
  // The server's figure for the viewer's cost region, as in "Estimated costs".
  const annualFuelCad = formatAnnualEnergyCost(ownership.annualCost.energy);
  if (annualFuelCad) {
    pushIf(fuel, {
      key: 'annualFuel',
      label: t('Annual fuel cost'),
      value: annualFuelCad,
      glossary: 'annualFuelCost',
    });
  }

  const environment: SpecRow[] = [];
  if (car.epa?.co2 != null) {
    pushIf(environment, {
      key: 'co2',
      label: t('CO₂ emissions'),
      value: formatCo2(car.epa.co2),
      glossary: 'co2',
    });
  }
  if (hasNumericValue(car.epa?.ghgScore)) {
    pushIf(environment, {
      key: 'ghg',
      label: t('EPA greenhouse rating'),
      value: `${car.epa!.ghgScore}/10`,
      glossary: 'ghgScore',
    });
  }
  if (hasNumericValue(car.epa?.barrelsPerYear)) {
    pushIf(environment, {
      key: 'barrels',
      label: t('Oil use'),
      value: t('{n} barrels/yr', { n: car.epa!.barrelsPerYear }),
      glossary: 'barrelsPerYear',
    });
  }
  const fuelSav = fiveYearFuelSavings(car);
  if (fuelSav) {
    pushIf(environment, {
      key: 'fuelSav5',
      label: t('5-yr fuel vs. average'),
      value: t('{short} over 5 yr', { short: fuelSavingsShort(fuelSav) }),
      glossary: 'fuelSavings5yr',
    });
  }

  const performance: SpecRow[] = [];
  if (zeroToSixty) {
    pushIf(performance, {
      key: 'zero60',
      label: t('0-60 mph'),
      value: zeroToSixty.method === 'predicted' ? t('~{seconds}s (est.)', { seconds: zeroToSixty.value }) : t('~{seconds}s', { seconds: zeroToSixty.value }),
      glossary: 'zeroToSixty',
    });
  }

  const safety: SpecRow[] = [];
  const sr = car.safetyRating;
  if (hasNumericValue(sr?.overall, { allowZero: false })) {
    pushIf(safety, {
      key: 'safetyOverall',
      label: t('NHTSA overall'),
      value: t('{n}/5 stars', { n: sr!.overall }),
      glossary: 'safetyOverall',
    });
    if (hasNumericValue(sr?.frontal, { allowZero: false })) {
      pushIf(safety, {
        key: 'safetyFrontal',
        label: t('Frontal crash'),
        value: `${sr!.frontal}/5`,
        glossary: 'safetyFrontal',
      });
    }
    if (hasNumericValue(sr?.side, { allowZero: false })) {
      pushIf(safety, {
        key: 'safetySide',
        label: t('Side crash'),
        value: `${sr!.side}/5`,
        glossary: 'safetySide',
      });
    }
    if (hasNumericValue(sr?.rollover, { allowZero: false })) {
      pushIf(safety, {
        key: 'safetyRollover',
        label: t('Rollover'),
        value: `${sr!.rollover}/5`,
        glossary: 'safetyRollover',
      });
    }
  }

  return [
    { title: t('Powertrain'), rows: powertrain },
    { title: t('Vehicle'), rows: vehicle },
    { title: t('Size and space'), rows: space },
    { title: t('Market'), rows: market },
    { title: t('Fuel economy'), rows: fuel },
    { title: t('Crash safety'), rows: safety },
    { title: t('Performance'), rows: performance },
    { title: t('Emissions'), rows: environment },
  ].filter((g) => g.rows.length > 0);
}

// Beyond this, a value cannot sit beside its label in a column this narrow
// without pushing out of the card, so it stacks under the label the way the
// price row already does. Every inline value in the data is comfortably short
// of it; EPA class strings and valuation notes are the ones that are not.
const INLINE_VALUE_MAX_CHARS = 24;

function SpecGroupBlock({ group }: { group: SpecGroup }) {
  return (
    <div className="min-w-0">
      <p className={`${TIER3_LABEL} mb-2`}>{group.title}</p>
      <div className="flex flex-col border-t border-zinc-800">
        {group.rows.map((spec) => {
          const emphasised = spec.key === 'msrp';
          const stacked = emphasised || String(spec.value ?? '').length > INLINE_VALUE_MAX_CHARS;
          return (
            <div
              key={spec.key}
              className={`py-2 border-b border-zinc-900 last:border-b-0 min-w-0 ${
                stacked ? 'flex flex-col gap-0.5' : 'flex items-baseline justify-between gap-4'
              }`}
            >
              <p className={`${TIER3_LABEL} min-w-0`}>
                <SpecLabel label={spec.label} glossaryKey={spec.glossary} />
              </p>
              <div
                className={`flex items-center gap-1.5 min-w-0 ${
                  stacked ? 'flex-wrap' : 'justify-end shrink-0'
                }`}
              >
                <DataValue
                  value={spec.value}
                  className={`${emphasised ? TIER1_SPEC_EMPHASIS : TIER2_VALUE} wrap-break-word max-w-full ${
                    stacked ? '' : 'text-right'
                  }`}
                />
                {spec.provenanceSource === 'estimated' && (
                  <span className="text-xs text-zinc-600">{t('est.')}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function KeySpecs({
  dashboard,
  omitKeys,
  heading = t('Specifications'),
}: {
  dashboard: CarDashboard;
  /** Row keys already shown in glance or deepening sections. */
  omitKeys?: string[];
  heading?: string;
}) {
  const omit = new Set(omitKeys);
  const groups = buildSpecGroups(dashboard)
    .map((group) => ({
      ...group,
      rows: omit.size ? group.rows.filter((row) => !omit.has(row.key)) : group.rows,
    }))
    .filter((group) => group.rows.length > 0);

  if (groups.length === 0) return null;
  const rowCount = groups.reduce((sum, group) => sum + group.rows.length, 0);

  return (
    <section id="specs" className="border-t border-zinc-900 scroll-mt-32">
      <div className="page-wrap-wide section-y-tight">
        {/* Folded: the figures above are the ones most people need. */}
        <details className="group/specs">
          <summary className={`${foldSummaryClass} gap-4`}>
            <span className="min-w-0">
              <h2 className="block-title">{heading}</h2>
              <span className="block text-xs text-zinc-500 mt-0.5">
                {tp(rowCount, '{count} more figure on file for this version', '{count} more figures on file for this version')}
              </span>
            </span>
            <Chevron className="w-4 h-4 text-zinc-500 group-hover/specs:text-white group-open/specs:rotate-180" />
          </summary>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 md:gap-x-10 gap-y-5 md:gap-y-6">
            {groups.map((group) => (
              <SpecGroupBlock key={group.title} group={group} />
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}
