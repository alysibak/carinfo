/**
 * Whether an EPA Test Car List "Rated Horsepower" figure can be a real rating.
 *
 * That list is the source of most horsepower on the site, and a handful of its
 * rows carry placeholders or mis-keyed values: 999 (a sentinel; an Audi TT RS
 * showed "999 hp"), 1 (a 2026 Ford Bronco Sport showed "1 hp"), and one- or
 * two-digit figures on multi-litre engines (the 2021 Mercedes C300 at 11 hp,
 * the 2010 Cayenne S at 35). Across the corpus every genuine rating sits at or
 * above 30 hp per litre and every bad one at or below 18, so the per-litre
 * bounds below have wide margins on both sides. The upper bound still admits
 * the Bugatti Chiron (1,500 hp from 8.0 L) and hybrid hypercars.
 *
 * The 40 hp floor also drops the BMW i3 with Range Extender's rating, which is
 * its 0.6 L generator (11–38 hp), not the 170 hp motor that drives the car.
 */
export function isPlausibleRatedHorsepower(hp: number, displacementL?: number | null): boolean {
  if (!Number.isFinite(hp) || hp < 40 || hp > 2000) return false;
  if (hp === 999) return false;
  if (displacementL != null && displacementL > 0) {
    const perLitre = hp / displacementL;
    if (perLitre < 20 || perLitre > 300) return false;
  }
  return true;
}
