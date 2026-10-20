import { describe, expect, it } from 'vitest';
import { complaintPart, recallDate, recallNotice } from './recalls';

describe('recallNotice', () => {
  it('reads a notice in its three parts', () => {
    expect(
      recallNotice(
        'Issue: \nOn certain vehicles, the brake vacuum pump may fail. \n\nSafety Risk: \nThis could increase the risk of a crash. \n\nCorrective Actions: \nToyota will notify owners by mail.',
      ),
    ).toEqual({
      issue: 'On certain vehicles, the brake vacuum pump may fail.',
      risk: 'This could increase the risk of a crash.',
      remedy: 'Toyota will notify owners by mail.',
    });
  });

  it('reads an older one-paragraph notice, and one with no headings', () => {
    expect(
      recallNotice(
        'On certain vehicles, the lift gate stay may corrode. Correction: Dealers will replace both stays.',
      ),
    ).toEqual({
      issue: 'On certain vehicles, the lift gate stay may corrode.',
      remedy: 'Dealers will replace both stays.',
    });
    expect(recallNotice('Certain labels are wrong.')).toEqual({
      issue: 'Certain labels are wrong.',
    });
  });
});

describe('recall wording', () => {
  it('writes dates and NHTSA’s part names for reading', () => {
    expect(recallDate('2021-11-17')).toMatch(/Nov\.? 17, 2021/);
    expect(complaintPart('ELECTRICAL SYSTEM')).toBe('Electrical system');
  });
});
