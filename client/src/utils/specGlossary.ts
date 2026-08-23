/**
 * Plain-language spec definitions — short enough to read in a glance.
 * `what` = one sentence definition. `why` = one sentence on why you'd care.
 */

export type SpecGlossaryKey =
  | 'engine'
  | 'displacement'
  | 'configuration'
  | 'cylinders'
  | 'horsepower'
  | 'torque'
  | 'drivetrain'
  | 'transmission'
  | 'fuel'
  | 'body'
  | 'category'
  | 'epaClass'
  | 'mpgCity'
  | 'mpgHighway'
  | 'mpgCombined'
  | 'mpge'
  | 'epaRange'
  | 'co2'
  | 'ghgScore'
  | 'annualFuelCost'
  | 'barrelsPerYear'
  | 'fuelSavings5yr'
  | 'kwhPer100mi'
  | 'charge240'
  | 'phevElectricRange'
  | 'phevGasMpg'
  | 'phevElectricMpge'
  | 'zeroToSixty'
  | 'safetyOverall'
  | 'safetyFrontal'
  | 'safetySide'
  | 'safetyRollover'
  | 'countryOfOrigin'
  | 'trim'
  | 'shoppingSegment'
  | 'msrp'
  | 'charge120'
  | 'phevBlendedMpge'
  | 'power'
  | 'efficiency'
  | 'range';

export interface SpecGlossaryEntry {
  /** One line under the value on spec rows. */
  plain: string;
  /** Tooltip: what this number or term means. */
  what: string;
  /** Tooltip: why it matters when you're shopping. */
  why?: string;
}

export const SPEC_GLOSSARY: Record<SpecGlossaryKey, SpecGlossaryEntry> = {
  engine: {
    plain: 'The motor that powers the car',
    what: 'The full engine description: size, layout, and fuel type.',
    why: 'Tells you what you’re actually buying under the hood.',
  },
  displacement: {
    plain: 'Engine size, not the only measure of power',
    what: 'Liters (L) of air+fuel the engine moves per full cycle. A 1.6L engine is smaller than a 3.5L.',
    why: 'Bigger often means more power, but turbos let small engines punch above their weight.',
  },
  configuration: {
    plain: 'How the cylinders are laid out',
    what: 'I4 = four cylinders in a line. V6/V8 = cylinders in a V shape. H4 = flat/boxer.',
    why: 'Layout affects smoothness, packaging, and sometimes repair cost. I4 is the everyday default.',
  },
  cylinders: {
    plain: 'More cylinders can feel smoother',
    what: 'The number of combustion chambers firing in the engine.',
    why: 'Six or eight cylinders often feel smoother; four is lighter and usually cheaper on fuel.',
  },
  horsepower: {
    plain: 'Higher = quicker acceleration',
    what: 'Peak power the engine can put out, like the engine’s top strength.',
    why: 'Helps with highway passing and loaded acceleration. Weight and gearing matter too.',
  },
  torque: {
    plain: 'Pulling power from a standstill',
    what: 'Twisting force in lb-ft, what you feel when you hit the gas from a stop.',
    why: 'High torque makes towing and hill starts easier, even before you’re going fast.',
  },
  drivetrain: {
    plain: 'Which wheels get the power',
    what: 'FWD drives the front wheels. RWD drives the rear. AWD/4WD can drive all four.',
    why: 'AWD/4WD helps in snow; RWD can feel more balanced; FWD is common and efficient.',
  },
  transmission: {
    plain: 'How power reaches the wheels',
    what: 'Automatic shifts for you. Manual you shift. CVT has no fixed gears. Dual-clutch is a fast auto.',
    why: 'Affects how the car feels day to day and how it sips fuel on the highway.',
  },
  fuel: {
    plain: 'What powers the car',
    what: 'Gas, diesel, hybrid, plug-in hybrid, electric, or hydrogen fuel cell.',
    why: 'Drives your fuel stops, charging habits, and running costs.',
  },
  body: {
    plain: 'Shape and how you use the space',
    what: 'Sedan, SUV, coupe, hatchback, truck, van, etc.',
    why: 'Sets passenger room, cargo access, ride height, and how it drives.',
  },
  category: {
    plain: 'Broad type for comparing similar cars',
    what: 'Grouped as car, SUV, truck, or van.',
    why: 'Helps compare vehicles that shoppers actually cross-shop.',
  },
  epaClass: {
    plain: 'EPA’s size bucket for this vehicle',
    what: 'EPA label like “Midsize Cars” or “Small SUVs.”',
    why: 'Use it to compare fuel economy within the same size class.',
  },
  mpgCity: {
    plain: 'Stop-and-go efficiency',
    what: 'Miles per gallon in city traffic (EPA test).',
    why: 'Matters most if your commute is lots of lights and short trips.',
  },
  mpgHighway: {
    plain: 'Open-road efficiency',
    what: 'Miles per gallon at steady highway speed (EPA test).',
    why: 'Matters most for long commutes and road trips.',
  },
  mpgCombined: {
    plain: 'Best single number to compare cars',
    what: 'EPA blend of city and highway (55% city / 45% highway).',
    why: 'The fairest headline MPG when you’re comparing two gas cars.',
  },
  mpge: {
    plain: 'Electric efficiency vs. a gallon of gas',
    what: 'Miles-per-gallon equivalent for electric energy use.',
    why: 'Higher MPGe = the EV uses less electricity per mile. It does not burn gasoline.',
  },
  epaRange: {
    plain: 'EPA-tested distance on a full charge',
    what: 'How far this EV can drive on a full battery in EPA testing.',
    why: 'Real range varies with cold weather, speed, and hills. Use it to compare models.',
  },
  co2: {
    plain: 'Tailpipe emissions per mile',
    what: 'Grams of CO₂ out the tailpipe each mile. EVs show 0 at the pipe.',
    why: 'Lower = less climate impact from driving this car.',
  },
  ghgScore: {
    plain: '1 = dirty, 10 = clean',
    what: 'EPA emissions score from 1 to 10.',
    why: 'Quick gut-check on how clean the tailpipe is vs. other new cars.',
  },
  annualFuelCost: {
    plain: 'EPA’s yearly fuel bill estimate',
    what: 'Estimated annual fuel spend at EPA assumptions (15,000 mi/yr, US avg prices).',
    why: 'Good for comparing two cars, not your exact local bill.',
  },
  barrelsPerYear: {
    plain: 'How much oil this car would use',
    what: 'Barrels of petroleum per year at EPA driving assumptions.',
    why: 'An easy way to see which car is thirstier for oil.',
  },
  fuelSavings5yr: {
    plain: 'Fuel cost vs. an average new car',
    what: 'EPA estimate over 5 years compared to a typical new vehicle.',
    why: 'Shows if this car saves or costs more at the pump over time.',
  },
  kwhPer100mi: {
    plain: 'Electricity used per 100 miles',
    what: 'Kilowatt-hours the EV needs to go 100 miles.',
    why: 'Lower = cheaper to charge. Multiply by your $/kWh for a rough cost.',
  },
  charge240: {
    plain: 'Typical overnight home charge',
    what: 'Hours to fill from low on a 240V Level 2 home charger.',
    why: 'Fast chargers on road trips are much quicker where available.',
  },
  phevElectricRange: {
    plain: 'Miles you can drive on battery alone',
    what: 'Distance before the gas engine kicks in.',
    why: 'Tells you if your daily commute can stay electric-only.',
  },
  phevGasMpg: {
    plain: 'MPG after the battery runs out',
    what: 'Gas-only fuel economy once the plug-in battery is depleted.',
    why: 'What you get on long trips after electric range is used up.',
  },
  phevElectricMpge: {
    plain: 'Efficiency in electric mode',
    what: 'How efficiently the plug-in runs on battery power.',
    why: 'Higher = cheaper, cleaner short trips around town.',
  },
  zeroToSixty: {
    plain: 'Lower seconds = quicker',
    what: 'Time to go from 0 to 60 mph.',
    why: 'A simple gut-check for how quick the car feels off the line.',
  },
  safetyOverall: {
    plain: 'Government crash-test score',
    what: 'NHTSA overall rating from 1 to 5 stars.',
    why: 'Higher stars = better crash protection in NHTSA tests.',
  },
  safetyFrontal: {
    plain: 'Head-on crash protection',
    what: 'NHTSA rating for frontal impacts.',
    why: 'Relevant for highway and intersection collisions.',
  },
  safetySide: {
    plain: 'T-bone and side-hit protection',
    what: 'NHTSA rating for side impacts.',
    why: 'Important at intersections and in parking lots.',
  },
  safetyRollover: {
    plain: 'Resistance to tipping over',
    what: 'NHTSA rollover rating.',
    why: 'Especially worth checking on tall SUVs and trucks.',
  },
  countryOfOrigin: {
    plain: 'Where the brand is rooted',
    what: 'Country associated with the make, not always where your VIN was built.',
  },
  trim: {
    plain: 'This EPA configuration',
    what: 'The trim or equipment level tied to this fuel-economy record.',
    why: 'Same model year can list several trims with different engines and MPG.',
  },
  shoppingSegment: {
    plain: 'What kind of buyer it targets',
    what: 'How we classify the car for comparisons: sporty, luxury, utility, and so on.',
    why: 'Helps line it up against rivals you would actually cross-shop.',
  },
  msrp: {
    plain: 'Original sticker price',
    what: 'Estimated MSRP when new, anchored to EPA and market data.',
    why: 'Useful context for how much value may have left the vehicle.',
  },
  charge120: {
    plain: 'Slow home charging',
    what: 'Rough hours to fully charge on a standard 120V household outlet.',
    why: 'Level 1 is slow. Most EV owners use 240V when they can.',
  },
  phevBlendedMpge: {
    plain: 'Blended plug-in efficiency',
    what: 'EPA combined MPGe when electric and gas modes are averaged together.',
    why: 'A single headline for mixed driving. See gas and electric modes for detail.',
  },
  power: {
    plain: 'Higher = stronger acceleration',
    what: 'Peak horsepower from the engine or electric motor.',
    why: 'Useful for comparing get-up-and-go between similar cars.',
  },
  efficiency: {
    plain: 'How far it goes per unit of energy',
    what: 'EPA combined MPG (gas) or MPGe (electric).',
    why: 'The headline number for comparing running costs between models.',
  },
  range: {
    plain: 'Distance on a full charge',
    what: 'EPA-rated electric driving range.',
    why: 'Check it against your longest regular trip, with buffer for weather.',
  },
};

export const GLANCE_GLOSSARY: Partial<Record<string, SpecGlossaryKey>> = {
  power: 'power',
  engine: 'engine',
  mpg: 'efficiency',
  range: 'range',
  safety: 'safetyOverall',
  value: 'msrp',
  running: 'annualFuelCost',
};

export function getSpecEntry(key: SpecGlossaryKey): SpecGlossaryEntry {
  return SPEC_GLOSSARY[key];
}

export function getSpecPlain(key: SpecGlossaryKey): string {
  return SPEC_GLOSSARY[key].plain;
}

/** @deprecated Prefer getSpecEntry + SpecTipBody for structured tooltips. */
export function getSpecTip(key: SpecGlossaryKey): string {
  const { what, why } = SPEC_GLOSSARY[key];
  return why ? `${what} ${why}` : what;
}
