import { describe, expect, it } from 'vitest';
import { bodyStyleLabel } from './bodyStyleLabel';

describe('bodyStyleLabel', () => {
  it('writes SUV in capitals and capitalizes the rest', () => {
    expect(bodyStyleLabel('suv')).toBe('SUV');
    expect(bodyStyleLabel('minivan')).toBe('Minivan');
    expect(bodyStyleLabel(undefined)).toBe('');
  });
});
