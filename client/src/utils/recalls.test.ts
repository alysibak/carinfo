import { describe, expect, it } from 'vitest';
import {
  complaintPart,
  recallDate,
  recallHeadline,
  recallIssueRest,
  recallNotice,
} from './recalls';

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

describe('recallHeadline', () => {
  it('is the fault in a line, without "On certain vehicles"', () => {
    expect(
      recallHeadline(
        'Issue: On certain vehicles, the high-pressure fuel pump may not have been manufactured properly. As a result, the fuel pump could crack. Safety Risk: A fuel leak can create the risk of a fire.',
      ),
    ).toBe('The high-pressure fuel pump may not have been manufactured properly.');
    // Older notices, one paragraph, some with a full stop after "vehicles".
    expect(
      recallHeadline('On certain vehicles. the fuel tank may contain a defect. Correction: ...'),
    ).toBe('The fuel tank may contain a defect.');
  });

  it('shortens a long sentence at a word', () => {
    const line = recallHeadline(`On certain vehicles, ${'the part '.repeat(30)}could fail.`, 60);
    expect(line!.length).toBeLessThanOrEqual(61);
    expect(line).toMatch(/ (?:the|part)…$/);
  });

  it('gives none for a notice in capitals', () => {
    expect(recallHeadline('ON CERTAIN VEHICLES, THE ABS MODULE COULD FAIL.')).toBeNull();
  });
});

describe('recallIssueRest', () => {
  it('goes on after the first sentence, which the headline gives', () => {
    expect(
      recallIssueRest('On certain vehicles, the pump may fail. As a result, it could leak.'),
    ).toBe('As a result, it could leak.');
    expect(recallIssueRest('On certain vehicles, the pump may fail.')).toBe('');
  });
});
