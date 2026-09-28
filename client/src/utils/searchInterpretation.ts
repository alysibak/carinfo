import type { SearchInterpretation } from '../types/car.types';

const cad = (value: number) =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(value);

const LITRES_AT_1_MPG = 235.215;

/** "EPA combined rating of 30 MPG or better (7.8 L/100 km or less)." */
function describeFuelEconomy(
  bound: NonNullable<SearchInterpretation['fuelEconomy']>,
  evsLeftOut: boolean,
): string {
  const { min, max, unit, basis = 'combined' } = bound;
  const litres = (mpg: number) => `${(LITRES_AT_1_MPG / mpg).toFixed(1)} L/100 km`;
  const mpg = (litres: number, round: (n: number) => number) =>
    `${round(LITRES_AT_1_MPG / litres)} MPG`;
  if (unit === 'L/100 km') {
    // Ratings are whole MPG: 7 L/100 km or less is 34 MPG or better.
    const text =
      min != null && max != null
        ? `${min} to ${max} L/100 km (${mpg(max, Math.ceil)} to ${mpg(min, Math.floor)})`
        : max != null
          ? `${max} L/100 km or less (${mpg(max, Math.ceil)} or better)`
          : `${min} L/100 km or more (${mpg(min!, Math.floor)} or worse)`;
    return `EPA ${basis} fuel consumption of ${text}${evsLeftOut ? '; electric cars are left out' : ''}.`;
  }
  const metric = unit === 'MPG';
  const text =
    min != null && max != null
      ? `${min} to ${max} ${unit}${metric ? ` (${litres(min)} to ${litres(max)})` : ''}`
      : min != null
        ? `${min} ${unit} or better${metric ? ` (${litres(min)} or less)` : ''}`
        : `${max} ${unit} or less${metric ? ` (${litres(max!)} or more)` : ''}`;
  return `EPA ${basis} rating of ${text}${evsLeftOut ? '; electric cars are left out' : ''}.`;
}

/** "300 hp or more; cars with no rating on file are left out." */
function describeHorsepower({ min, max }: NonNullable<SearchInterpretation['horsepower']>): string {
  const text =
    min != null && max != null
      ? `${min} to ${max} hp`
      : min != null
        ? `${min} hp or more`
        : `${max} hp or less`;
  return `${text}; cars with no rating on file are left out.`;
}

/**
 * What the search read into its query, as sentences for the results page:
 * trim words it set aside, a price limit, a "cheapest first" order. Without
 * them a search for "honda civic ex" showed every Civic with no word why.
 */
export function describeSearchInterpretation(
  interpretation: SearchInterpretation | undefined,
): string[] {
  if (!interpretation) return [];
  const lines: string[] = [];
  if (interpretation.otherYears) {
    const { asked, onFile } = interpretation.otherYears;
    const askedText =
      asked.min != null && asked.max != null
        ? asked.min === asked.max
          ? `${asked.min}`
          : `${asked.min}–${asked.max}`
        : asked.min != null
          ? `${asked.min} and newer`
          : `${asked.max} and older`;
    const runs = onFile.map((r) => (r.min === r.max ? `${r.min}` : `${r.min}–${r.max}`));
    const runText =
      runs.length > 1 ? `${runs.slice(0, -1).join(', ')} and ${runs.at(-1)}` : (runs[0] ?? '');
    lines.push(`None on file for ${askedText}. Showing the years that are: ${runText}.`);
  }
  if (interpretation.similarTo) {
    lines.push(
      `Rivals of the ${interpretation.similarTo.label}: the models shoppers compare it with, by class, size and price.`,
    );
  }
  if (interpretation.ignored?.length) {
    lines.push(
      `EPA records no trim levels, so “${interpretation.ignored.join(' ')}” was left out of the search.`,
    );
  }
  const price = interpretation.price;
  if (price?.min != null && price.max != null) {
    lines.push(`Estimated value ${cad(price.min)} to ${cad(price.max)}.`);
  } else if (price?.max != null) {
    lines.push(`Estimated value under ${cad(price.max)}.`);
  } else if (price?.min != null) {
    lines.push(`Estimated value over ${cad(price.min)}.`);
  }
  if (interpretation.fuelEconomy) {
    lines.push(describeFuelEconomy(interpretation.fuelEconomy, !!interpretation.gasMileage));
  }
  if (interpretation.horsepower) lines.push(describeHorsepower(interpretation.horsepower));
  if (interpretation.engineSize != null) {
    lines.push(`${interpretation.engineSize.toFixed(1)}-litre engines only.`);
  }
  if (interpretation.engineFamily) lines.push(`Read as ${interpretation.engineFamily}.`);
  if (interpretation.generation) lines.push(`Read as the ${interpretation.generation}.`);
  if (interpretation.layouts?.length) {
    const names = interpretation.layouts.join(' and ');
    lines.push(
      `${names} engines only: EPA records a cylinder count, so the layout comes from the engine family.`,
    );
  }
  const order = {
    price: 'Cheapest first by estimated value',
    fuelEconomy: 'Most fuel-efficient first',
    horsepower: 'Most powerful first',
    range: 'Longest EPA range first',
    safety: 'Best NHTSA crash rating first; most cars have none on file',
    runningCost:
      'Lowest estimated yearly running cost first: fuel, insurance, upkeep and tires, at the Ontario baseline',
  } as const;
  if (interpretation.sortedBy) {
    lines.push(
      interpretation.recentFrom != null
        ? `${order[interpretation.sortedBy]}, model years ${interpretation.recentFrom} and newer.`
        : `${order[interpretation.sortedBy]}.`,
    );
  }
  if (interpretation.firstCar) {
    const { maxPrice, minMpg, minYear } = interpretation.firstCar;
    lines.push(
      `Read as a first car, as the First car preset: under ${cad(maxPrice)} where no price was given, ${minMpg} MPG or better, ${minYear} or newer.`,
    );
  }
  if (interpretation.automatedManual) {
    lines.push(
      'Automated manuals only, as EPA files them: mostly dual-clutch gearboxes (PDK, DSG), some with a single clutch.',
    );
  }
  if (interpretation.mildHybrid) {
    lines.push(
      'Mild hybrids only: a 12-48 volt motor helps the engine but never drives the car, so they are listed by their fuel.',
    );
  }
  if (interpretation.snow) {
    lines.push(
      'All- and four-wheel drive only, for snow: EPA records the drive, not the tires, which matter as much.',
    );
  }
  if (interpretation.rareFuelsLeftOut) {
    lines.push(
      'Hydrogen and natural-gas cars are left out: they sell cheaply because there is almost nowhere in Canada to fill them.',
    );
  }
  // A fuel-economy bound's own line says so.
  if (interpretation.gasMileage && !interpretation.fuelEconomy) {
    lines.push('Electric cars are left out: their MPGe does not compare with MPG.');
  }
  if (interpretation.minRangeMiles != null) {
    const km = Math.round(interpretation.minRangeMiles * 1.609);
    lines.push(
      `EPA range of at least ${interpretation.minRangeMiles} miles (${km.toLocaleString('en-CA')} km).`,
    );
  }
  if (interpretation.newestFrom != null) {
    lines.push(`Model years ${interpretation.newestFrom} and newer.`);
  }
  if (interpretation.twoRow) {
    lines.push(
      'Two rows of seats: models sold with a third row are left out, by model, as EPA records no seating.',
    );
  }
  if (interpretation.twoSeater) {
    lines.push("Two-seaters: EPA's two-seater class.");
  }
  if (interpretation.enginePosition) {
    const kind = { front: 'Front', mid: 'Mid', rear: 'Rear' }[interpretation.enginePosition];
    lines.push(`${kind}-engined cars, by model: EPA records no engine position.`);
  }
  if (interpretation.doors != null) {
    lines.push(
      `${interpretation.doors}-door models: named so, or ${
        interpretation.doors === 2
          ? 'coupes and convertibles'
          : interpretation.doors === 4
            ? 'sedans'
            : 'wagons'
      }, as EPA records no doors.`,
    );
  }
  if (interpretation.threeRow) {
    lines.push(
      'Minivans, passenger vans and SUVs sold with a third row, by model: EPA records no seating.',
    );
  }
  if (interpretation.unmeasured?.length) {
    const words = interpretation.unmeasured.map((w) => `“${w}”`).join(' and ');
    lines.push(
      `No data on file measures ${words}, so ${
        interpretation.unmeasured.length > 1 ? 'they were' : 'it was'
      } not used.`,
    );
  }
  if (interpretation.vehicleClass) {
    lines.push(`Showing ${interpretation.vehicleClass}, classed by model.`);
  }
  if (interpretation.compared?.length) {
    lines.push(
      `Showing ${interpretation.compared.map((part) => `“${part}”`).join(' and ')} together.`,
    );
  }
  return lines;
}
