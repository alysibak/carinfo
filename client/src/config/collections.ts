// The shortlists live with the server so its previews rank them the same way.
// Labels are re-marked here so client coverage can see the literals and the
// Collection page can translate them with t().
import {
  COLLECTIONS as SHARED_COLLECTIONS,
  type CollectionConfig,
  type CollectionDisplayConfig,
  type CollectionRankBy,
} from '@carinfo/shared/collections';
import { msg } from '../i18n';

export type { CollectionConfig, CollectionDisplayConfig, CollectionRankBy };

function withLabels(
  base: CollectionConfig,
  title: string,
  subtitle: string,
  description: string,
): CollectionConfig {
  return { ...base, title, subtitle, description };
}

export const COLLECTIONS: Record<string, CollectionConfig> = {
  goldilocks: withLabels(
    SHARED_COLLECTIONS.goldilocks,
    msg('Safe and thrifty'),
    msg('Five crash-test stars, the least fuel'),
    msg(
      'Gas and hybrid cars and SUVs from 2021 on with five NHTSA stars overall, ranked by EPA fuel economy.',
    ),
  ),
  'family-fortress': withLabels(
    SHARED_COLLECTIONS['family-fortress'],
    msg('Family fortress'),
    msg('Three rows, the best crash ratings'),
    msg(
      'Minivans and three-row SUVs from 2020 on, ranked by NHTSA crash rating, then EPA fuel economy.',
    ),
  ),
  'clean-record': withLabels(
    SHARED_COLLECTIONS['clean-record'],
    msg('Clean recall record'),
    msg('No recalls in Canada, 2019–2023'),
    msg(
      'Model years 2019 to 2023 with no recall in Canada for their powertrain, as Transport Canada lists them, ranked by NHTSA crash rating, then EPA fuel economy. Newer years are left out: they have had less time to be recalled.',
    ),
  ),
  'gas-savers': withLabels(
    SHARED_COLLECTIONS['gas-savers'],
    msg('Gas savers'),
    msg('The least fuel, gas and hybrid'),
    msg(
      'Gas and hybrid cars from 2019 on using 5.9 L/100 km or less, ranked by EPA fuel economy. EVs have their own list.',
    ),
  ),
  'future-proof': withLabels(
    SHARED_COLLECTIONS['future-proof'],
    msg('Future-proof'),
    msg('EVs with 400+ km of range'),
    msg(
      'Electric cars from 2022 on with at least 400 km of EPA range, from carmakers still in business, ranked by EPA range.',
    ),
  ),
  'work-horses': withLabels(
    SHARED_COLLECTIONS['work-horses'],
    msg('Work horses'),
    msg('Full-size 4x4 pickups, the least fuel'),
    msg(
      'Full-size four-wheel-drive gas, diesel and hybrid pickups from 2019 on, ranked by EPA fuel economy.',
    ),
  ),
  'weekend-warriors': withLabels(
    SHARED_COLLECTIONS['weekend-warriors'],
    msg('Weekend warriors'),
    msg('Sports cars, lightest first'),
    msg(
      'Sports cars from 2018 on, ranked by Transport Canada’s curb weight, the lightest first: less weight to carry around a corner.',
    ),
  ),
  'luxury-less': withLabels(
    SHARED_COLLECTIONS['luxury-less'],
    msg('Luxury, a few years old'),
    msg('Premium brands, 2018–2023'),
    msg(
      'German, Japanese, Korean, Swedish and American luxury brands from 2018 to 2023, ranked by NHTSA crash rating, then the newest.',
    ),
  ),
};
