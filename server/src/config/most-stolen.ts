import type { TheftRank } from '../types/car.types.js';

/**
 * Équité Association's Top 10 Most Stolen Vehicles in Canada for 2024,
 * released 18 November 2025. Équité is the insurance industry's body for
 * investigating fraud and crime, and ranks models by how many were stolen.
 * Only the ranks are kept: they agree across Équité's release and the press
 * that reported it, and say what a buyer needs, with Équité's page for the
 * counts.
 *
 * Each model's lines are the site's (car.service modelLineKey), so the
 * electric Silverado, F-150 Lightning and Grand Highlander, which Équité
 * names apart or not at all, stay off it.
 */
export const MOST_STOLEN = {
  year: 2024,
  released: '2025-11-18',
  url: 'https://www.equiteassociation.com/top-10-most-stolen-vehicles',
  models: [
    { rank: 1, model: 'Toyota RAV4', lines: ['toyota|rav4'] },
    { rank: 2, model: 'Dodge Ram 1500', lines: ['ram|1500', 'dodge|ram'] },
    { rank: 3, model: 'Honda CR-V', lines: ['honda|cr-v'] },
    { rank: 4, model: 'Ford F-150', lines: ['ford|f150'] },
    { rank: 5, model: 'Honda Civic', lines: ['honda|civic'] },
    { rank: 6, model: 'Jeep Wrangler', lines: ['jeep|wrangler'] },
    {
      rank: 7,
      model: 'Chevrolet Silverado and GMC Sierra 1500',
      lines: ['chevrolet|silverado', 'gmc|sierra'],
    },
    { rank: 8, model: 'Toyota Highlander', lines: ['toyota|highlander'] },
    { rank: 9, model: 'Toyota Tundra', lines: ['toyota|tundra'] },
    { rank: 10, model: 'Lexus RX', lines: ['lexus|rx'] },
  ],
} as const;

const byLine = new Map<string, TheftRank>(
  MOST_STOLEN.models.flatMap((entry) =>
    entry.lines.map((line): [string, TheftRank] => [
      line,
      {
        rank: entry.rank,
        of: MOST_STOLEN.models.length,
        model: entry.model,
        year: MOST_STOLEN.year,
        url: MOST_STOLEN.url,
      },
    ]),
  ),
);

/** Where a model line stands on Équité's list, or undefined when it is not on it. */
export function theftRankOf(line: string): TheftRank | undefined {
  return byLine.get(line);
}
