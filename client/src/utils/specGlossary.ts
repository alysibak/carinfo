/**
 * Plain-language spec definitions — short enough to read in a glance.
 * `what` = one sentence definition. `why` = one sentence on why you'd care.
 */

import { msg, t } from '../i18n';

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
  | 'seats'
  | 'towing'
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
    plain: msg('The motor that powers the car'),
    what: msg('The full engine description: size, layout, and fuel type.'),
    why: msg('Tells you what you’re actually buying under the hood.'),
  },
  displacement: {
    plain: msg('Engine size, not the only measure of power'),
    what: msg(
      'Liters (L) of air+fuel the engine moves per full cycle. A 1.6L engine is smaller than a 3.5L.',
    ),
    why: msg(
      'Bigger often means more power, but turbos let small engines punch above their weight.',
    ),
  },
  configuration: {
    plain: msg('How the cylinders are laid out'),
    what: msg(
      'I4 or I6 = cylinders in a line. V6/V8 = in a V. Flat-4/Flat-6 = opposed (boxer: Subaru, Porsche). W12 = two narrow Vs side by side (Bentley). VR6 = a very narrow V6 (Volkswagen). Rotary = a Wankel, with rotors instead of pistons (Mazda RX-7, RX-8). EPA records only the cylinder count; the layout comes from the engine family, and a six from a maker we do not have on record shows as a count.',
    ),
    why: msg(
      'Layout affects smoothness, packaging, and sometimes repair cost. I4 is the everyday default.',
    ),
  },
  cylinders: {
    plain: msg('More cylinders can feel smoother'),
    what: msg('The number of combustion chambers firing in the engine.'),
    why: msg(
      'Six or eight cylinders often feel smoother; four is lighter and usually cheaper on fuel.',
    ),
  },
  horsepower: {
    plain: msg('Higher = quicker acceleration'),
    what: msg('Peak power the engine can put out, like the engine’s top strength.'),
    why: msg('Helps with highway passing and loaded acceleration. Weight and gearing matter too.'),
  },
  torque: {
    plain: msg('Pulling power from a standstill'),
    what: msg('Twisting force in lb-ft, what you feel when you hit the gas from a stop.'),
    why: msg('High torque makes towing and hill starts easier, even before you’re going fast.'),
  },
  drivetrain: {
    plain: msg('Which wheels get the power'),
    what: msg('FWD drives the front wheels. RWD drives the rear. AWD/4WD can drive all four.'),
    why: msg('AWD/4WD helps in snow; RWD can feel more balanced; FWD is common and efficient.'),
  },
  transmission: {
    plain: msg('How power reaches the wheels'),
    what: msg(
      'Automatic shifts for you. Manual you shift. CVT has no fixed gears. An automated manual is a gearbox with clutches instead of a torque converter that the car shifts itself: usually a dual-clutch (Porsche PDK, VW DSG).',
    ),
    why: msg('Affects how the car feels day to day and how it sips fuel on the highway.'),
  },
  fuel: {
    plain: msg('What powers the car'),
    what: msg(
      'Gas, diesel, hybrid, plug-in hybrid, electric, or hydrogen fuel cell. A mild hybrid is listed by its fuel: its 48-volt motor helps the engine but never drives the car alone.',
    ),
    why: msg('Drives your fuel stops, charging habits, and running costs.'),
  },
  body: {
    plain: msg('Shape and how you use the space'),
    what: msg('Sedan, SUV, coupe, hatchback, truck, van, etc.'),
    why: msg('Sets passenger room, cargo access, ride height, and how it drives.'),
  },
  category: {
    plain: msg('Broad type for comparing similar cars'),
    what: msg('Grouped as car, SUV, truck, or van.'),
    why: msg('Helps compare vehicles that shoppers actually cross-shop.'),
  },
  epaClass: {
    plain: msg('EPA’s size class, by the room inside'),
    what: msg(
      'EPA sorts cars by passenger and cargo room, not by their size outside, so a roomy compact like the 2022 Civic is “Midsize Cars”. SUVs, pickups and vans go by type and weight.',
    ),
    why: msg('“Competes as” is the class shoppers compare it within.'),
  },
  mpgCity: {
    plain: msg('Stop-and-go efficiency'),
    what: msg('Miles per gallon in city traffic (EPA test).'),
    why: msg('Matters most if your commute is lots of lights and short trips.'),
  },
  mpgHighway: {
    plain: msg('Open-road efficiency'),
    what: msg('Miles per gallon at steady highway speed (EPA test).'),
    why: msg('Matters most for long commutes and road trips.'),
  },
  mpgCombined: {
    plain: msg('Best single number to compare cars'),
    what: msg('EPA blend of city and highway (55% city / 45% highway).'),
    why: msg('The fairest headline MPG when you’re comparing two gas cars.'),
  },
  mpge: {
    plain: msg('Electric efficiency vs. a gallon of gas'),
    what: msg('Miles-per-gallon equivalent for electric energy use.'),
    why: msg('Higher MPGe = the EV uses less electricity per mile. It does not burn gasoline.'),
  },
  epaRange: {
    plain: msg('EPA-tested distance on a full charge'),
    what: msg('How far this EV can drive on a full battery in EPA testing.'),
    why: msg('Real range varies with cold weather, speed, and hills. Use it to compare models.'),
  },
  co2: {
    plain: msg('Tailpipe emissions per kilometre'),
    what: msg(
      'Grams of CO₂ out the tailpipe each kilometre (EPA publishes grams per mile, shown beside it). EVs show 0 at the pipe.',
    ),
    why: msg('Lower = less climate impact from driving this car.'),
  },
  luggageVolume: {
    plain: msg('How much fits in the trunk or cargo area'),
    what: msg(
      'EPA’s luggage volume: a sedan’s or coupe’s trunk, or for a hatchback, wagon, SUV or van the space behind the rearmost seats with every seat up. EPA measures it for cars and some SUVs, not pickups.',
    ),
    why: msg('Strollers, hockey bags and groceries: litres you can compare across cars.'),
  },
  passengerVolume: {
    plain: msg('Room for the people inside'),
    what: msg(
      'EPA’s passenger volume: the space for the occupants, front and rear, as EPA lists it.',
    ),
    why: msg('A bigger number is more room; compare cars of the same size class.'),
  },
  seats: {
    plain: msg('How many people it seats'),
    what: msg('Seating capacity from the maker. A range means a third row is optional.'),
    why: msg('Tells you whether a third row is on the table before you cross-shop.'),
  },
  towing: {
    plain: msg('Heaviest trailer it can tow'),
    what: msg(
      'Maximum conventional towing capacity in pounds when properly equipped, as the maker publishes it. EPA does not rate towing.',
    ),
    why: msg(
      'A boat, camper or utility trailer: compare only against other properly-equipped ratings.',
    ),
  },
  ghgScore: {
    plain: msg('1 = most CO₂, 10 = least'),
    what: msg('EPA’s greenhouse gas rating, 1 to 10, from the car’s tailpipe CO₂.'),
    why: msg('A quick check on how much CO₂ it puts out against other new cars.'),
  },
  annualFuelCost: {
    plain: msg('EPA’s yearly fuel bill estimate'),
    what: msg('Estimated annual fuel spend at EPA assumptions (15,000 mi/yr, US avg prices).'),
    why: msg('Good for comparing two cars, not your exact local bill.'),
  },
  barrelsPerYear: {
    plain: msg('How much oil this car would use'),
    what: msg('Barrels of petroleum per year at EPA driving assumptions.'),
    why: msg('An easy way to see which car is thirstier for oil.'),
  },
  fuelSavings5yr: {
    plain: msg('Fuel cost vs. an average new car'),
    what: msg(
      'EPA’s estimate over 5 years against the average new vehicle, in US dollars at US fuel prices, as published on fueleconomy.gov.',
    ),
    why: msg('Shows if this car saves or costs more at the pump over time.'),
  },
  kwhPer100mi: {
    plain: msg('Electricity used per 100 miles'),
    what: msg('Kilowatt-hours the EV needs to go 100 miles.'),
    why: msg('Lower = cheaper to charge. Multiply by your $/kWh for a rough cost.'),
  },
  charge240: {
    plain: msg('Typical overnight home charge'),
    what: msg('Hours to fill from low on a 240V Level 2 home charger.'),
    why: msg('Fast chargers on road trips are much quicker where available.'),
  },
  phevElectricRange: {
    plain: msg('Miles you can drive on battery alone'),
    what: msg('Distance before the gas engine kicks in.'),
    why: msg('Tells you if your daily commute can stay electric-only.'),
  },
  phevGasMpg: {
    plain: msg('MPG after the battery runs out'),
    what: msg('Gas-only fuel economy once the plug-in battery is depleted.'),
    why: msg('What you get on long trips after electric range is used up.'),
  },
  phevElectricMpge: {
    plain: msg('Efficiency in electric mode'),
    what: msg('How efficiently the plug-in runs on battery power.'),
    why: msg('Higher = cheaper, cleaner short trips around town.'),
  },
  zeroToSixty: {
    plain: msg('Lower seconds = quicker'),
    what: msg('Time to go from 0 to 60 mph.'),
    why: msg('A simple gut-check for how quick the car feels off the line.'),
  },
  safetyOverall: {
    plain: msg('Government crash-test score'),
    what: msg('NHTSA overall rating from 1 to 5 stars.'),
    why: msg('Higher stars = better crash protection in NHTSA tests.'),
  },
  safetyFrontal: {
    plain: msg('Head-on crash protection'),
    what: msg('NHTSA rating for frontal impacts.'),
    why: msg('Relevant for highway and intersection collisions.'),
  },
  safetySide: {
    plain: msg('T-bone and side-hit protection'),
    what: msg('NHTSA rating for side impacts.'),
    why: msg('Important at intersections and in parking lots.'),
  },
  safetyRollover: {
    plain: msg('Resistance to tipping over'),
    what: msg('NHTSA rollover rating.'),
    why: msg('Especially worth checking on tall SUVs and trucks.'),
  },
  rolloverRisk: {
    plain: msg('Chance of rolling over in a single-vehicle crash'),
    what: msg(
      'NHTSA’s estimate, from how top-heavy the vehicle is (its static stability factor) and a driving test of whether it tips.',
    ),
    why: msg(
      'Lower is better. Tall, narrow vehicles roll more readily; NHTSA compares this across all kinds of vehicle.',
    ),
  },
  stabilityControl: {
    plain: msg('Helps stop a skid'),
    what: msg(
      'Electronic stability control brakes individual wheels when the car starts to slide, to keep it going where it is steered.',
    ),
    why: msg('Most useful on wet, snowy or icy roads.'),
  },
  collisionWarning: {
    plain: msg('Warns before a frontal crash'),
    what: msg(
      'Forward collision warning alerts the driver when the car is closing on the vehicle ahead too fast. It warns; braking on its own is automatic emergency braking, which these NHTSA listings do not cover.',
    ),
    why: msg('A warning in time can prevent a rear-end collision.'),
  },
  laneDepartureWarning: {
    plain: msg('Warns when drifting out of the lane'),
    what: msg(
      'Lane departure warning alerts the driver when the car crosses a lane marking without the turn signal on. Lane keeping assist, which steers back, is a different feature.',
    ),
    why: msg('Helps on long drives, when attention drifts.'),
  },
  wheelbase: {
    plain: msg('Distance between the front and rear wheels'),
    what: msg(
      'From the centre of the front wheels to the centre of the rear wheels, as Transport Canada measured it.',
    ),
    why: msg('Longer usually means more room inside and a wider turning circle.'),
  },
  curbWeight: {
    plain: msg('Weight empty, ready to drive'),
    what: msg(
      'The car’s weight with fluids and a full tank, without passengers or cargo, as Transport Canada measured it.',
    ),
  },
  countryOfOrigin: {
    plain: msg('Where the brand is rooted'),
    what: msg('Country associated with the make, not always where your VIN was built.'),
  },
  trim: {
    plain: msg('This EPA configuration'),
    what: msg('The trim or equipment level tied to this fuel-economy record.'),
    why: msg('Same model year can list several trims with different engines and MPG.'),
  },
  variant: {
    plain: msg('Named from the engine'),
    what: msg(
      'EPA leaves this trim out of the model name (a Mustang GT is just "Mustang"), so we name it from the engine and gearbox, which only this trim has in these years.',
    ),
    why: msg(
      'It is how sellers list the car, and it moves the price far more than the model name suggests.',
    ),
  },
  competitiveClass: {
    plain: msg('The rivals it is shopped against'),
    what: msg(
      "The class shoppers compare it within, by model: a Camry is a midsize car beside an Accord and a Sonata, whatever EPA's interior-volume class says. A second class qualifies the first: a G-Class is a full-size luxury SUV and an off-roader.",
    ),
    why: msg('Similar vehicles are drawn from it first.'),
  },
  generation: {
    plain: msg('Which version of the model'),
    what: msg(
      "The model's generation, by the maker's chassis code and count, in North American model years. EPA files years, not generations, so this comes from a table of the best-known lines.",
    ),
    why: msg(
      'Parts, known problems and how a car drives follow the generation more than the year: a 2006 3 Series may be an E46 or an E90.',
    ),
  },
  enginePosition: {
    plain: msg('Where the engine sits'),
    what: msg(
      'Behind the seats (mid-engine) or behind the rear axle (rear-engine), by model: EPA does not record it.',
    ),
    why: msg('It shapes the balance and handling, and how much luggage room there is.'),
  },
  shoppingSegment: {
    plain: msg('What kind of buyer it targets'),
    what: msg('How we classify the car for comparisons: sporty, luxury, utility, and so on.'),
    why: msg('Helps line it up against rivals you would actually cross-shop.'),
  },
  msrp: {
    plain: msg('Original sticker price'),
    what: msg('Estimated MSRP when new, anchored to EPA and market data.'),
    why: msg('Useful context for how much value may have left the vehicle.'),
  },
  charge120: {
    plain: msg('Slow home charging'),
    what: msg('Rough hours to fully charge on a standard 120V household outlet.'),
    why: msg('Level 1 is slow. Most EV owners use 240V when they can.'),
  },
  phevBlendedMpge: {
    plain: msg('Blended plug-in efficiency'),
    what: msg('EPA combined MPGe when electric and gas modes are averaged together.'),
    why: msg('A single headline for mixed driving. See gas and electric modes for detail.'),
  },
  power: {
    plain: msg('Higher = stronger acceleration'),
    what: msg('Peak horsepower from the engine or electric motor.'),
    why: msg('Useful for comparing get-up-and-go between similar cars.'),
  },
  efficiency: {
    plain: msg('How far it goes per unit of energy'),
    what: msg('EPA combined MPG (gas) or MPGe (electric).'),
    why: msg('The headline number for comparing running costs between models.'),
  },
  range: {
    plain: msg('Distance on a full charge'),
    what: msg('EPA-rated electric driving range.'),
    why: msg('Check it against your longest regular trip, with buffer for weather.'),
  },
};

export function getSpecEntry(key: SpecGlossaryKey): SpecGlossaryEntry {
  const e = SPEC_GLOSSARY[key];
  return {
    plain: t(e.plain),
    what: t(e.what),
    why: e.why ? t(e.why) : undefined,
  };
}

export function getSpecPlain(key: SpecGlossaryKey): string {
  return t(SPEC_GLOSSARY[key].plain);
}
