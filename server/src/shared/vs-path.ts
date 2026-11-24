/**
 * The address of two models side by side, in the words people search with:
 * "/models/toyota/rav4" and "/models/honda/cr-v" make
 * "/compare/toyota-rav4-vs-honda-cr-v". The server answers it; the app links
 * to it from each model's rivals.
 */
export function modelSlug(modelPath: string): string {
  return modelPath.replace(/^\/models\//, '').replace('/', '-');
}

export function vsPath(firstModelPath: string, secondModelPath: string): string {
  return `/compare/${modelSlug(firstModelPath)}-vs-${modelSlug(secondModelPath)}`;
}

/**
 * Both ways a pair can be split at "-vs-", for a name that has those letters
 * in it: "a-vs-b-vs-c" is tried as "a" against "b-vs-c", then "a-vs-b"
 * against "c".
 */
export function vsSplits(pair: string): Array<[string, string]> {
  const text = pair.toLowerCase();
  const out: Array<[string, string]> = [];
  for (let at = text.indexOf('-vs-'); at > 0; at = text.indexOf('-vs-', at + 1)) {
    out.push([text.slice(0, at), text.slice(at + 4)]);
  }
  return out;
}

/** "Toyota RAV4 vs Honda CR-V (2026)": the page's title, in the app and for search. */
export function vsTitle(page: { label: string; year: number | null }): string {
  return page.year ? `${page.label} (${page.year})` : page.label;
}
