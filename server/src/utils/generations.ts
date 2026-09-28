/**
 * Model generations, by chassis code, nickname and number, in North American
 * model years. EPA files years, not generations, so "e46 m3", "c8 corvette",
 * "mk7 gti" and "fk8 type r" found nothing, and "c7 corvette" a 2026 C8.
 */

interface Generation {
  /** The generation's number as the maker counts it ("2nd gen Tacoma"). */
  gen?: number;
  years: [number, number];
  /** Chassis codes and nicknames, as typed ("e46", "mk7", "new edge"). */
  codes?: string[];
  /** What to search when the code stands alone, when it is narrower than the line ("fk8"). */
  insert?: string;
  /** For the results page, when narrower than the line ("Honda Civic Type R"). */
  name?: string;
}

interface Line {
  /** For the results page: "BMW 3 Series". */
  name: string;
  /** The words that name this line in a query. */
  words: RegExp;
  /** Trims that name it only beside a code: "wk2 srt" is a Grand Cherokee SRT. */
  trims?: RegExp;
  /** What to search when a code stands alone ("e46" is a BMW 3 Series). */
  insert: string;
  generations: Generation[];
  /** Two-letter codes are read alone only for lines whose codes are known by themselves (Wrangler's JK). */
  shortCodesAlone?: boolean;
}

const g = (gen: number | undefined, from: number, to: number, ...codes: string[]): Generation => ({
  ...(gen != null ? { gen } : {}),
  years: [from, to],
  ...(codes.length ? { codes } : {}),
});

const LINES: Line[] = [
  {
    name: 'BMW 3 Series',
    words: /\b(?:3[- ]?series|m3|3\d\d(?:[a-z]{1,2})?)\b/,
    insert: 'bmw 3 series',
    generations: [
      g(3, 1992, 1999, 'e36'),
      g(4, 1999, 2006, 'e46'),
      g(5, 2006, 2013, 'e90', 'e91', 'e92', 'e93'),
      g(6, 2012, 2019, 'f30', 'f31', 'f34', 'f80'),
      g(7, 2019, 2027, 'g20', 'g21', 'g80'),
    ],
  },
  {
    name: 'BMW 4 Series',
    words: /\b(?:4[- ]?series|m4|4\d\d(?:[a-z]{1,2})?)\b/,
    insert: 'bmw 4 series',
    generations: [
      g(1, 2014, 2020, 'f32', 'f33', 'f36', 'f82', 'f83'),
      g(2, 2021, 2027, 'g22', 'g23', 'g26', 'g82', 'g83'),
    ],
  },
  {
    name: 'BMW 5 Series',
    words: /\b(?:5[- ]?series|m5|5\d\d(?:[a-z]{1,2})?)\b/,
    insert: 'bmw 5 series',
    generations: [
      g(4, 1997, 2003, 'e39'),
      g(5, 2004, 2010, 'e60', 'e61'),
      g(6, 2011, 2016, 'f10', 'f11', 'f07'),
      g(7, 2017, 2023, 'g30', 'g31', 'f90'),
      g(8, 2024, 2027, 'g60', 'g61', 'g90'),
    ],
  },
  {
    name: 'BMW M2',
    words: /\bm2\b/,
    insert: 'bmw m2',
    generations: [g(1, 2016, 2021, 'f87'), g(2, 2023, 2027, 'g87')],
  },
  {
    name: 'BMW Z4',
    words: /\bz4\b/,
    insert: 'bmw z4',
    generations: [g(1, 2003, 2008, 'e85', 'e86'), g(2, 2009, 2016, 'e89'), g(3, 2019, 2027, 'g29')],
  },
  {
    name: 'BMW X5',
    words: /\bx5\b/,
    insert: 'bmw x5',
    generations: [
      g(1, 2000, 2006, 'e53'),
      g(2, 2007, 2013, 'e70'),
      g(3, 2014, 2018, 'f15', 'f85'),
      g(4, 2019, 2027, 'g05', 'f95'),
    ],
  },
  {
    name: 'BMW X3',
    words: /\bx3\b/,
    insert: 'bmw x3',
    generations: [
      g(1, 2004, 2010, 'e83'),
      g(2, 2011, 2017, 'f25'),
      g(3, 2018, 2024, 'g01', 'f97'),
      g(4, 2025, 2027, 'g45'),
    ],
  },
  {
    name: 'Mercedes-Benz C-Class',
    words: /\b(?:c[- ]?class|c ?\d{2,3}|amg c ?\d{2})\b/,
    insert: 'mercedes c class',
    generations: [
      g(undefined, 1994, 2000, 'w202'),
      g(undefined, 2001, 2007, 'w203'),
      g(undefined, 2008, 2014, 'w204'),
      g(undefined, 2015, 2021, 'w205'),
      g(undefined, 2022, 2027, 'w206'),
    ],
  },
  {
    name: 'Mercedes-Benz E-Class',
    words: /\b(?:e[- ]?class|e ?\d{2,3}|amg e ?\d{2})\b/,
    insert: 'mercedes e class',
    generations: [
      g(undefined, 1996, 2002, 'w210'),
      g(undefined, 2003, 2009, 'w211'),
      g(undefined, 2010, 2016, 'w212'),
      g(undefined, 2017, 2023, 'w213'),
      g(undefined, 2024, 2027, 'w214'),
    ],
  },
  {
    name: 'Mercedes-Benz S-Class',
    words: /\b(?:s[- ]?class|s ?\d{3}|amg s ?\d{2})\b/,
    insert: 'mercedes s class',
    generations: [
      g(undefined, 1992, 1999, 'w140'),
      g(undefined, 2000, 2006, 'w220'),
      g(undefined, 2007, 2013, 'w221'),
      g(undefined, 2014, 2020, 'w222'),
      g(undefined, 2021, 2027, 'w223'),
    ],
  },
  {
    name: 'Porsche 911',
    words: /\b(?:911|carrera|gt3|gt2|targa)\b/,
    trims: /\b(?:turbo|gts|speedster|4s)\b/,
    insert: 'porsche 911',
    generations: [
      g(undefined, 1995, 1998, '993'),
      g(undefined, 1999, 2004, '996'),
      g(undefined, 2005, 2012, '997'),
      g(undefined, 2012, 2019, '991'),
      g(undefined, 2020, 2027, '992'),
    ],
  },
  {
    name: 'Porsche Boxster and Cayman',
    words: /\b(?:boxster|cayman|718)\b/,
    insert: 'porsche boxster',
    generations: [
      g(1, 1997, 2004, '986'),
      g(2, 2005, 2012, '987'),
      g(3, 2013, 2016, '981'),
      g(4, 2017, 2027, '982'),
    ],
  },
  {
    name: 'Chevrolet Corvette',
    words: /\b(?:corvette|vette)\b/,
    trims: /\b(?:z06|zr1|zr1x|z51|grand sport|stingray|e-ray)\b/,
    insert: 'chevrolet corvette',
    generations: [
      g(4, 1984, 1996, 'c4'),
      g(5, 1997, 2004, 'c5'),
      g(6, 2005, 2013, 'c6'),
      g(7, 2014, 2019, 'c7'),
      g(8, 2020, 2027, 'c8'),
    ],
  },
  {
    name: 'Chevrolet Camaro',
    words: /\bcamaro\b/,
    trims: /\b(?:ss|zl1|z28|z\/28)\b/,
    insert: 'chevrolet camaro',
    generations: [g(4, 1993, 2002), g(5, 2010, 2015), g(6, 2016, 2024)],
  },
  {
    name: 'Chevrolet Silverado and GMC Sierra',
    words: /\b(?:silverado|sierra)\b/,
    insert: 'chevrolet silverado',
    generations: [
      g(undefined, 1988, 1998, 'gmt400'),
      g(1, 1999, 2006, 'gmt800'),
      g(2, 2007, 2013, 'gmt900'),
      g(3, 2014, 2018, 'k2xx'),
      g(4, 2019, 2027, 't1xx'),
    ],
  },
  {
    name: 'GM full-size SUVs',
    words: /\b(?:tahoe|suburban|yukon|escalade|avalanche)\b/,
    insert: 'chevrolet tahoe',
    generations: [
      g(undefined, 1992, 1999, 'gmt400'),
      g(undefined, 2000, 2006, 'gmt800'),
      g(undefined, 2007, 2014, 'gmt900'),
      g(undefined, 2015, 2020, 'k2xx'),
      g(undefined, 2021, 2027, 't1xx'),
    ],
  },
  {
    name: 'Ford Mustang',
    words: /\bmustang\b(?! mach)/,
    trims: /\b(?:gt|gt350|gt500|ecoboost|mach 1|bullitt|shelby|cobra)\b/,
    insert: 'ford mustang',
    generations: [
      g(4, 1994, 2004, 'sn95'),
      g(undefined, 1999, 2004, 'new edge'),
      g(5, 2005, 2014, 's197'),
      g(6, 2015, 2023, 's550'),
      g(7, 2024, 2027, 's650'),
    ],
  },
  {
    name: 'Ford F-150',
    words: /\bf[- ]?150\b/,
    insert: 'ford f150',
    generations: [
      g(9, 1992, 1996),
      g(10, 1997, 2004, 'pn96'),
      g(11, 2004, 2008, 'p221'),
      g(12, 2009, 2014, 'p415'),
      g(13, 2015, 2020, 'p552'),
      g(14, 2021, 2027, 'p702'),
    ],
  },
  {
    name: 'Ford Explorer',
    words: /\bexplorer\b(?! sport)/,
    insert: 'ford explorer',
    generations: [
      g(2, 1995, 2001),
      g(3, 2002, 2005),
      g(4, 2006, 2010),
      g(5, 2011, 2019),
      g(6, 2020, 2027),
    ],
  },
  {
    name: 'Ford Focus',
    words: /\bfocus\b/,
    insert: 'ford focus',
    generations: [g(1, 2000, 2007, 'mk1'), g(2, 2008, 2011, 'mk2'), g(3, 2012, 2018, 'mk3')],
  },
  {
    name: 'Ford Bronco',
    words: /\bbronco\b(?! sport)/,
    insert: 'ford bronco',
    generations: [g(5, 1992, 1996), g(6, 2021, 2027)],
  },
  {
    name: 'Toyota Camry',
    words: /\bcamry\b/,
    insert: 'toyota camry',
    generations: [
      g(3, 1992, 1996, 'xv10'),
      g(4, 1997, 2001, 'xv20'),
      g(5, 2002, 2006, 'xv30'),
      g(6, 2007, 2011, 'xv40'),
      g(7, 2012, 2017, 'xv50'),
      g(8, 2018, 2024, 'xv70'),
      g(9, 2025, 2027, 'xv80'),
    ],
  },
  {
    name: 'Toyota Corolla',
    words: /\bcorolla\b(?! cross)/,
    insert: 'toyota corolla',
    generations: [
      g(7, 1993, 1997, 'e100'),
      g(8, 1998, 2002, 'e110'),
      g(9, 2003, 2008, 'e120', 'e130'),
      g(10, 2009, 2013, 'e140'),
      g(11, 2014, 2019, 'e170'),
      g(12, 2020, 2027, 'e210'),
    ],
  },
  {
    name: 'Toyota RAV4',
    words: /\brav ?4\b/,
    insert: 'toyota rav4',
    generations: [
      g(1, 1996, 2000, 'xa10'),
      g(2, 2001, 2005, 'xa20'),
      g(3, 2006, 2012, 'xa30'),
      g(4, 2013, 2018, 'xa40'),
      g(5, 2019, 2025, 'xa50'),
      g(6, 2026, 2027, 'xa60'),
    ],
  },
  {
    name: 'Toyota Tacoma',
    words: /\btacoma\b/,
    insert: 'toyota tacoma',
    generations: [g(1, 1995, 2004), g(2, 2005, 2015), g(3, 2016, 2023), g(4, 2024, 2027)],
  },
  {
    name: 'Toyota Tundra',
    words: /\btundra\b/,
    insert: 'toyota tundra',
    generations: [g(1, 2000, 2006), g(2, 2007, 2021), g(3, 2022, 2027)],
  },
  {
    name: 'Toyota 4Runner',
    words: /\b4 ?runner\b/,
    insert: 'toyota 4runner',
    generations: [g(3, 1996, 2002), g(4, 2003, 2009), g(5, 2010, 2024), g(6, 2025, 2027)],
  },
  {
    name: 'Toyota Highlander',
    words: /\bhighlander\b/,
    insert: 'toyota highlander',
    generations: [g(1, 2001, 2007), g(2, 2008, 2013), g(3, 2014, 2019), g(4, 2020, 2027)],
  },
  {
    name: 'Toyota Prius',
    words: /\bprius\b/,
    insert: 'toyota prius',
    generations: [
      g(1, 2001, 2003),
      g(2, 2004, 2009),
      g(3, 2010, 2015),
      g(4, 2016, 2022),
      g(5, 2023, 2027),
    ],
  },
  {
    name: 'Toyota Sienna',
    words: /\bsienna\b/,
    insert: 'toyota sienna',
    generations: [g(1, 1998, 2003), g(2, 2004, 2010), g(3, 2011, 2020), g(4, 2021, 2027)],
  },
  {
    name: 'Toyota Supra',
    words: /\bsupra\b/,
    insert: 'toyota supra',
    generations: [g(4, 1993, 1998, 'a80', 'mk4', 'mkiv'), g(5, 2020, 2027, 'a90', 'mk5', 'mkv')],
  },
  {
    name: 'Honda Civic',
    words: /\bcivic\b/,
    trims: /\b(?:si|type[- ]r)\b/,
    insert: 'honda civic',
    generations: [
      g(5, 1992, 1995, 'eg'),
      g(6, 1996, 2000, 'ek'),
      g(7, 2001, 2005),
      { years: [2002, 2005], codes: ['ep3'], insert: 'honda civic si', name: 'Honda Civic Si' },
      g(8, 2006, 2011, 'fa5', 'fg2'),
      g(9, 2012, 2015, 'fb6', 'fg4'),
      g(10, 2016, 2021, 'fc', 'fk'),
      {
        years: [2017, 2021],
        codes: ['fk8'],
        insert: 'honda civic type r',
        name: 'Honda Civic Type R',
      },
      {
        years: [2017, 2020],
        codes: ['fc1', 'fc3'],
        insert: 'honda civic si',
        name: 'Honda Civic Si',
      },
      g(11, 2022, 2027, 'fe', 'fl'),
      {
        years: [2023, 2027],
        codes: ['fl5'],
        insert: 'honda civic type r',
        name: 'Honda Civic Type R',
      },
      { years: [2022, 2027], codes: ['fe1'], insert: 'honda civic si', name: 'Honda Civic Si' },
    ],
  },
  {
    name: 'Honda Accord',
    words: /\baccord\b/,
    insert: 'honda accord',
    generations: [
      g(5, 1994, 1997),
      g(6, 1998, 2002),
      g(7, 2003, 2007),
      g(8, 2008, 2012),
      g(9, 2013, 2017),
      g(10, 2018, 2022),
      g(11, 2023, 2027),
    ],
  },
  {
    name: 'Honda CR-V',
    words: /\bcr-?v\b/,
    insert: 'honda cr-v',
    generations: [
      g(1, 1997, 2001),
      g(2, 2002, 2006),
      g(3, 2007, 2011),
      g(4, 2012, 2016),
      g(5, 2017, 2022),
      g(6, 2023, 2027),
    ],
  },
  {
    name: 'Honda S2000',
    words: /\bs2000\b/,
    insert: 'honda s2000',
    generations: [g(undefined, 2000, 2003, 'ap1'), g(undefined, 2004, 2009, 'ap2')],
  },
  {
    name: 'Honda Pilot',
    words: /\bpilot\b/,
    insert: 'honda pilot',
    generations: [g(1, 2003, 2008), g(2, 2009, 2015), g(3, 2016, 2022), g(4, 2023, 2027)],
  },
  {
    name: 'Honda Odyssey',
    words: /\bodyssey\b/,
    insert: 'honda odyssey',
    generations: [g(2, 1999, 2004), g(3, 2005, 2010), g(4, 2011, 2017), g(5, 2018, 2027)],
  },
  {
    name: 'Nissan Z',
    words: /\b(?:350 ?z|370 ?z|nissan z)\b/,
    insert: 'nissan z',
    generations: [
      { years: [2003, 2009], codes: ['z33'], insert: 'nissan 350z' },
      { years: [2009, 2020], codes: ['z34'], insert: 'nissan 370z' },
      { years: [2023, 2027], codes: ['rz34'], insert: 'nissan z' },
    ],
  },
  {
    name: 'Nissan GT-R',
    words: /\bgt-?r\b/,
    insert: 'nissan gt-r',
    generations: [g(undefined, 2009, 2027, 'r35')],
  },
  {
    name: 'Mazda MX-5',
    words: /\b(?:miata|mx-?5)\b/,
    insert: 'mazda mx-5',
    generations: [
      g(1, 1990, 1997, 'na'),
      g(2, 1999, 2005, 'nb'),
      g(3, 2006, 2015, 'nc'),
      g(4, 2016, 2027, 'nd'),
    ],
  },
  {
    name: 'Mazda3',
    words: /\bmazda ?3\b/,
    insert: 'mazda 3',
    generations: [
      g(1, 2004, 2009, 'bk'),
      g(2, 2010, 2013, 'bl'),
      g(3, 2014, 2018, 'bm', 'bn'),
      g(4, 2019, 2027, 'bp'),
    ],
  },
  {
    name: 'Mazda RX-7',
    words: /\brx-?7\b/,
    insert: 'mazda rx-7',
    generations: [g(3, 1993, 1995, 'fd')],
  },
  {
    name: 'Subaru WRX and Impreza',
    words: /\b(?:wrx|sti|impreza)\b/,
    insert: 'subaru wrx',
    generations: [
      g(undefined, 1993, 2001, 'gc'),
      g(undefined, 2002, 2007, 'gd', 'gg'),
      g(undefined, 2002, 2003, 'bugeye'),
      g(undefined, 2004, 2005, 'blobeye'),
      g(undefined, 2006, 2007, 'hawkeye'),
      g(undefined, 2008, 2014, 'gr', 'gv', 'gh'),
      g(undefined, 2015, 2021, 'va'),
      g(undefined, 2022, 2027, 'vb'),
    ],
  },
  {
    name: 'Subaru BRZ and Toyota 86',
    words: /\b(?:brz|gr ?86|fr-?s|86)\b/,
    insert: 'subaru brz',
    generations: [g(1, 2013, 2020, 'zc6', 'zn6'), g(2, 2022, 2027, 'zd8', 'zn8')],
  },
  {
    name: 'Volkswagen Golf',
    words: /\b(?:golf|gti|rabbit)\b/,
    insert: 'volkswagen golf',
    generations: [
      g(3, 1993, 1999, 'mk3', 'mkiii'),
      g(4, 1999, 2006, 'mk4', 'mkiv'),
      g(5, 2006, 2009, 'mk5', 'mkv'),
      g(6, 2010, 2014, 'mk6', 'mkvi'),
      g(7, 2015, 2021, 'mk7.5', 'mk7', 'mkvii'),
      g(8, 2022, 2027, 'mk8', 'mkviii'),
    ],
  },
  {
    name: 'Volkswagen Jetta',
    words: /\b(?:jetta|gli)\b/,
    insert: 'volkswagen jetta',
    generations: [
      g(3, 1993, 1999, 'mk3'),
      g(4, 1999, 2005, 'mk4'),
      g(5, 2005, 2010, 'mk5'),
      g(6, 2011, 2018, 'mk6'),
      g(7, 2019, 2027, 'mk7'),
    ],
  },
  {
    name: 'Jeep Wrangler',
    words: /\bwrangler\b/,
    trims: /\b(?:rubicon|sahara|unlimited|392|4xe)\b/,
    insert: 'jeep wrangler',
    shortCodesAlone: true,
    generations: [
      g(undefined, 1987, 1995, 'yj'),
      g(undefined, 1997, 2006, 'tj'),
      g(undefined, 2007, 2018, 'jk'),
      g(undefined, 2018, 2027, 'jl'),
    ],
  },
  {
    name: 'Jeep Grand Cherokee',
    words: /\bgrand cherokee\b/,
    trims: /\b(?:srt8?|trackhawk|overland|summit|laredo|trailhawk)\b/,
    insert: 'jeep grand cherokee',
    generations: [
      g(1, 1993, 1998, 'zj'),
      g(2, 1999, 2004, 'wj'),
      g(3, 2005, 2010, 'wk'),
      g(4, 2011, 2021, 'wk2'),
      g(5, 2022, 2027, 'wl'),
    ],
  },
  {
    name: 'Jeep Cherokee',
    words: /\b(?<!grand )cherokee\b/,
    insert: 'jeep cherokee',
    generations: [g(undefined, 1984, 2001, 'xj'), g(undefined, 2014, 2023, 'kl')],
  },
  {
    name: 'Ram 1500',
    words: /\bram(?: 1500)?\b/,
    insert: 'ram 1500',
    generations: [
      g(2, 1994, 2001),
      g(3, 2002, 2008),
      g(4, 2009, 2018, 'ds'),
      g(5, 2019, 2027, 'dt'),
    ],
  },
  {
    name: 'Dodge Charger',
    words: /\bcharger\b/,
    insert: 'dodge charger',
    generations: [g(6, 2006, 2010, 'lx'), g(7, 2011, 2023, 'ld'), g(8, 2024, 2027)],
  },
  {
    name: 'Audi A4 and S4',
    words: /\b(?:a4|s4|rs ?4|allroad)\b/,
    insert: 'audi a4',
    generations: [
      g(undefined, 1996, 2001, 'b5'),
      g(undefined, 2002, 2005, 'b6'),
      g(undefined, 2005, 2008, 'b7'),
      g(undefined, 2009, 2016, 'b8.5', 'b8'),
      g(undefined, 2017, 2025, 'b9.5', 'b9'),
    ],
  },
  {
    name: 'Audi A5 and S5',
    words: /\b(?:a5|s5|rs ?5)\b/,
    insert: 'audi a5',
    generations: [g(1, 2008, 2017, 'b8.5', 'b8'), g(2, 2018, 2024, 'b9.5', 'b9')],
  },
  {
    name: 'Audi TT',
    words: /\btts?\b/,
    insert: 'audi tt',
    generations: [g(1, 2000, 2006, '8n'), g(2, 2008, 2015, '8j'), g(3, 2016, 2023, '8s')],
  },
  {
    name: 'Lexus IS',
    words: /\bis ?\d{3}|\bis[- ]?f\b/,
    insert: 'lexus is',
    generations: [g(1, 2001, 2005, 'xe10'), g(2, 2006, 2013, 'xe20'), g(3, 2014, 2027, 'xe30')],
  },
];

const ORDINALS: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10,
  eleventh: 11,
  twelfth: 12,
};

/** "gen 2", "2nd gen", "second generation", "gen2". */
const ORDINAL_PHRASE =
  /\b(?:gen(?:eration)?[- ]?(\d{1,2})|(\d{1,2})(?:st|nd|rd|th)[- ]?gen(?:eration)?|(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)[- ]gen(?:eration)?)\b/;

export interface GenerationRead {
  /** The query with the generation words taken out, and the line named when a code stood alone. */
  text: string;
  /** The words read ("e46", "2nd gen"), which ranking leaves out. */
  words: string[];
  year: { min: number; max: number };
  /** For the results page: "E46 BMW 3 Series, 1999–2006". */
  label: string;
}

/** Codes that mean something else alone: E85 is also ethanol fuel. */
const NEVER_ALONE = new Set(['e85']);

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function describe(line: Line, generation: Generation, said: string): string {
  const [from, to] = generation.years;
  return `${said} ${generation.name ?? line.name}, ${from}–${to}`;
}

/**
 * The generation a query names, if any. A code is read alone only when it is
 * not itself a model's name ("s550" is a Mercedes, "g80" a Genesis) and the
 * rest of the query names no other vehicle ("mercedes e53" is not an X5).
 */
export function readGeneration(
  raw: string,
  namesAVehicle: (words: string) => boolean = () => false,
): GenerationRead | null {
  const text = ` ${raw.toLowerCase().replace(/\s+/g, ' ').trim()} `;

  const ordinal = ORDINAL_PHRASE.exec(text);
  if (ordinal) {
    const n = Number(ordinal[1] ?? ordinal[2]) || ORDINALS[ordinal[3]];
    const rest = text.replace(ordinal[0], ' ');
    for (const line of LINES) {
      if (!line.words.test(rest)) continue;
      const generation = line.generations.find((gen) => gen.gen === n);
      if (!generation) continue;
      const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
      return {
        text: rest.replace(/\s+/g, ' ').trim(),
        words: ordinal[0].split(/[\s-]+/),
        year: { min: generation.years[0], max: generation.years[1] },
        label: describe(line, generation, `${n}${suffix}-generation`),
      };
    }
  }

  // Codes and nicknames: named with the line ("e46 m3", "mk7 gti") or alone ("e46").
  const alone: Array<{ line: Line; generation: Generation; code: string; hit: RegExp }> = [];
  for (const line of LINES) {
    for (const generation of line.generations) {
      for (const code of generation.codes ?? []) {
        const hit = new RegExp(`(?<![\\w.-])${escape(code)}(?![\\w-]|\\.\\d)`);
        if (!hit.test(text)) continue;
        const rest = text.replace(hit, ' ');
        const read = {
          words: code.split(' '),
          year: { min: generation.years[0], max: generation.years[1] },
          label: describe(line, generation, code.toUpperCase()),
        };
        if (line.words.test(rest)) return { text: rest.replace(/\s+/g, ' ').trim(), ...read };
        if (line.trims?.test(rest)) {
          return { text: `${line.insert} ${rest}`.replace(/\s+/g, ' ').trim(), ...read };
        }
        alone.push({ line, generation, code, hit });
      }
    }
  }
  // Alone, a code must mean one generation of one line, and not be a model's name.
  const [only] = alone;
  if (alone.length === 1) {
    const short = only.code.length < 3;
    const rest = text.replace(only.hit, ' ').trim();
    const ok =
      (!short || only.line.shortCodesAlone) &&
      !NEVER_ALONE.has(only.code) &&
      !namesAVehicle(only.code);
    if (ok && (!rest || !namesAVehicle(rest))) {
      const insert = only.generation.insert ?? only.line.insert;
      return {
        text: text.replace(only.hit, ` ${insert} `).replace(/\s+/g, ' ').trim(),
        words: only.code.split(' '),
        year: { min: only.generation.years[0], max: only.generation.years[1] },
        label: describe(only.line, only.generation, only.code.toUpperCase()),
      };
    }
  }
  return null;
}
