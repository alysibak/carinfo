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
  | 'luggageVolume'
  | 'passengerVolume'
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
  | 'rolloverRisk'
  | 'stabilityControl'
  | 'collisionWarning'
  | 'laneDepartureWarning'
  | 'wheelbase'
  | 'curbWeight'
  | 'countryOfOrigin'
  | 'trim'
  | 'variant'
  | 'shoppingSegment'
  | 'competitiveClass'
  | 'generation'
  | 'enginePosition'
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
    what: 'I4 or I6 = cylinders in a line. V6/V8 = in a V. Flat-4/Flat-6 = opposed (boxer: Subaru, Porsche). W12 = two narrow Vs side by side (Bentley). VR6 = a very narrow V6 (Volkswagen). Rotary = a Wankel, with rotors instead of pistons (Mazda RX-7, RX-8). EPA records only the cylinder count; the layout comes from the engine family, and a six from a maker we do not have on record shows as a count.',
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
    what: 'Automatic shifts for you. Manual you shift. CVT has no fixed gears. An automated manual is a gearbox with clutches instead of a torque converter that the car shifts itself: usually a dual-clutch (Porsche PDK, VW DSG).',
    why: 'Affects how the car feels day to day and how it sips fuel on the highway.',
  },
  fuel: {
    plain: 'What powers the car',
    what: 'Gas, diesel, hybrid, plug-in hybrid, electric, or hydrogen fuel cell. A mild hybrid is listed by its fuel: its 48-volt motor helps the engine but never drives the car alone.',
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
    plain: 'EPA’s size class, by the room inside',
    what: 'EPA sorts cars by passenger and cargo room, not by their size outside, so a roomy compact like the 2022 Civic is “Midsize Cars”. SUVs, pickups and vans go by type and weight.',
    why: '“Competes as” is the class shoppers compare it within.',
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
    plain: 'Tailpipe emissions per kilometre',
    what: 'Grams of CO₂ out the tailpipe each kilometre (EPA publishes grams per mile, shown beside it). EVs show 0 at the pipe.',
    why: 'Lower = less climate impact from driving this car.',
  },
  luggageVolume: {
    plain: 'How much fits in the trunk or cargo area',
    what: 'EPA’s luggage volume: a sedan’s or coupe’s trunk, or for a hatchback, wagon, SUV or van the space behind the rearmost seats with every seat up. EPA measures it for cars and some SUVs, not pickups.',
    why: 'Strollers, hockey bags and groceries: litres you can compare across cars.',
  },
  passengerVolume: {
    plain: 'Room for the people inside',
    what: 'EPA’s passenger volume: the space for the occupants, front and rear, as EPA lists it.',
    why: 'A bigger number is more room; compare cars of the same size class.',
  },
  ghgScore: {
    plain: '1 = most CO₂, 10 = least',
    what: 'EPA’s greenhouse gas rating, 1 to 10, from the car’s tailpipe CO₂.',
    why: 'A quick check on how much CO₂ it puts out against other new cars.',
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
    what: 'EPA’s estimate over 5 years against the average new vehicle, in US dollars at US fuel prices, as published on fueleconomy.gov.',
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
  rolloverRisk: {
    plain: 'Chance of rolling over in a single-vehicle crash',
    what: 'NHTSA’s estimate, from how top-heavy the vehicle is (its static stability factor) and a driving test of whether it tips.',
    why: 'Lower is better. Tall, narrow vehicles roll more readily; NHTSA compares this across all kinds of vehicle.',
  },
  stabilityControl: {
    plain: 'Helps stop a skid',
    what: 'Electronic stability control brakes individual wheels when the car starts to slide, to keep it going where it is steered.',
    why: 'Most useful on wet, snowy or icy roads.',
  },
  collisionWarning: {
    plain: 'Warns before a frontal crash',
    what: 'Forward collision warning alerts the driver when the car is closing on the vehicle ahead too fast. It warns; braking on its own is automatic emergency braking, which these NHTSA listings do not cover.',
    why: 'A warning in time can prevent a rear-end collision.',
  },
  laneDepartureWarning: {
    plain: 'Warns when drifting out of the lane',
    what: 'Lane departure warning alerts the driver when the car crosses a lane marking without the turn signal on. Lane keeping assist, which steers back, is a different feature.',
    why: 'Helps on long drives, when attention drifts.',
  },
  wheelbase: {
    plain: 'Distance between the front and rear wheels',
    what: 'From the centre of the front wheels to the centre of the rear wheels, as Transport Canada measured it.',
    why: 'Longer usually means more room inside and a wider turning circle.',
  },
  curbWeight: {
    plain: 'Weight empty, ready to drive',
    what: 'The car’s weight with fluids and a full tank, without passengers or cargo, as Transport Canada measured it.',
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
  variant: {
    plain: 'Named from the engine',
    what: 'EPA leaves this trim out of the model name (a Mustang GT is just "Mustang"), so we name it from the engine and gearbox, which only this trim has in these years.',
    why: 'It is how sellers list the car, and it moves the price far more than the model name suggests.',
  },
  competitiveClass: {
    plain: 'The rivals it is shopped against',
    what: "The class shoppers compare it within, by model: a Camry is a midsize car beside an Accord and a Sonata, whatever EPA's interior-volume class says. A second class qualifies the first: a G-Class is a full-size luxury SUV and an off-roader.",
    why: 'Similar vehicles are drawn from it first.',
  },
  generation: {
    plain: 'Which version of the model',
    what: "The model's generation, by the maker's chassis code and count, in North American model years. EPA files years, not generations, so this comes from a table of the best-known lines.",
    why: 'Parts, known problems and how a car drives follow the generation more than the year: a 2006 3 Series may be an E46 or an E90.',
  },
  enginePosition: {
    plain: 'Where the engine sits',
    what: 'Behind the seats (mid-engine) or behind the rear axle (rear-engine), by model: EPA does not record it.',
    why: 'It shapes the balance and handling, and how much luggage room there is.',
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

export function getSpecEntry(key: SpecGlossaryKey): SpecGlossaryEntry {
  return SPEC_GLOSSARY[key];
}

export function getSpecPlain(key: SpecGlossaryKey): string {
  return SPEC_GLOSSARY[key].plain;
}
