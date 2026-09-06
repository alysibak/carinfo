/**
 * Lightweight fuzzy helpers for search / autocomplete typo tolerance.
 */

/** Common make/model aliases shoppers type. */
const ALIASES: Record<string, string> = {
  chevy: 'chevrolet',
  chevrolet: 'chevrolet',
  vw: 'volkswagen',
  volkswagen: 'volkswagen',
  benz: 'mercedes-benz',
  mercedes: 'mercedes-benz',
  'mercedes benz': 'mercedes-benz',
  mb: 'mercedes-benz',
  bmw: 'bmw',
  landrover: 'land rover',
  'landrover': 'land rover',
  range: 'land rover',
  rover: 'land rover',
  caddy: 'cadillac',
  cadilac: 'cadillac',
  toyata: 'toyota',
  toyoto: 'toyota',
  hond: 'honda',
  nisssan: 'nissan',
  nisaan: 'nissan',
  subaruu: 'subaru',
  porche: 'porsche',
  porshe: 'porsche',
  tesala: 'tesla',
  hyndai: 'hyundai',
  hyuandai: 'hyundai',
  volkswagon: 'volkswagen',
  chevorlet: 'chevrolet',
  chevroelt: 'chevrolet',
  infiniti: 'infiniti',
  infinity: 'infiniti',
  acura: 'acura',
  akura: 'acura',
  f150: 'f-150',
  'f 150': 'f-150',
  model3: 'model 3',
  modelY: 'model y',
  rav: 'rav4',
  crv: 'cr-v',
  'crv': 'cr-v',
  hrv: 'hr-v',
  cx5: 'cx-5',
  cx50: 'cx-50',
};

export function normalizeSearchToken(token: string): string {
  const t = token.toLowerCase().trim();
  return ALIASES[t] ?? t;
}

export function normalizeSearchQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(normalizeSearchToken)
    .join(' ');
}

/** Levenshtein distance with early exit when over maxDist. */
export function editDistance(a: string, b: string, maxDist = 2): number {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > maxDist) return maxDist + 1;
  if (la === 0) return lb;
  if (lb === 0) return la;

  let prev = new Array<number>(lb + 1);
  let curr = new Array<number>(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;

  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= lb; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > maxDist) return maxDist + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[lb];
}

export function maxEditsForToken(token: string): number {
  if (token.length <= 3) return 0;
  if (token.length <= 5) return 1;
  return 2;
}

/** True if haystack contains token, or a word/substring within edit distance. */
export function fuzzyTokenMatch(haystack: string, token: string): boolean {
  if (!token) return true;
  if (haystack.includes(token)) return true;

  const maxDist = maxEditsForToken(token);
  if (maxDist === 0) return false;

  const words = haystack.split(/[\s\-_/]+/).filter(Boolean);
  for (const word of words) {
    if (editDistance(word, token, maxDist) <= maxDist) return true;
    if (word.length > token.length + maxDist) {
      // Prefix / infix window for longer compound model names
      for (let i = 0; i <= word.length - token.length; i++) {
        const slice = word.slice(i, i + token.length);
        if (editDistance(slice, token, maxDist) <= maxDist) return true;
      }
    }
  }
  return false;
}

/** Best (lowest) edit distance from query to a candidate label. */
export function bestFuzzyScore(query: string, candidate: string): number {
  const q = query.toLowerCase();
  const c = candidate.toLowerCase();
  if (c === q) return 0;
  if (c.startsWith(q) || c.includes(q)) return 0.5;
  return editDistance(q, c, 3);
}
