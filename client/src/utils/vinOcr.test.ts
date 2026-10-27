import { describe, expect, it } from 'vitest';
import {
  bestOfPasses,
  bestPartialRead,
  correctVin,
  normalizeOcrText,
  VinTally,
  vinsFromText,
  withoutStrays,
  type ReadSymbol,
} from './vinOcr';

/** Boxes as the reader gives them: a character each, left to right. */
function boxes(spans: Array<[string, number, number]>, top = 100, bottom = 150): ReadSymbol[] {
  return spans.map(([text, x0, x1]) => ({ text, x0, x1, y0: top, y1: bottom }));
}

/** A word's characters spaced evenly, `pitch` apart, `width` wide. */
function evenly(
  word: string,
  start = 100,
  pitch = 40,
  width = 32,
): Array<[string, number, number]> {
  return word.split('').map((text, i) => [text, start + i * pitch, start + i * pitch + width]);
}

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
    expect(vinsFromText(text)[0]).toEqual({ vin: VIN, changed: [], raw: VIN });
  });

  it('reads I, O and Q as the 1 and 0 a VIN has in their place', () => {
    expect(vinsFromText('1HGCM82633A0O4352')[0]?.vin).toBe(VIN);
    expect(normalizeOcrText('IHGCM82633AQO4352')).toEqual(['1HGCM82633A004352']);
  });

  it('closes up spaces within a line', () => {
    expect(vinsFromText('1HG CM826 33A 004352')[0]?.vin).toBe(VIN);
  });

  it('takes a VIN with a glyph read twice, without the one that does not belong', () => {
    // Off a plate: its 5 read as S and as 5, two boxes over one place.
    const read = boxes([['S', 117, 152], ...evenly('5YJ3E1EA7KF317283', 138)]);
    expect(vinsFromText('S5YJ3E1EA7KF317283', [read])).toEqual([
      { vin: '5YJ3E1EA7KF317283', changed: [], trimmed: true, raw: 'S5YJ3E1EA7KF317283' },
    ]);
  });

  it('takes nothing from a word a character long without the reader’s boxes', () => {
    expect(vinsFromText('S5YJ3E1EA7KF317283')).toEqual([]);
  });

  it('never cuts a real character off the end of a word read a character long', () => {
    // An E read inside, its box over the M's: cutting the last 2 instead
    // would have checked out by chance (1HGCME82633A00435).
    const spans = evenly('1HGCM82633A004352');
    const read = boxes([...spans.slice(0, 5), ['E', 280, 300], ...spans.slice(5)]);
    expect(vinsFromText('1HGCME82633A004352', [read]).map((r) => r.vin)).toEqual([VIN]);
  });

  it('cuts a mark at an end standing apart from the rest', () => {
    const read = boxes([...evenly(VIN), ['1', 100 + 17 * 40 + 60, 100 + 17 * 40 + 70]]);
    expect(vinsFromText(`${VIN}1`, [read])).toEqual([
      { vin: VIN, changed: [], trimmed: true, raw: `${VIN}1` },
    ]);
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

  it('needs three reads, two of them different misreads, when a character was set', () => {
    const tally = new VinTally();
    const bForEight = { vin: VIN, changed: [5], raw: '1HGCMB2633A004352' };
    const sForFive = { vin: VIN, changed: [15], raw: '1HGCM82633A0043S2' };
    expect(tally.add([bForEight])).toBeNull();
    expect(tally.add([bForEight])).toBeNull();
    expect(tally.add([sForFive])).toEqual({ vin: VIN, changed: [5] });
  });

  it('never takes one misread repeated, however often', () => {
    // A small VIN zoomed, misread the same way each frame (an E read in, a 2
    // lost): with B swapped for 8 it checks out, as 1HGCME82633A00435.
    const tally = new VinTally();
    const reads = vinsFromText('1HGCMEB2633A00435');
    expect(reads[0]?.vin).toBe('1HGCME82633A00435');
    for (let frame = 0; frame < 10; frame++) expect(tally.add(reads)).toBeNull();
  });

  it('takes a VIN with a stray mark cut off once a second misread agrees', () => {
    const tally = new VinTally();
    const trimmed = {
      vin: '5YJ3E1EA7KF317283',
      changed: [],
      trimmed: true,
      raw: 'S5YJ3E1EA7KF317283',
    };
    const swapped = { vin: '5YJ3E1EA7KF317283', changed: [0], raw: 'SYJ3E1EA7KF317283' };
    expect(tally.add([trimmed])).toBeNull();
    expect(tally.add([trimmed])).toBeNull();
    expect(tally.add([swapped])).toEqual({ vin: '5YJ3E1EA7KF317283', changed: [], trimmed: true });
  });

  it('takes a VIN with a glyph read twice, cut by its boxes, read so four times', () => {
    const tally = new VinTally();
    const trimmed = {
      vin: '5YJ3E1EA7KF317283',
      changed: [],
      trimmed: true,
      raw: 'S5YJ3E1EA7KF317283',
    };
    for (let frame = 0; frame < 3; frame++) expect(tally.add([trimmed])).toBeNull();
    expect(tally.add([trimmed])).toEqual({ vin: '5YJ3E1EA7KF317283', changed: [], trimmed: true });
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

  it('is sure of a VIN two different reads agree on, however read', () => {
    const trimmed = { vin: OTHER, changed: [], trimmed: true, raw: 'S5YJ3E1EA7KF317283' };
    const swapped = { vin: OTHER, changed: [0], raw: 'SYJ3E1EA7KF317283' };
    expect(bestOfPasses([[trimmed], [swapped]])).toEqual({
      read: { vin: OTHER, changed: [], trimmed: true },
      sure: true,
    });
  });

  it('is unsure of a VIN only the same misread gives, in every way', () => {
    const swapped = { vin: OTHER, changed: [0], raw: 'SYJ3E1EA7KF317283' };
    expect(bestOfPasses([[swapped], [swapped], [swapped]])?.sure).toBe(false);
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

describe('withoutStrays', () => {
  it('finds nothing to cut from a word spaced evenly', () => {
    expect(withoutStrays(boxes(evenly(VIN)))).toEqual([]);
  });

  it('cuts either of two boxes over one place', () => {
    const read = boxes([['S', 117, 152], ...evenly('5YJ', 138)]);
    expect(withoutStrays(read)).toEqual(['5YJ', 'SYJ']);
  });

  it('cuts a mark at an end far shorter than the rest', () => {
    const read = [...boxes(evenly('ABC')), { text: '1', x0: 220, x1: 230, y0: 130, y1: 140 }];
    expect(withoutStrays(read)).toEqual(['ABC']);
  });

  it('pays no heed to a box spanning several characters', () => {
    // The reader now and then gives one box the width of three.
    const spans = evenly('1FTFW1ET9');
    spans[2] = ['T', 160, 300];
    expect(withoutStrays(boxes(spans))).toEqual([]);
  });
});
