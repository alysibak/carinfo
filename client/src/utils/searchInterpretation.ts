import { ordinal } from '@carinfo/shared/theft';
import type { SearchInterpretation } from '../types/car.types';
import { locale, t } from '../i18n';
import { fmtMoney, fmtNumber } from '../i18n/format';

const LITRES_AT_1_MPG = 235.215;

function joinAnd(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? '';
  return t('{list} and {last}', {
    list: parts.slice(0, -1).join(', '),
    last: parts.at(-1)!,
  });
}

/** "EPA combined rating of 30 MPG or better (7.8 L/100 km or less)." */
function describeFuelEconomy(
  bound: NonNullable<SearchInterpretation['fuelEconomy']>,
  evsLeftOut: boolean,
): string {
  const { min, max, unit, basis = 'combined' } = bound;
  const litres = (mpg: number) => `${(LITRES_AT_1_MPG / mpg).toFixed(1)} L/100 km`;
  const mpg = (litresVal: number, round: (n: number) => number) =>
    `${round(LITRES_AT_1_MPG / litresVal)} MPG`;
  const leftOut = evsLeftOut ? t('; electric cars are left out') : '';
  if (unit === 'L/100 km') {
    const text =
      min != null && max != null
        ? t('{min} to {max} L/100 km ({mpgMax} to {mpgMin})', {
            min,
            max,
            mpgMax: mpg(max, Math.ceil),
            mpgMin: mpg(min, Math.floor),
          })
        : max != null
          ? t('{max} L/100 km or less ({mpg} or better)', {
              max,
              mpg: mpg(max, Math.ceil),
            })
          : t('{min} L/100 km or more ({mpg} or worse)', {
              min: min!,
              mpg: mpg(min!, Math.floor),
            });
    return t('EPA {basis} fuel consumption of {text}{leftOut}.', { basis, text, leftOut });
  }
  const metric = unit === 'MPG';
  const text =
    min != null && max != null
      ? metric
        ? t('{min} to {max} {unit} ({litresMin} to {litresMax})', {
            min,
            max,
            unit,
            litresMin: litres(min),
            litresMax: litres(max),
          })
        : t('{min} to {max} {unit}', { min, max, unit })
      : min != null
        ? metric
          ? t('{min} {unit} or better ({litres} or less)', { min, unit, litres: litres(min) })
          : t('{min} {unit} or better', { min, unit })
        : metric
          ? t('{max} {unit} or less ({litres} or more)', {
              max: max!,
              unit,
              litres: litres(max!),
            })
          : t('{max} {unit} or less', { max: max!, unit });
  return t('EPA {basis} rating of {text}{leftOut}.', { basis, text, leftOut });
}

function describeHorsepower({ min, max }: NonNullable<SearchInterpretation['horsepower']>): string {
  const text =
    min != null && max != null
      ? t('{min} to {max} hp', { min, max })
      : min != null
        ? t('{min} hp or more', { min })
        : t('{max} hp or less', { max: max! });
  return t('{text}; cars with no rating on file are left out.', { text });
}

function yearAskedText(asked: { min?: number; max?: number }): string {
  if (asked.min != null && asked.max != null) {
    return asked.min === asked.max ? `${asked.min}` : `${asked.min}–${asked.max}`;
  }
  if (asked.min != null) return t('{year} and newer', { year: asked.min });
  return t('{year} and older', { year: asked.max! });
}

export function describeSearchInterpretation(
  interpretation: SearchInterpretation | undefined,
): string[] {
  if (!interpretation) return [];
  const lines: string[] = [];
  if (interpretation.otherYears) {
    const { asked, onFile } = interpretation.otherYears;
    const askedText = yearAskedText(asked);
    const runs = onFile.map((r) => (r.min === r.max ? `${r.min}` : `${r.min}–${r.max}`));
    lines.push(
      t('None on file for {asked}. Showing the years that are: {years}.', {
        asked: askedText,
        years: joinAnd(runs),
      }),
    );
  }
  if (interpretation.similarTo) {
    lines.push(
      t('Rivals of the {label}: the models shoppers compare it with, by class, size and price.', {
        label: interpretation.similarTo.label,
      }),
    );
  }
  if (interpretation.ignored?.length) {
    lines.push(
      t('EPA records no trim levels, so “{words}” was left out of the search.', {
        words: interpretation.ignored.join(' '),
      }),
    );
  }
  const price = interpretation.price;
  if (price?.min != null && price.max != null) {
    lines.push(
      t('Estimated value {min} to {max}.', {
        min: fmtMoney(price.min),
        max: fmtMoney(price.max),
      }),
    );
  } else if (price?.max != null) {
    lines.push(t('Estimated value under {max}.', { max: fmtMoney(price.max) }));
  } else if (price?.min != null) {
    lines.push(t('Estimated value over {min}.', { min: fmtMoney(price.min) }));
  }
  if (interpretation.fuelEconomy) {
    lines.push(describeFuelEconomy(interpretation.fuelEconomy, !!interpretation.gasMileage));
  }
  if (interpretation.horsepower) lines.push(describeHorsepower(interpretation.horsepower));
  if (interpretation.engineSize != null) {
    lines.push(t('{size}-litre engines only.', { size: interpretation.engineSize.toFixed(1) }));
  }
  if (interpretation.engineFamily) {
    lines.push(t('Read as {family}.', { family: interpretation.engineFamily }));
  }
  if (interpretation.generation) {
    lines.push(t('Read as the {generation}.', { generation: interpretation.generation }));
  }
  if (interpretation.layouts?.length) {
    lines.push(
      t(
        '{names} engines only: EPA records a cylinder count, so the layout comes from the engine family.',
        { names: joinAnd(interpretation.layouts) },
      ),
    );
  }
  const order = {
    price: () => t('Cheapest first by estimated value'),
    fuelEconomy: () => t('Most fuel-efficient first'),
    horsepower: () => t('Most powerful first'),
    range: () => t('Longest EPA range first'),
    safety: () =>
      t(
        'Best NHTSA crash rating first, ties by its crash scores and the safety technology it lists; its ratings start with 2011 models',
      ),
    runningCost: () =>
      t(
        'Lowest estimated yearly running cost first: fuel, insurance, upkeep and tires, at the chosen region’s baseline',
      ),
    luggage: () =>
      t(
        'Most trunk or cargo space first, by EPA’s luggage volume; cars EPA gives none (pickups, most SUVs and vans) come last',
      ),
    theft: () => t('Most stolen first, in Équité Association’s order'),
  } as const;
  if (interpretation.sortedBy) {
    const base = order[interpretation.sortedBy]();
    lines.push(
      interpretation.recentFrom != null
        ? t('{order}, model years {year} and newer.', {
            order: base,
            year: interpretation.recentFrom,
          })
        : t('{order}.', { order: base }),
    );
  }
  if (interpretation.firstCar) {
    const { minYear, minStars, maxHp, minMpg, minWeightKg } = interpretation.firstCar;
    lines.push(
      t(
        'Read as a first car, as the First car preset: {minYear} or newer, {minStars} or more NHTSA crash-test stars, {weight} kg or heavier (IIHS and Consumer Reports list no car under 2,750 lb for teens), {maxHp} hp or less, {litres} L/100 km or less.',
        {
          minYear,
          minStars,
          weight: fmtNumber(minWeightKg),
          maxHp,
          litres: (235.215 / minMpg).toFixed(1),
        },
      ),
    );
  }
  if (interpretation.automatedManual) {
    lines.push(
      t(
        'Automated manuals only, as EPA files them: mostly dual-clutch gearboxes (PDK, DSG), some with a single clutch.',
      ),
    );
  }
  if (interpretation.mildHybrid) {
    lines.push(
      t(
        'Mild hybrids only: a 12-48 volt motor helps the engine but never drives the car, so they are listed by their fuel.',
      ),
    );
  }
  if (interpretation.records) {
    lines.push(
      t(
        'No source on file rates reliability. Each car’s page lists its model year’s recalls in Canada and owner complaints to NHTSA.',
      ),
    );
  }
  if (interpretation.theft) {
    const { least, year, model } = interpretation.theft;
    if (model) {
      if (model.rank) {
        const rank = model.rank.rank;
        if (rank === 1) {
          lines.push(
            t(
              'The {model} was the most stolen vehicle in Canada in {year}, by Équité Association’s count.',
              { model: model.rank.model, year: model.rank.year },
            ),
          );
        } else {
          const rankLabel = locale() === 'fr' ? `${rank}e` : ordinal(rank);
          lines.push(
            t(
              'The {model} was the {rank} most stolen vehicle in Canada in {year}, by Équité Association’s count.',
              { model: model.rank.model, rank: rankLabel, year: model.rank.year },
            ),
          );
        }
      } else {
        lines.push(
          t(
            'The {label} is not among the 10 vehicles stolen most in Canada in {year}, by Équité Association’s count, which does not make it safe from thieves.',
            { label: model.label, year },
          ),
        );
      }
    } else if (least) {
      lines.push(
        t(
          'Left out: the 10 models Équité Association counts as stolen most in Canada in {year}. No list ranks the least stolen, and a model off this one can still be a target.',
          { year },
        ),
      );
    } else {
      lines.push(
        t(
          'The models on Équité Association’s list of the most stolen in Canada in {year}, in its order: a count, so models with many on the road rank higher.',
          { year },
        ),
      );
    }
  }
  if (interpretation.safetyTech) {
    const names: Record<string, string> = {
      esc: t('stability control'),
      fcw: t('forward collision warning'),
      ldw: t('lane departure warning'),
    };
    const { features, standard } = interpretation.safetyTech;
    const listed = joinAnd(features.map((f) => names[f]));
    lines.push(
      standard
        ? t('Cars NHTSA lists with {features} as standard on every version it tested (2011 on).', {
            features: listed,
          })
        : t(
            'Cars NHTSA lists with {features}, standard or optional (2011 on); cars it did not test are left out.',
            { features: listed },
          ),
    );
  }
  if (interpretation.snow) {
    lines.push(
      t(
        'All- and four-wheel drive only, for snow: EPA records the drive, not the tires, which matter as much.',
      ),
    );
  }
  if (interpretation.rareFuelsLeftOut) {
    lines.push(
      t(
        'Hydrogen and natural-gas cars are left out: they sell cheaply because there is almost nowhere in Canada to fill them.',
      ),
    );
  }
  if (interpretation.gasMileage && !interpretation.fuelEconomy) {
    lines.push(t('Electric cars are left out: their MPGe does not compare with MPG.'));
  }
  if (interpretation.minRangeMiles != null) {
    const km = Math.round(interpretation.minRangeMiles * 1.609);
    lines.push(
      t('EPA range of at least {miles} miles ({km} km).', {
        miles: interpretation.minRangeMiles,
        km: fmtNumber(km),
      }),
    );
  }
  if (interpretation.newestFrom != null) {
    lines.push(t('Model years {year} and newer.', { year: interpretation.newestFrom }));
  }
  if (interpretation.twoRow) {
    lines.push(
      t(
        'Two rows of seats: models sold with a third row are left out, by model, as EPA records no seating.',
      ),
    );
  }
  if (interpretation.twoSeater) {
    lines.push(t("Two-seaters: EPA's two-seater class."));
  }
  if (interpretation.enginePosition) {
    lines.push(
      interpretation.enginePosition === 'front'
        ? t('Front-engined cars, by model: EPA records no engine position.')
        : interpretation.enginePosition === 'mid'
          ? t('Mid-engined cars, by model: EPA records no engine position.')
          : t('Rear-engined cars, by model: EPA records no engine position.'),
    );
  }
  if (interpretation.doors != null) {
    lines.push(
      interpretation.doors === 2
        ? t('{doors}-door models: named so, or coupes and convertibles, as EPA records no doors.', {
            doors: interpretation.doors,
          })
        : interpretation.doors === 4
          ? t('{doors}-door models: named so, or sedans, as EPA records no doors.', {
              doors: interpretation.doors,
            })
          : t('{doors}-door models: named so, or wagons, as EPA records no doors.', {
              doors: interpretation.doors,
            }),
    );
  }
  if (interpretation.threeRow) {
    lines.push(
      t(
        'Minivans, passenger vans and SUVs sold with a third row, by model: EPA records no seating.',
      ),
    );
  }
  if (interpretation.unmeasured?.length) {
    const words = joinAnd(interpretation.unmeasured.map((w) => `“${w}”`));
    lines.push(
      interpretation.unmeasured.length > 1
        ? t('No data on file measures {words}, so they were not used.', { words })
        : t('No data on file measures {words}, so it was not used.', { words }),
    );
    if (
      !interpretation.records &&
      interpretation.unmeasured.some((w) => /^(?:reliable|dependable|quality)$/.test(w))
    ) {
      lines.push(
        t(
          'For reliability, each car’s page lists its model year’s recalls in Canada and owner complaints to NHTSA, and each model’s page compares its years.',
        ),
      );
    }
  }
  if (interpretation.vehicleClass) {
    lines.push(
      t('Showing {className}, classed by model.', { className: interpretation.vehicleClass }),
    );
  }
  if (interpretation.compared?.length) {
    lines.push(
      t('Showing {parts} together.', {
        parts: joinAnd(interpretation.compared.map((part) => `“${part}”`)),
      }),
    );
  }
  return lines;
}
