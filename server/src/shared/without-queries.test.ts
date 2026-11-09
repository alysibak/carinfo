import { describe, expect, it } from 'vitest';
import { withoutQueries } from './without-queries.js';

describe('withoutQueries', () => {
  it('drops queries and fragments, keeping a stack frame’s line and column', () => {
    expect(withoutQueries('/reset-password?token=abc and /x#y')).toBe('/reset-password and /x');
    expect(withoutQueries('at f (https://carinfo.example/assets/a.js?v=2:1:200)')).toBe(
      'at f (https://carinfo.example/assets/a.js:1:200)',
    );
    expect(withoutQueries('https://carinfo.example/home?q=civic')).toBe(
      'https://carinfo.example/home',
    );
    expect(withoutQueries('no urls here')).toBe('no urls here');
  });
});
