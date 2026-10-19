/**
 * Spelling correction for search: a word the site knows nothing of ("telsa",
 * "camery", "outbak", "mercedez") is replaced by the nearest word it does
 * know, from the cars on file and the words shoppers search with. The search
 * then runs on known words, so "telsa model s" finds the Model S instead of
 * nothing, and "camery" the Camry instead of a Land Rover Discovery (two
 * letters from "covery").
 */

/**
 * Edits between two words, a swap of neighbouring letters counting as one
 * ("telsa", "frod", "modle"): optimal string alignment. Stops early above max.
 */
export function typoDistance(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > max) return max + 1;
  // Rows i-2, i-1 and i of the edit table.
  let older = new Array<number>(lb + 1).fill(0);
  let prev = Array.from({ length: lb + 1 }, (_, j) => j);
  let curr = new Array<number>(lb + 1).fill(0);
  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    let rowMin = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d = Math.min(d, older[j - 2] + 1);
      }
      curr[j] = d;
      if (d < rowMin) rowMin = d;
    }
    if (rowMin > max) return max + 1;
    [older, prev, curr] = [prev, curr, older];
  }
  return prev[lb];
}

/**
 * Words shoppers search with that name no car: never corrected, though "fast"
 * is one letter from "fiat" and "for" one from "ford". The query reader knows
 * many more; those are left alone because it reads them.
 */
export const EVERYDAY_WORDS = new Set(
  `a an the and or of for with without to in on at by from into my me i im we our you your
  is are was be been being it its this that these those as than then so very really just
  most more less least best better good great nice top bad worse worst ok okay any some all
  what which who whats where when how why can could should would will want need looking
  cheap cheaper cheapest affordable budget inexpensive expensive pricey price prices priced
  cost costs costing under over below above between around about max min maximum minimum
  less than k grand dollars bucks cad usd new newer newest used old older oldest year years
  yr yrs model models make makes brand brands car cars vehicle vehicles auto autos ride rides
  daily driver drive drives driving family families kid kids child children baby babies dog
  dogs teen teens teenager teenagers student students college first commute commuter
  commuting city town highway road roads trip trips travel long short winter snow ice rain
  weather off offroad mud camping tow towing haul hauling cargo space room roomy spacious
  trunk boot frunk seat seats seater seating passenger passengers row rows third one two three four five six
  seven eight nine ten fast faster fastest quick quicker quickest speed powerful power
  horsepower hp torque efficient efficiency economical economy mileage gas fuel electric
  electrified battery charging charge range plug hybrid hybrids diesel gasoline petrol
  manual stick shift automatic transmission clutch reliable reliability dependable durable
  safe safer safest safety luxury luxurious premium sporty sport sports fun comfortable
  comfort quiet smooth small smaller smallest compact mid midsize size full large larger
  largest big bigger biggest tiny sedan sedans coupe coupes convertible convertibles wagon
  wagons hatch hatchback hatchbacks suv suvs crossover crossovers truck trucks pickup
  pickups van vans minivan minivans muscle supercar supercars hypercar exotic classic
  vintage collector rare popular common mpg km kms mile miles liter litre liters litres
  engine engines motor motors cylinder cylinders turbo turbocharged supercharged awd fwd
  rwd wheel wheels color colour red blue black white silver grey gray green yellow orange
  brown purple gold like similar alternative alternatives versus vs compare compared
  comparison against rival rivals competitor competitors instead buy buying purchase own
  owning ownership insurance maintenance repair repairs resale value depreciation lease
  leasing finance warranty recall recalls problem problems issue issues review reviews
  rating ratings ranked list show find search me please thanks`
    .split(/\s+/)
    .filter(Boolean),
);

export class Speller {
  /** Known words and how many cars carry each: the commoner wins a tie. */
  private readonly words: Map<string, number>;
  private readonly byLength = new Map<number, string[]>();

  constructor(words: Map<string, number>) {
    this.words = words;
    for (const word of words.keys()) {
      const list = this.byLength.get(word.length) ?? [];
      list.push(word);
      this.byLength.set(word.length, list);
    }
  }

  knows(word: string): boolean {
    return this.words.has(word) || EVERYDAY_WORDS.has(word);
  }

  /** Whether the word begins a longer known word: "camr", "highl" are being typed. */
  begins(word: string): boolean {
    if (word.length < 3) return false;
    for (const [length, list] of this.byLength) {
      if (length <= word.length) continue;
      if (list.some((known) => known.startsWith(word))) return true;
    }
    return false;
  }

  /**
   * The known word nearest a word the site does not know, or null. One edit
   * for words of three to five letters (at three, only a changed or swapped
   * letter: "bmv", "kai"), two for longer ones; the nearest wins, then one
   * that begins with the same letter, then the commonest.
   */
  correct(word: string): string | null {
    if (word.length < 3 || /\d/.test(word) || this.knows(word)) return null;
    const max = word.length <= 5 ? 1 : 2;
    let best: { word: string; distance: number; rank: number } | null = null;
    for (let length = word.length - max; length <= word.length + max; length++) {
      if (word.length === 3 && length !== 3) continue;
      for (const known of this.byLength.get(length) ?? []) {
        if (known.length < 3 || /\d/.test(known)) continue;
        const distance = typoDistance(word, known, max);
        if (distance > max) continue;
        const rank = (known[0] === word[0] ? 1e9 : 0) + (this.words.get(known) ?? 0);
        if (!best || distance < best.distance || (distance === best.distance && rank > best.rank)) {
          best = { word: known, distance, rank };
        }
      }
    }
    return best?.word ?? null;
  }
}
