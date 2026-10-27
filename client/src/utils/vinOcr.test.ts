import { describe, expect, it } from 'vitest';
import {
  bestOfPasses,
  bestPartialRead,
  correctVin,
  normalizeOcrText,
  VinTally,
  vinsFromText,
} from './vinOcr';

// A real, valid VIN (check digit 3 at position 9).
const VIN = '1HGCM82633A004352';

describe('correctVin', () => {
  it('takes a read that checks out as it stands', () => {
    expect(correctVin(VIN)).toEqual({ vin: VIN, changed: [] });
  });

  it('makes a letter a digit where only a digit can stand', () => {
    // The serial's last three are digits: an S there is a 5.
    expect(correctVin('1HGCM82633A0043S2')).toEqual({ vin: VIN, changed: [15] });
  });

  it('swaps one look-alike when that alone makes the check digit match', () => {
    // 8 read as B in the 6th place.
    expect(correctVin('1HGCMB2633A004352')).toEqual({ vin: VIN, changed: [5] });
  });

  it('makes a letter a digit at the check digit, read off a plate', () => {
    expect(correctVin('2T1BURHESJC034461')).toEqual({ vin: '2T1BURHE5JC034461', changed: [8] });
  });

  it('prefers swapping a letter read for a digit to swapping two letters', () => {
    // S for 5 at the start; E for F, 3 for 8 and 7 for T would check out too.
    expect(correctVin('SYJ3E1EA7KF317283')).toEqual({ vin: '5YJ3E1EA7KF317283', changed: [0] });
  });

  it('never both makes a digit and guesses a swap', () => {
    // An S made a 5 and a B swapped for an 8 would check out, but that is
    // two guesses: more likely a misread than the VIN.
    expect(correctVin('1HGCMB2633A0043S2')).toBeNull();
  });

  it('gives up rather than guess when nothing checks out', () => {
    expect(correctVin('1HGCM82633A00435')).toBeNull();
    expect(correctVin('XXXXXXXXXXXXXXXXX')).toBeNull();
  });
});

describe('vinsFromText', () => {
  it('finds the VIN among a sticker’s other words', () => {
    const text = 'MFD BY HONDA\nVIN: 1HGCM82633A004352\nGVWR 1810 KG';
    expect(vinsFromText(text)[0]).toEqual({ vin: VIN, changed: [] });
  });

  it('reads I, O and Q as the 1 and 0 a VIN has in their place', () => {
    expect(vinsFromText('1HGCM82633A0O4352')[0]?.vin).toBe(VIN);
    expect(normalizeOcrText('IHGCM82633AQO4352')).toEqual(['1HGCM82633A004352']);
  });

  it('closes up spaces within a line', () => {
    expect(vinsFromText('1HG CM826 33A 004352')[0]?.vin).toBe(VIN);
  });

  it('takes a VIN run into a stray character only as read', () => {
    // The plate's edge read as an S before it.
    expect(vinsFromText('S5YJ3E1EA7KF317283')).toEqual([
      { vin: '5YJ3E1EA7KF317283', changed: [], trimmed: true },
    ]);
    // A stray G within: no stretch of it checks out without a guess.
    expect(vinsFromText('JTDKN3DUG6A0123456')).toEqual([]);
  });

  it('never cuts a VIN from a line of words run together', () => {
    // A tire line: 88KGRR1814KGP2657, from 1588 KG RR 1814 KG P265, checks out.
    expect(vinsFromText('GAWR FR 1588 KG RR 1814 KG P265/70R17 113T')).toEqual([]);
  });

  it('finds no VIN in a sticker’s other lines', () => {
    // Read from a door sticker: sliced up and swapped, part of the weight
    // line once checked out.
    const text = 'S4FDBYFRDMUT0RC00571\nGVYWR3221KG GAWRFR1588 KGRR1814XC\nAFTFW1ETADFC10344';
    expect(vinsFromText(text)).toEqual([]);
  });
});

describe('bestPartialRead', () => {
  it('shows the longest run of words read so far', () => {
    expect(bestPartialRead('VIN\n1HGCM8263')).toBe('1HGCM8263');
    expect(bestPartialRead('1HG CM826 33A0')).toBe('1HGCM82633A0');
  });

  it('prefers what has digits in it, as a VIN does', () => {
    expect(bestPartialRead('MFD BY TESLA\n5YJ3E1EA')).toBe('5YJ3E1EA');
  });

  it('shows the start of a VIN run into its neighbours', () => {
    expect(bestPartialRead('S5YJ3E1EA7KF317283')).toBe('S5YJ3E1EA7KF31728');
  });
});

describe('VinTally', () => {
  it('takes a VIN read the same way twice', () => {
    const tally = new VinTally();
    expect(tally.add([{ vin: VIN, changed: [] }])).toBeNull();
    expect(tally.add([{ vin: VIN, changed: [] }])).toEqual({ vin: VIN, changed: [] });
  });

  it('needs three reads when a character had to be swapped', () => {
    const tally = new VinTally();
    const fixed = { vin: VIN, changed: [5] };
    expect(tally.add([fixed])).toBeNull();
    expect(tally.add([fixed])).toBeNull();
    expect(tally.add([fixed])).toEqual(fixed);
  });

  it('takes a VIN with a stray character at its end as it does a corrected one', () => {
    const tally = new VinTally();
    const trimmed = { vin: VIN, changed: [], trimmed: true };
    expect(tally.add([trimmed])).toBeNull();
    expect(tally.add([trimmed])).toBeNull();
    expect(tally.add([trimmed])).toEqual({ vin: VIN, changed: [] });
  });

  it('starts over when cleared', () => {
    const tally = new VinTally();
    tally.add([{ vin: VIN, changed: [] }]);
    tally.clear();
    expect(tally.add([{ vin: VIN, changed: [] }])).toBeNull();
  });
});

describe('bestOfPasses', () => {
  const OTHER = '5YJ3E1EA7KF317283';

  it('is sure of a VIN read whole and as it stands', () => {
    expect(bestOfPasses([[], [{ vin: VIN, changed: [] }]])).toEqual({
      read: { vin: VIN, changed: [] },
      sure: true,
    });
  });

  it('is sure of a VIN two ways agree on, however read', () => {
    const trimmed = { vin: OTHER, changed: [], trimmed: true };
    expect(bestOfPasses([[trimmed], [{ vin: OTHER, changed: [0] }]])?.sure).toBe(true);
  });

  it('takes, unsure, a VIN read whole with a character set', () => {
    expect(bestOfPasses([[{ vin: VIN, changed: [5] }]])).toEqual({
      read: { vin: VIN, changed: [5] },
      sure: false,
    });
  });

  it('takes nothing when nothing was read', () => {
    expect(bestOfPasses([[], []])).toBeNull();
  });

  it('prefers a whole read as it stands over one read in more ways with a guess', () => {
    const passes = [
      [{ vin: OTHER, changed: [3] }],
      [{ vin: OTHER, changed: [3] }],
      [{ vin: VIN, changed: [] }],
    ];
    expect(bestOfPasses(passes)?.read.vin).toBe(VIN);
  });
});
