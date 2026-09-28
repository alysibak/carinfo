import { describe, expect, it } from 'vitest';
import { readGeneration } from './generations.js';

describe('readGeneration', () => {
  it('reads a chassis code beside the model', () => {
    // "e46 m3" and "mk7 gti" found nothing; "c7 corvette" found a 2026 C8.
    expect(readGeneration('e46 m3')).toMatchObject({
      text: 'm3',
      year: { min: 1999, max: 2006 },
      label: 'E46 BMW 3 Series, 1999–2006',
    });
    expect(readGeneration('c7 corvette')?.year).toEqual({ min: 2014, max: 2019 });
    expect(readGeneration('mk7 gti')?.year).toEqual({ min: 2015, max: 2021 });
    // The same code in two lines goes to the one named: a Mk4 Supra, not a Golf.
    expect(readGeneration('mk4 supra')?.year).toEqual({ min: 1993, max: 1998 });
    expect(readGeneration('mk7.5 golf r')?.text).toBe('golf r');
  });

  it('names the line when a code stands alone', () => {
    expect(readGeneration('e46')).toMatchObject({ text: 'bmw 3 series', words: ['e46'] });
    expect(readGeneration('fk8')).toMatchObject({
      text: 'honda civic type r',
      label: 'FK8 Honda Civic Type R, 2017–2021',
    });
    expect(readGeneration('jl')?.text).toBe('jeep wrangler');
    // A trim beside a code is that line's trim: "wk2 srt" is a Grand Cherokee SRT.
    expect(readGeneration('wk2 srt')?.text).toBe('jeep grand cherokee srt');
  });

  it('leaves codes that name something else alone', () => {
    const namesAVehicle = (words: string) => /^(?:s550|mercedes|g80)$/.test(words);
    // The Mercedes S550 is a model; with "mustang" it is the S550 Mustang.
    expect(readGeneration('s550', namesAVehicle)).toBeNull();
    expect(readGeneration('s550 mustang', namesAVehicle)?.year).toEqual({ min: 2015, max: 2023 });
    // "mercedes e53" is an AMG, not the E53 X5.
    expect(readGeneration('mercedes e53', namesAVehicle)).toBeNull();
    expect(readGeneration('g80', namesAVehicle)).toBeNull();
    // Two letters alone say too little ("na", "c8"), and "mk7" alone is a Golf or a Jetta.
    expect(readGeneration('na')).toBeNull();
    expect(readGeneration('c8')).toBeNull();
    expect(readGeneration('mk7')).toBeNull();
    // E85 alone is ethanol, with a Z4 the first Z4.
    expect(readGeneration('e85')).toBeNull();
    expect(readGeneration('e85 z4')?.year).toEqual({ min: 2003, max: 2008 });
  });

  it('reads a generation by number', () => {
    expect(readGeneration('2nd gen tacoma')).toMatchObject({
      text: 'tacoma',
      year: { min: 2005, max: 2015 },
      label: '2nd-generation Toyota Tacoma, 2005–2015',
    });
    expect(readGeneration('third generation prius')?.year).toEqual({ min: 2010, max: 2015 });
    expect(readGeneration('gen 4 4runner')?.year).toEqual({ min: 2003, max: 2009 });
    // A number the line never had reads as nothing.
    expect(readGeneration('gen 9 tacoma')).toBeNull();
  });

  it('reads nicknames', () => {
    expect(readGeneration('new edge mustang')?.year).toEqual({ min: 1999, max: 2004 });
    expect(readGeneration('bugeye wrx')?.year).toEqual({ min: 2002, max: 2003 });
  });
});
