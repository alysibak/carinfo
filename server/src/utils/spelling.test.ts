import { describe, expect, it } from 'vitest';
import { Speller, typoDistance } from './spelling.js';

describe('typoDistance', () => {
  it('counts a swap of neighbouring letters as one edit', () => {
    expect(typoDistance('telsa', 'tesla')).toBe(1);
    expect(typoDistance('frod', 'ford')).toBe(1);
    expect(typoDistance('camery', 'camry')).toBe(1);
    expect(typoDistance('outbak', 'outback')).toBe(1);
    expect(typoDistance('camry', 'camry')).toBe(0);
  });

  it('stops past the limit', () => {
    expect(typoDistance('civic', 'corolla', 2)).toBe(3);
    expect(typoDistance('a', 'abcdef', 2)).toBe(3);
  });
});

describe('Speller', () => {
  const speller = new Speller(
    new Map([
      ['tesla', 40],
      ['camry', 60],
      ['camaro', 30],
      ['ford', 900],
      ['bmw', 800],
      ['kia', 500],
      ['highlander', 50],
      ['truck', 5],
    ]),
  );

  it('respells a word it does not know as the nearest it does', () => {
    expect(speller.correct('telsa')).toBe('tesla');
    expect(speller.correct('camery')).toBe('camry');
    expect(speller.correct('frod')).toBe('ford');
    expect(speller.correct('bmv')).toBe('bmw');
    expect(speller.correct('hihglander')).toBe('highlander');
  });

  it('leaves known words, shoppers’ words, short words and figures alone', () => {
    expect(speller.correct('camry')).toBeNull();
    expect(speller.correct('fast')).toBeNull();
    expect(speller.correct('trunk')).toBeNull();
    expect(speller.correct('ev')).toBeNull();
    expect(speller.correct('3008')).toBeNull();
  });

  it('allows one edit up to five letters, and at three letters no added or dropped one', () => {
    expect(speller.correct('cxmrz')).toBeNull();
    expect(speller.correct('ki')).toBeNull();
    expect(speller.correct('kiaa')).toBe('kia');
    expect(speller.correct('kai')).toBe('kia');
    expect(speller.correct('ka')).toBeNull();
  });

  it('knows a word being typed', () => {
    expect(speller.begins('highl')).toBe(true);
    expect(speller.begins('cam')).toBe(true);
    expect(speller.begins('zz')).toBe(false);
    expect(speller.begins('telsa')).toBe(false);
  });
});
