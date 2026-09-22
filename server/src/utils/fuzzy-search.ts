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
  'land rover': 'land rover',
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
  mazda3: 'mazda 3',
  mazda6: 'mazda 6',
  model3: 'model 3',
  modely: 'model y',
  models: 'model s',
  modelx: 'model x',
  rav: 'rav4',
  crv: 'cr-v',
  hrv: 'hr-v',
  cx5: 'cx-5',
  cx50: 'cx-50',
  cx3: 'cx-3',
  cx9: 'cx-9',
  cx30: 'cx-30',
  cx70: 'cx-70',
  cx90: 'cx-90',
};

/** Drive / door / config tokens that are not part of the shopper-facing model name. */
const CONFIG_SUFFIX =
  /^(?:\d+-door|\d+dr|\d+wd|awd|fwd|rwd|4x4|4x2|di|automatic|manual|cvt|auto|s\d+|er\d+|sr|pro|platinum|hybrid|phev|ffv|si|type|trd|xse|xle|le|se|ex|lx|base|payload|lt)$/i;

export function normalizeSearchToken(token: string): string {
  const t = token.toLowerCase().trim();
  return ALIASES[t] ?? t;
}

export function normalizeSearchQuery(query: string): string {
  // Alias first (cx5 → cx-5, mazda3 → mazda 3), then re-tokenize so
  // multi-word expansions and human spacing both work.
  return query
    .toLowerCase()
    .trim()
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map(normalizeSearchToken)
    .join(' ')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ');
}

/**
 * Shopper-facing model family, e.g. "3 4-Door 2WD" → "3", "Model 3" → "model 3".
 * Used for matching "mazda 3" to modern EPA model strings and collapsing trims.
 */
export function modelFamilyName(model: string): string {
  const parts = model
    .toLowerCase()
    .trim()
    .split(/[\s_/]+/)
    .filter(Boolean);
  const kept: string[] = [];
  for (const part of parts) {
    if (CONFIG_SUFFIX.test(part)) break;
    kept.push(part);
  }
  return (kept.length ? kept : parts.slice(0, 1)).join(' ');
}

/** True when a typed model phrase refers to this EPA model string. */
export function modelPhraseMatches(model: string, phrase: string): boolean {
  const p = phrase.toLowerCase().trim();
  if (!p) return false;
  const modelLower = model.toLowerCase();
  if (modelLower === p) return true;
  if (modelLower.startsWith(`${p} `)) return true;

  const family = modelFamilyName(model);
  if (family === p) return true;
  if (family.startsWith(`${p} `)) return true;

  // "f 150" / "f150" vs family "f-150" — equality only (avoid cx-5 → cx-50)
  const compact = (s: string) => s.replace(/[\s-]/g, '');
  return compact(family) === compact(p);
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
